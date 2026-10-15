/**
 * Host 独立流式 ASR（Phase B）— 不依赖 dialog 下行。
 * wss://openspeech.bytedance.com/api/v3/sauc/bigmodel
 * @see https://www.volcengine.com/docs/6561/1354869
 */
const { randomUUID } = require("crypto");
const WebSocket = require("ws");
const { debugLog } = require("../platform");
const {
  MSG,
  buildFullClientRequest,
  buildAudioOnlyRequest,
  parseServerMessage,
  extractAsrText
} = require("./protocol.cjs");

/** Resource-Id 枚举（勿散落字符串） */
const ASR_RESOURCE = {
  BIGASR_DURATION: "volc.bigasr.sauc.duration",
  BIGASR_CONCURRENT: "volc.bigasr.sauc.concurrent",
  SEEDASR_DURATION: "volc.seedasr.sauc.duration",
  SEEDASR_CONCURRENT: "volc.seedasr.sauc.concurrent"
};

const ASR_URL_DEFAULT = "wss://openspeech.bytedance.com/api/v3/sauc/bigmodel";
/** 当前账号已开通：流式 ASR 大模型 2.0 小时版 */
const ASR_RESOURCE_DEFAULT = ASR_RESOURCE.SEEDASR_DURATION;
/** SAUC 等包超时；hold 停喂真实麦时必须改喂静音，否则会刷 45000081 */
const ASR_PACKET_TIMEOUT_RE = /45000081|Timeout waiting next packet|waiting next packet timeout/i;

function speechApiKey() {
  return (
    process.env.DOUBAO_ASR_API_KEY ||
    process.env.DOUBAO_SPEECH_API_KEY ||
    process.env.DOUBAO_REALTIME_API_KEY ||
    ""
  ).trim();
}

function speechAppId() {
  return (process.env.DOUBAO_SPEECH_APP_ID || process.env.DOUBAO_APP_ID || "").trim();
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

/** 旧版 AppID+AccessToken；默认关，避免与新版 X-Api-Key 混用被拒 */
function useLegacyAsrAuth() {
  return process.env.DOUBAO_ASR_LEGACY_AUTH === "1";
}

function hostAsrMode() {
  // independent（默认）| dialog — USE_DIALOG_ASR=1 强制 dialog
  if (process.env.USE_DIALOG_ASR === "1") return "dialog";
  const m = (process.env.HOST_ASR_MODE || "independent").trim().toLowerCase();
  return m === "dialog" ? "dialog" : "independent";
}

class HostAsrSession {
  /**
   * @param {{ onResult?: (r: { text: string, final: boolean }) => void, onError?: (e: object|string) => void, hotwords?: string[] }} opts
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
    /** 已上抛的最终稿，相同文本不再刷屏 */
    this.lastEmittedFinal = "";
    this.connectId = "";
    this.logId = "";
    this.lastHandshake = null;
    this._reconnectTimer = null;
    this._intentionalClose = false;
    this._packetTimeoutLatched = false;
    this._lastErrorEmitAt = 0;
  }

  isOpen() {
    return this.ws && this.ws.readyState === WebSocket.OPEN && this.ready;
  }

  async connect() {
    const apiKey = speechApiKey();
    if (!apiKey) {
      this.opts.onError?.({ code: "missing_speech_key", message: "missing_speech_key" });
      return false;
    }
    this._intentionalClose = false;
    this.closed = false;
    this.ready = false;
    this.seq = 1;
    this.lastText = "";
    this.lastEmittedFinal = "";
    this._packetTimeoutLatched = false;
    this.connectId = randomUUID();
    const requestId = randomUUID();
    const appId = speechAppId();
    const resourceId = asrResourceId();
    const legacy = useLegacyAsrAuth();
    const url = asrUrl();
    // 新版控制台：仅 X-Api-Key；旧版才带 App-Key + Access-Key
    const headers = {
      "X-Api-Resource-Id": resourceId,
      "X-Api-Request-Id": requestId,
      "X-Api-Connect-Id": this.connectId,
      "X-Api-Sequence": "-1"
    };
    if (legacy) {
      headers["X-Api-Access-Key"] = apiKey;
      if (appId && /^\d{6,}$/.test(appId)) {
        headers["X-Api-App-Key"] = appId;
      }
    } else {
      headers["X-Api-Key"] = apiKey;
    }

    debugLog.info("HostAsr", "开始连接独立 ASR", {
      url,
      resourceId,
      auth: legacy ? "legacy-app+access" : "x-api-key",
      appId: legacy ? appId || "(none)" : "(n/a)",
      connectId: this.connectId,
      requestId
    });

    return new Promise((resolve) => {
      let settled = false;
      const done = (ok, meta = {}) => {
        if (settled) return;
        settled = true;
        this.lastHandshake = { ok, ...meta };
        resolve(ok);
      };

      const ws = new WebSocket(url, { headers });
      this.ws = ws;

      ws.on("unexpected-response", (_req, res) => {
        const chunks = [];
        res.on("data", (c) => chunks.push(Buffer.from(c)));
        res.on("end", () => {
          const body = Buffer.concat(chunks).toString("utf8").slice(0, 400);
          const logId =
            res.headers?.["x-tt-logid"] ||
            res.headers?.["X-Tt-Logid"] ||
            "";
          this.logId = logId;
          debugLog.error("HostAsr", "握手失败（非 101）", {
            status: res.statusCode,
            body,
            logId,
            resourceId,
            url,
            auth: legacy ? "legacy-app+access" : "x-api-key"
          });
          this.opts.onError?.({
            code: `handshake_${res.statusCode}`,
            message: `handshake_${res.statusCode}`,
            status: res.statusCode,
            body,
            logId,
            resourceId
          });
          done(false, { status: res.statusCode, body, logId });
        });
      });

      ws.on("open", () => {
        this.logId =
          ws._req?.res?.headers?.["x-tt-logid"] ||
          ws._req?.res?.headers?.["X-Tt-Logid"] ||
          "";
        debugLog.info("HostAsr", "握手完成 HTTP 101", {
          logId: this.logId || undefined,
          connectId: this.connectId,
          resourceId,
          url
        });
        const hotwords = (this.opts.hotwords || [])
          .filter(Boolean)
          .slice(0, 40)
          .map((w) => ({ word: String(w) }));
        const payload = {
          user: { uid: "dazhi-host-asr" },
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
            // single：按增量出字，减轻 full+definite 同句反复定稿刷屏
            result_type: "single",
            end_window_size: 800,
            force_to_speech_time: 1000
          }
        };
        if (hotwords.length) {
          payload.request.corpus = {
            context: JSON.stringify({ hotwords })
          };
        }
        const frame = buildFullClientRequest(this.seq, payload);
        this.seq += 1;
        ws.send(frame);
        this.ready = true;
        debugLog.info("HostAsr", "已发送 full client request", {
          connectId: this.connectId,
          logId: this.logId || undefined
        });
        // 建连后立刻喂一帧静音，避免等首包空隙触发 45000081
        try {
          const warm = buildAudioOnlyRequest(this.seq, Buffer.alloc(16000 * 0.2 * 2), false);
          this.seq += 1;
          this.audioPackets += 1;
          ws.send(warm);
        } catch (_) {}
        done(true, { status: 101, logId: this.logId });
      });

      ws.on("message", (data) => {
        const buf = Buffer.isBuffer(data) ? data : Buffer.from(data);
        const parsed = parseServerMessage(buf);
        if (parsed.messageType === MSG.ERROR) {
          const msg =
            parsed.payload?.error ||
            parsed.payload?.message ||
            parsed.rawText ||
            `asr_error_${parsed.code}`;
          const msgStr = String(msg);
          const codeNum = Number(parsed.code);
          const isPacketTimeout =
            codeNum === 45000081 || ASR_PACKET_TIMEOUT_RE.test(msgStr);
          if (isPacketTimeout) {
            this._handlePacketTimeout(codeNum || parsed.code, msgStr);
            return;
          }
          debugLog.error("HostAsr", "服务端错误", { code: parsed.code, msg: msgStr.slice(0, 200) });
          this._emitErrorThrottled({
            code: "asr_server",
            message: msgStr,
            asrCode: parsed.code
          });
          return;
        }
        if (parsed.messageType !== MSG.FULL_SERVER) return;
        if (this._packetTimeoutLatched) return;
        const { text, final } = extractAsrText(parsed.payload);
        if (!text) return;
        // 相同文本：partial 与重复 final 一律丢弃（SAUC definite 会每包重推）
        if (text === this.lastText) {
          if (!final || text === this.lastEmittedFinal) return;
        }
        this.lastText = text;
        if (final) {
          if (text === this.lastEmittedFinal) return;
          this.lastEmittedFinal = text;
          this.finals += 1;
        }
        debugLog[final ? "info" : "debug"]("HostAsr", final ? "final" : "partial", {
          text: text.slice(0, 120),
          finals: this.finals,
          audioPackets: this.audioPackets
        });
        this.opts.onResult?.({ text, final });
      });

      ws.on("error", (err) => {
        debugLog.error("HostAsr", "socket error", { message: err?.message || String(err) });
        this.opts.onError?.({ code: "socket_error", message: err?.message || "socket_error" });
        done(false, { error: err?.message });
      });

      ws.on("close", (code, reasonBuf) => {
        this.ready = false;
        const reason = Buffer.isBuffer(reasonBuf) ? reasonBuf.toString("utf8") : String(reasonBuf || "");
        debugLog.warn("HostAsr", "socket closed", {
          code,
          reason,
          intentional: this._intentionalClose,
          finals: this.finals,
          audioPackets: this.audioPackets
        });
        this.ws = null;
        if (!this._intentionalClose && !this.closed) {
          this._scheduleReconnect();
        }
      });

      setTimeout(() => {
        if (!settled) {
          debugLog.warn("HostAsr", "连接超时");
          this.opts.onError?.({ code: "connect_timeout", message: "connect_timeout" });
          done(false, { error: "timeout" });
        }
      }, 8000);
    });
  }

  _emitErrorThrottled(detail, minGapMs = 5000) {
    const now = Date.now();
    if (now - this._lastErrorEmitAt < minGapMs) return;
    this._lastErrorEmitAt = now;
    this.opts.onError?.(detail);
  }

  /** SAUC 等包超时：限流日志 + 关会话并重连（勿每帧 emit） */
  _handlePacketTimeout(code, msg) {
    if (this._packetTimeoutLatched) return;
    this._packetTimeoutLatched = true;
    this.ready = false;
    debugLog.warn("HostAsr", "等包超时 45000081，将重连会话", {
      code,
      msg: String(msg).slice(0, 120),
      audioPackets: this.audioPackets,
      finals: this.finals
    });
    this._emitErrorThrottled({
      code: "asr_packet_timeout",
      message: "HostAsr 等包超时，正在重连",
      asrCode: code || 45000081,
      recoverable: true
    });
    try {
      this.ws?.close();
    } catch (_) {}
    this.ws = null;
    if (!this._intentionalClose && !this.closed) {
      this._scheduleReconnect(800);
    }
  }

  _scheduleReconnect(delayMs = 2000) {
    if (this._reconnectTimer) return;
    this._reconnectTimer = setTimeout(() => {
      this._reconnectTimer = null;
      if (this._intentionalClose || this.closed) return;
      debugLog.info("HostAsr", "尝试重连");
      void this.connect();
    }, delayMs);
  }

  /**
   * @param {string} b64 pcm s16le 16k mono
   */
  appendPcmBase64(b64) {
    if (!b64 || !this.isOpen()) return false;
    let pcm;
    try {
      pcm = Buffer.from(b64, "base64");
    } catch {
      return false;
    }
    if (!pcm.length) return false;
    const frame = buildAudioOnlyRequest(this.seq, pcm, false);
    this.seq += 1;
    this.audioPackets += 1;
    try {
      this.ws.send(frame);
      return true;
    } catch (e) {
      debugLog.warn("HostAsr", "send audio failed", { message: e?.message });
      return false;
    }
  }

  close() {
    this._intentionalClose = true;
    this.closed = true;
    this.ready = false;
    if (this._reconnectTimer) {
      clearTimeout(this._reconnectTimer);
      this._reconnectTimer = null;
    }
    try {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        const frame = buildAudioOnlyRequest(this.seq, Buffer.alloc(0), true);
        this.ws.send(frame);
        this.ws.close();
      }
    } catch (_) {}
    this.ws = null;
    debugLog.info("HostAsr", "已关闭", { finals: this.finals, audioPackets: this.audioPackets });
  }
}

module.exports = {
  HostAsrSession,
  hostAsrMode,
  asrResourceId,
  asrUrl,
  ASR_RESOURCE,
  ASR_RESOURCE_DEFAULT,
  ASR_URL_DEFAULT
};
