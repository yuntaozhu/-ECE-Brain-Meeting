/**
 * 小星 · 豆包/火山云端流式 ASR（非本地 Whisper）
 * 协议与大智 HostAsr 同源，实现独立于 desktop/lib。
 */
"use strict";

const { randomUUID } = require("crypto");
const WebSocket = require("ws");
const {
  MSG,
  buildFullClientRequest,
  buildAudioOnlyRequest,
  parseServerMessage,
  extractAsrText
} = require("./protocol.cjs");
const { createAsrCircuit } = require("./circuit.cjs");

const ASR_URL_DEFAULT = "wss://openspeech.bytedance.com/api/v3/sauc/bigmodel";
const ASR_RESOURCE_DEFAULT = "volc.seedasr.sauc.duration";
const SILENCE_200MS = Buffer.alloc(16000 * 0.2 * 2);
const PACKET_TIMEOUT_RE = /45000081|Timeout waiting next packet/i;

function speechApiKey() {
  return (
    process.env.DOUBAO_ASR_API_KEY ||
    process.env.DOUBAO_SPEECH_API_KEY ||
    process.env.DOUBAO_REALTIME_API_KEY ||
    ""
  ).trim();
}

function asrConfigured() {
  return Boolean(speechApiKey());
}

function asrResourceId() {
  return (process.env.DOUBAO_ASR_RESOURCE_ID || ASR_RESOURCE_DEFAULT).trim();
}

function asrUrl() {
  return (
    process.env.DOUBAO_ASR_ENDPOINT ||
    process.env.DOUBAO_ASR_WS_URL ||
    ASR_URL_DEFAULT
  ).trim();
}

class CloudAsrSession {
  /**
   * @param {{ onResult?: Function, onError?: Function, hotwords?: string[], uid?: string }} opts
   */
  constructor(opts = {}) {
    this.opts = opts;
    this.ws = null;
    this.seq = 1;
    this.ready = false;
    this.closed = false;
    this.audioPackets = 0;
    this.finals = 0;
    this.lastText = "";
    this.lastEmittedFinal = "";
    this._intentionalClose = false;
    this._reconnectTimer = null;
    this._packetTimeoutLatched = false;
    this._circuit = createAsrCircuit();
  }

  circuitSnapshot() {
    return this._circuit.snapshot();
  }

  /** 统一网络错误 → 熔断/聚合后再抛给上层 */
  _emitFailure(err) {
    const decision = this._circuit.onFailure(err);
    if (decision.emit) {
      this.opts.onError?.(decision.payload);
    }
    return decision;
  }

  isOpen() {
    return this.ws && this.ws.readyState === WebSocket.OPEN && this.ready;
  }

  async connect() {
    const apiKey = speechApiKey();
    if (!apiKey) {
      this.opts.onError?.({ code: "missing_speech_key", message: "缺 DOUBAO_SPEECH_API_KEY / DOUBAO_ASR_API_KEY" });
      return false;
    }
    this._intentionalClose = false;
    this.closed = false;
    this.ready = false;
    this.seq = 1;
    this.lastText = "";
    this.lastEmittedFinal = "";
    this._packetTimeoutLatched = false;
    const connectId = randomUUID();
    const requestId = randomUUID();
    const resourceId = asrResourceId();
    const url = asrUrl();
    const headers = {
      "X-Api-Key": apiKey,
      "X-Api-Resource-Id": resourceId,
      "X-Api-Request-Id": requestId,
      "X-Api-Connect-Id": connectId,
      "X-Api-Sequence": "-1"
    };

    return new Promise((resolve) => {
      let settled = false;
      const done = (ok) => {
        if (settled) return;
        settled = true;
        resolve(ok);
      };

      const ws = new WebSocket(url, { headers });
      this.ws = ws;

      ws.on("unexpected-response", (_req, res) => {
        const chunks = [];
        res.on("data", (c) => chunks.push(Buffer.from(c)));
        res.on("end", () => {
          const body = Buffer.concat(chunks).toString("utf8").slice(0, 300);
          const decision = this._emitFailure({
            code: `handshake_${res.statusCode}`,
            message: body || `handshake_${res.statusCode}`
          });
          done(false);
          if (!this._intentionalClose && !this.closed) {
            this._scheduleReconnect(decision.reconnectDelayMs);
          }
        });
      });

      ws.on("open", () => {
        const recovered = this._circuit.onSuccess();
        if (recovered.recovered) {
          this.opts.onError?.({
            code: "circuit_closed",
            message: "ASR 连接恢复，熔断解除",
            class: "recovered"
          });
        }
        const hotwords = (this.opts.hotwords || [])
          .filter(Boolean)
          .slice(0, 40)
          .map((w) => ({ word: String(w) }));
        const payload = {
          user: { uid: this.opts.uid || "xiaoxing-others-asr" },
          audio: {
            format: "pcm",
            codec: "raw",
            rate: 16000,
            bits: 16,
            channel: 1,
            language: "zh-CN"
          },
          request: {
            model_name: "bigmodel",
            enable_itn: true,
            enable_punc: true,
            enable_ddc: true,
            show_utterances: true,
            result_type: "single",
            end_window_size: 800,
            force_to_speech_time: 1000
          }
        };
        if (hotwords.length) {
          payload.request.corpus = { context: JSON.stringify({ hotwords }) };
        }
        ws.send(buildFullClientRequest(this.seq, payload));
        this.seq += 1;
        this.ready = true;
        try {
          ws.send(buildAudioOnlyRequest(this.seq, SILENCE_200MS, false));
          this.seq += 1;
          this.audioPackets += 1;
        } catch (_) {}
        done(true);
      });

      ws.on("message", (data) => {
        const buf = Buffer.isBuffer(data) ? data : Buffer.from(data);
        const parsed = parseServerMessage(buf);
        if (parsed.messageType === MSG.ERROR) {
          const msg = String(
            parsed.payload?.error || parsed.payload?.message || parsed.rawText || parsed.code
          );
          if (PACKET_TIMEOUT_RE.test(msg) || parsed.code === 45000081) {
            if (this._packetTimeoutLatched) return;
            this._packetTimeoutLatched = true;
            this.ready = false;
            try {
              this.ws?.close();
            } catch (_) {}
            this.ws = null;
            if (!this._intentionalClose) this._scheduleReconnect(800);
            return;
          }
          this.opts.onError?.({ code: "asr_server", message: msg.slice(0, 200), asrCode: parsed.code });
          return;
        }
        if (parsed.messageType !== MSG.FULL_SERVER) return;
        const { text, final } = extractAsrText(parsed.payload);
        if (!text) return;
        if (text === this.lastText && (!final || text === this.lastEmittedFinal)) return;
        this.lastText = text;
        if (final) {
          if (text === this.lastEmittedFinal) return;
          this.lastEmittedFinal = text;
          this.finals += 1;
        }
        this.opts.onResult?.({ text, final });
      });

      ws.on("error", (err) => {
        const decision = this._emitFailure({
          code: "socket_error",
          message: err?.message || "socket_error"
        });
        done(false);
        if (!this._intentionalClose && !this.closed) {
          this._scheduleReconnect(decision.reconnectDelayMs);
        }
      });

      ws.on("close", () => {
        this.ready = false;
        this.ws = null;
        if (!this._intentionalClose && !this.closed) {
          const delay = this._circuit.isOpen()
            ? this._circuit.remainingMs() || 30000
            : 2000;
          this._scheduleReconnect(delay);
        }
      });

      setTimeout(() => {
        if (!settled) {
          const decision = this._emitFailure({
            code: "connect_timeout",
            message: "connect_timeout"
          });
          try {
            ws.close();
          } catch (_) {}
          done(false);
          if (!this._intentionalClose && !this.closed) {
            this._scheduleReconnect(decision.reconnectDelayMs);
          }
        }
      }, 8000);
    });
  }

  _scheduleReconnect(delayMs = 2000) {
    if (this._reconnectTimer) return;
    let wait = Math.max(500, Number(delayMs) || 2000);
    if (this._circuit.isOpen()) {
      wait = Math.max(wait, this._circuit.remainingMs() || wait);
    }
    this._reconnectTimer = setTimeout(() => {
      this._reconnectTimer = null;
      if (this._intentionalClose || this.closed) return;
      if (this._circuit.isOpen()) {
        // 仍在熔断窗：再等到点，不空转 connect
        this._scheduleReconnect(this._circuit.remainingMs() || 5000);
        return;
      }
      void this.connect();
    }, wait);
  }

  appendPcmBase64(b64) {
    if (!b64 || !this.isOpen()) return false;
    let pcm;
    try {
      pcm = Buffer.from(b64, "base64");
    } catch {
      return false;
    }
    if (!pcm.length) return false;
    try {
      this.ws.send(buildAudioOnlyRequest(this.seq, pcm, false));
      this.seq += 1;
      this.audioPackets += 1;
      return true;
    } catch (_) {
      return false;
    }
  }

  close() {
    this._intentionalClose = true;
    this.closed = true;
    this.ready = false;
    this._circuit.reset();
    if (this._reconnectTimer) {
      clearTimeout(this._reconnectTimer);
      this._reconnectTimer = null;
    }
    try {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(buildAudioOnlyRequest(this.seq, Buffer.alloc(0), true));
        this.ws.close();
      }
    } catch (_) {}
    this.ws = null;
  }
}

module.exports = {
  CloudAsrSession,
  asrConfigured,
  speechApiKey,
  asrResourceId,
  asrUrl,
  ASR_RESOURCE_DEFAULT,
  ASR_URL_DEFAULT,
  createAsrCircuit: require("./circuit.cjs").createAsrCircuit
};
