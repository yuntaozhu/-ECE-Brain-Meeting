/**
 * 本地 Whisper ASR（阶段三 Local-First）。
 *
 * 不捆绑 Electron 原生 addon（ABI 易碎），支持两种外挂后端：
 * 1) WHISPER_SERVER_URL — whisper.cpp HTTP server（推荐，可常驻）
 * 2) WHISPER_BIN + WHISPER_MODEL — whisper-cli / main 可执行文件
 *
 * 接口对齐 HostAsrSession：connect / appendPcmBase64 / close / isOpen
 * 采音侧仍推 16k PCM16 base64；vadGate 分句后离线转写，再 glossaryCorrect。
 */
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawn } = require("child_process");
const { debugLog } = require("../platform");
const { createVadGate } = require("./vadGate.cjs");
const { glossaryCorrect } = require("./glossaryCorrect.cjs");

const SAMPLE_RATE = 16000;

function whisperServerUrl() {
  return (process.env.WHISPER_SERVER_URL || "").trim().replace(/\/$/, "");
}

function whisperBin() {
  return (process.env.WHISPER_BIN || "").trim();
}

function whisperModel() {
  const fromEnv = (process.env.WHISPER_MODEL || "").trim();
  if (fromEnv) return fromEnv;
  return path.join(__dirname, "..", "..", "models", "whisper", "ggml-base.bin");
}

function whisperLang() {
  return (process.env.WHISPER_LANG || "zh").trim() || "zh";
}

function hostAsrModeRaw() {
  return (process.env.HOST_ASR_MODE || "independent").trim().toLowerCase();
}

function isLocalWhisperMode() {
  const m = hostAsrModeRaw();
  if (m === "local" || m === "whisper") return true;
  return (process.env.HOST_ASR_BACKEND || "").trim().toLowerCase() === "whisper";
}

function writeWavPcm16Mono(filePath, pcmInt16, sampleRate = SAMPLE_RATE) {
  const dataSize = pcmInt16.length * 2;
  const buf = Buffer.alloc(44 + dataSize);
  buf.write("RIFF", 0);
  buf.writeUInt32LE(36 + dataSize, 4);
  buf.write("WAVE", 8);
  buf.write("fmt ", 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(sampleRate, 24);
  buf.writeUInt32LE(sampleRate * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write("data", 36);
  buf.writeUInt32LE(dataSize, 40);
  Buffer.from(pcmInt16.buffer, pcmInt16.byteOffset, dataSize).copy(buf, 44);
  fs.writeFileSync(filePath, buf);
}

function pcmB64ToInt16(b64) {
  const raw = Buffer.from(String(b64 || ""), "base64");
  if (raw.length < 2) return new Int16Array(0);
  const even = raw.length - (raw.length % 2);
  return new Int16Array(raw.buffer, raw.byteOffset, even / 2);
}

async function transcribeViaServer(wavPath, serverUrl) {
  const url = `${serverUrl}/inference`;
  const bin = fs.readFileSync(wavPath);
  const boundary = `----ecewhisper${Date.now()}`;
  const lang = whisperLang();
  const chunks = [];
  const push = (s) => chunks.push(Buffer.from(s, "utf8"));
  push(
    `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="audio.wav"\r\nContent-Type: audio/wav\r\n\r\n`
  );
  chunks.push(bin);
  push(
    `\r\n--${boundary}\r\nContent-Disposition: form-data; name="response_format"\r\n\r\njson\r\n`
  );
  push(`--${boundary}\r\nContent-Disposition: form-data; name="language"\r\n\r\n${lang}\r\n`);
  push(`--${boundary}\r\nContent-Disposition: form-data; name="temperature"\r\n\r\n0.0\r\n`);
  push(`--${boundary}--\r\n`);
  const body = Buffer.concat(chunks);
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": `multipart/form-data; boundary=${boundary}` },
    body
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`whisper_server_http_${res.status}:${t.slice(0, 160)}`);
  }
  const j = await res.json().catch(() => ({}));
  return String(j.text || j.transcription || "").trim();
}

function transcribeViaCli(wavPath) {
  const bin = whisperBin();
  const model = whisperModel();
  if (!bin) return Promise.reject(new Error("missing_WHISPER_BIN"));
  if (!fs.existsSync(bin)) return Promise.reject(new Error(`whisper_bin_not_found:${bin}`));
  if (!fs.existsSync(model)) return Promise.reject(new Error(`whisper_model_not_found:${model}`));

  const args = [
    "-m",
    model,
    "-l",
    whisperLang(),
    "-f",
    wavPath,
    "-nt",
    "-np"
  ];
  // whisper.cpp main / whisper-cli 兼容
  return new Promise((resolve, reject) => {
    const child = spawn(bin, args, { windowsHide: true });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => {
      stdout += d.toString("utf8");
    });
    child.stderr.on("data", (d) => {
      stderr += d.toString("utf8");
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code !== 0 && !stdout.trim()) {
        reject(new Error(`whisper_cli_exit_${code}:${stderr.slice(0, 200)}`));
        return;
      }
      // CLI 常把文本打到 stdout；去掉时间戳行
      const text = stdout
        .split(/\r?\n/)
        .map((l) => l.replace(/^\[[^\]]+\]\s*/, "").trim())
        .filter((l) => l && !/^whisper_/i.test(l) && !/^system_info/i.test(l))
        .join("")
        .trim();
      resolve(text || stdout.trim());
    });
  });
}

class LocalWhisperSession {
  /**
   * @param {{ onResult?: Function, onError?: Function, hotwords?: string[], tag?: string }} opts
   */
  constructor(opts = {}) {
    this.opts = opts;
    this.tag = opts.tag || "WhisperLocal";
    this.ready = false;
    this.closed = false;
    this.audioPackets = 0;
    this.finals = 0;
    this.logId = `local_${Date.now().toString(36)}`;
    this.lastHandshake = null;
    this._vad = createVadGate(opts.vad || {});
    this._busy = false;
    this._queue = [];
    this.ws = null; // 占位：与 HostAsrSession.isOpen 检查兼容
  }

  isOpen() {
    return this.ready && !this.closed;
  }

  async connect() {
    this.closed = false;
    const server = whisperServerUrl();
    const bin = whisperBin();
    const model = whisperModel();
    if (!server && !bin) {
      const msg =
        "本地 Whisper 未配置：请设 WHISPER_SERVER_URL 或 WHISPER_BIN(+WHISPER_MODEL)";
      debugLog.error(this.tag, msg);
      this.opts.onError?.({ code: "whisper_not_configured", message: msg });
      this.lastHandshake = { ok: false, error: "not_configured" };
      return false;
    }
    if (!server && bin && !fs.existsSync(model)) {
      const msg = `Whisper 模型不存在: ${model}（可 npm run whisper:model）`;
      debugLog.error(this.tag, msg);
      this.opts.onError?.({ code: "whisper_model_missing", message: msg });
      this.lastHandshake = { ok: false, error: "model_missing" };
      return false;
    }
    this.ready = true;
    this.ws = { readyState: 1 }; // 伪 open，供 listenSession 健康检查
    this.lastHandshake = {
      ok: true,
      backend: server ? "server" : "cli",
      vad: this._vad.backend,
      server: server || null,
      bin: bin || null,
      model: server ? null : model
    };
    debugLog.info(this.tag, "本地 Whisper 就绪", this.lastHandshake);
    return true;
  }

  appendPcmBase64(b64) {
    if (!this.ready || this.closed || !b64) return;
    this.audioPackets += 1;
    const samples = pcmB64ToInt16(b64);
    if (!samples.length) return;
    const hit = this._vad.push(samples);
    if (hit.flush && hit.pcm) {
      this._queue.push({ merged: hit.pcm, why: hit.why || hit.flush });
      if (!this._busy) void this._drainQueue();
    }
  }

  appendSilence() {
    const hit = this._vad.pushSilence(200);
    if (hit.flush && hit.pcm) {
      this._queue.push({ merged: hit.pcm, why: hit.why || hit.flush });
      if (!this._busy) void this._drainQueue();
    }
  }

  async _drainQueue() {
    if (this._busy) return;
    this._busy = true;
    while (this._queue.length && !this.closed) {
      const job = this._queue.shift();
      try {
        const raw = await this._transcribePcm(job.merged);
        const text = glossaryCorrect(raw);
        if (text) {
          this.finals += 1;
          this.opts.onResult?.({ text, final: true });
          debugLog.info(this.tag, "转写完成", {
            why: job.why,
            chars: text.length,
            vad: this._vad.backend,
            preview: text.slice(0, 80)
          });
        }
      } catch (err) {
        debugLog.warn(this.tag, "转写失败", {
          error: String(err?.message || err).slice(0, 200)
        });
        this.opts.onError?.({
          code: "whisper_transcribe_failed",
          message: String(err?.message || err),
          recoverable: true
        });
      }
    }
    this._busy = false;
  }

  async _transcribePcm(pcmInt16) {
    const dir = path.join(os.tmpdir(), "ece-whisper");
    fs.mkdirSync(dir, { recursive: true });
    const wavPath = path.join(dir, `utt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}.wav`);
    writeWavPcm16Mono(wavPath, pcmInt16, SAMPLE_RATE);
    try {
      const server = whisperServerUrl();
      if (server) return await transcribeViaServer(wavPath, server);
      return await transcribeViaCli(wavPath);
    } finally {
      try {
        fs.unlinkSync(wavPath);
      } catch (_) {}
    }
  }

  close() {
    this.closed = true;
    this.ready = false;
    this.ws = null;
    this._vad.reset();
    this._queue = [];
  }
}

function whisperStatus() {
  const server = whisperServerUrl();
  const bin = whisperBin();
  const model = whisperModel();
  return {
    mode: isLocalWhisperMode() ? "local" : hostAsrModeRaw(),
    configured: Boolean(server || bin),
    backend: server ? "server" : bin ? "cli" : "none",
    server: server || null,
    bin: bin || null,
    model: server ? null : model,
    modelExists: server ? null : fs.existsSync(model),
    lang: whisperLang(),
    vadBackend: String(process.env.VAD_BACKEND || "auto")
  };
}

module.exports = {
  LocalWhisperSession,
  isLocalWhisperMode,
  whisperStatus,
  whisperServerUrl,
  whisperBin,
  whisperModel,
  writeWavPcm16Mono
};
