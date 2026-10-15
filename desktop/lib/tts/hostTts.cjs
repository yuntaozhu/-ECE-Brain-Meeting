/**
 * Host 独立 TTS（P2）— 不走 dialog 下行。
 * HTTP Chunked：https://openspeech.bytedance.com/api/v3/tts/unidirectional
 * Resource：seed-tts-2.0（可用 DOUBAO_TTS_RESOURCE_ID 覆盖）
 */
const https = require("https");
const { randomUUID } = require("crypto");
const { debugLog } = require("../platform");

const TTS_URL = "https://openspeech.bytedance.com/api/v3/tts/unidirectional";
const TTS_RESOURCE_DEFAULT = "seed-tts-2.0";
/** seed-tts-2.0 常用音色；jupiter 多为 dialog/O2.0 */
const TTS_VOICE_DEFAULT = "zh_female_vv_uranus_bigtts";

function speechApiKey() {
  return (process.env.DOUBAO_SPEECH_API_KEY || process.env.DOUBAO_REALTIME_API_KEY || "").trim();
}

function speechAppId() {
  return (process.env.DOUBAO_SPEECH_APP_ID || process.env.DOUBAO_APP_ID || "").trim();
}

function ttsResourceId() {
  return (process.env.DOUBAO_TTS_RESOURCE_ID || TTS_RESOURCE_DEFAULT).trim();
}

function ttsVoice() {
  const raw = (
    process.env.DOUBAO_TTS_VOICE ||
    process.env.DOUBAO_DUPLEX_VOICE ||
    TTS_VOICE_DEFAULT
  ).trim();
  // dialog 的 jupiter 音色在 seed-tts-2.0 上常不可用，自动映射到 uranus
  if (/jupiter_bigtts$/i.test(raw)) {
    return raw.replace(/jupiter_bigtts$/i, "uranus_bigtts");
  }
  return raw || TTS_VOICE_DEFAULT;
}

function ttsSampleRate() {
  const n = Number(process.env.DOUBAO_TTS_SAMPLE_RATE || 24000);
  return Number.isFinite(n) && n > 0 ? n : 24000;
}

/**
 * @param {string} text
 * @param {{ onChunk?: (b64: string) => void, signal?: AbortSignal }} [opts]
 * @returns {Promise<{ ok: boolean, chunks: number, bytes: number, error?: string, logId?: string, sampleRate: number }>}
 */
function synthesizeHostTts(text, opts = {}) {
  const t = String(text || "").trim();
  const sampleRate = ttsSampleRate();
  if (!t) return Promise.resolve({ ok: false, chunks: 0, bytes: 0, error: "empty", sampleRate });

  const apiKey = speechApiKey();
  if (!apiKey) {
    return Promise.resolve({ ok: false, chunks: 0, bytes: 0, error: "missing_speech_key", sampleRate });
  }

  const appId = speechAppId();
  const resourceId = ttsResourceId();
  const voice = ttsVoice();
  const requestId = randomUUID();

  // 新版控制台：X-Api-Key；App-ID 仅作兜底兼容，不再用 Access-Key 主鉴权
  const headers = {
    "Content-Type": "application/json",
    "X-Api-Key": apiKey,
    "X-Api-Resource-Id": resourceId,
    "X-Api-Request-Id": requestId
  };
  if (appId && /^\d{6,}$/.test(appId)) {
    headers["X-Api-App-Id"] = appId;
    headers["X-Api-App-ID"] = appId;
  }

  const body = JSON.stringify({
    user: { uid: "dazhi-host" },
    req_params: {
      text: t,
      speaker: voice,
      audio_params: {
        format: "pcm",
        sample_rate: sampleRate
      }
    }
  });

  debugLog.info("HostTts", "开始独立合成", {
    chars: t.length,
    voice,
    resourceId,
    sampleRate,
    requestId,
    appId: appId || "(none)"
  });

  return new Promise((resolve) => {
    let settled = false;
    let chunks = 0;
    let bytes = 0;
    let logId = "";
    let buf = "";
    let lastErr = "";

    const finish = (ok, error) => {
      if (settled) return;
      settled = true;
      debugLog.info("HostTts", ok ? "合成完成" : "合成失败", {
        ok,
        chunks,
        bytes,
        error: error || lastErr || undefined,
        logId: logId || undefined
      });
      resolve({ ok, chunks, bytes, error: error || lastErr || undefined, logId, sampleRate });
    };

    const req = https.request(
      TTS_URL,
      { method: "POST", headers, timeout: 25000 },
      (res) => {
        logId = String(res.headers?.["x-tt-logid"] || res.headers?.["X-Tt-Logid"] || "");
        if (res.statusCode && res.statusCode >= 400) {
          const parts = [];
          res.on("data", (c) => parts.push(c));
          res.on("end", () => {
            const bodyText = Buffer.concat(parts).toString("utf8").slice(0, 300);
            finish(false, `http_${res.statusCode}:${bodyText}`);
          });
          return;
        }

        res.setEncoding("utf8");
        res.on("data", (chunk) => {
          buf += chunk;
          let nl;
          while ((nl = buf.indexOf("\n")) >= 0) {
            const line = buf.slice(0, nl).trim();
            buf = buf.slice(nl + 1);
            if (!line) continue;
            let evt;
            try {
              evt = JSON.parse(line);
            } catch {
              continue;
            }
            const code = Number(evt.code);
            // 成功音频块
            if ((code === 0 || code === 20000000) && evt.data) {
              const b64 = String(evt.data);
              chunks += 1;
              bytes += Math.floor((b64.length * 3) / 4);
              if (typeof opts.onChunk === "function") opts.onChunk(b64);
            } else if (code && code !== 0 && code !== 20000000) {
              lastErr = `${code}:${evt.message || evt.msg || "tts_error"}`;
            }
          }
        });
        res.on("end", () => {
          const tail = buf.trim();
          if (tail) {
            try {
              const evt = JSON.parse(tail);
              const code = Number(evt.code);
              if ((code === 0 || code === 20000000) && evt.data) {
                const b64 = String(evt.data);
                chunks += 1;
                bytes += Math.floor((b64.length * 3) / 4);
                if (typeof opts.onChunk === "function") opts.onChunk(b64);
              } else if (code && code !== 0 && code !== 20000000) {
                lastErr = `${code}:${evt.message || evt.msg || "tts_error"}`;
              }
            } catch (_) {}
          }
          if (chunks > 0) finish(true);
          else finish(false, lastErr || "timeout-no-audio");
        });
        res.on("error", (err) => finish(false, err.message || "res_error"));
      }
    );

    req.on("timeout", () => {
      req.destroy();
      finish(false, "http_timeout");
    });
    req.on("error", (err) => finish(false, err.message || "req_error"));

    if (opts.signal) {
      const onAbort = () => {
        req.destroy();
        finish(false, "aborted");
      };
      if (opts.signal.aborted) onAbort();
      else opts.signal.addEventListener("abort", onAbort, { once: true });
    }

    req.write(body);
    req.end();
  });
}

function hostTtsMode() {
  // independent（默认）| dialog — USE_DIALOG_TTS=1 时强制 dialog
  if (process.env.USE_DIALOG_TTS === "1") return "dialog";
  const m = (process.env.HOST_TTS_MODE || "independent").trim().toLowerCase();
  return m === "dialog" ? "dialog" : "independent";
}

module.exports = {
  synthesizeHostTts,
  hostTtsMode,
  ttsVoice,
  ttsResourceId,
  ttsSampleRate
};
