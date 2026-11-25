/**
 * 小星独立 TTS（豆包 seed-tts-2.0），协议对齐 desktop tts-smoke，不依赖 Electron。
 */
const https = require("https");
const { randomUUID } = require("crypto");
const fs = require("fs");
const path = require("path");
const { ensureDir, knowledgeRoot } = require("../knowledge/paths.cjs");

const TTS_URL = "https://openspeech.bytedance.com/api/v3/tts/unidirectional";

function speechApiKey() {
  const useDedicated = process.env.DOUBAO_TTS_USE_DEDICATED_KEY === "1";
  const ttsKey = (process.env.DOUBAO_TTS_API_KEY || "").trim();
  const speechKey = (process.env.DOUBAO_SPEECH_API_KEY || "").trim();
  if (useDedicated && ttsKey) return ttsKey;
  return speechKey || ttsKey;
}

function ttsVoice() {
  return (
    process.env.DOUBAO_TTS_SPEAKER ||
    process.env.DOUBAO_TTS_VOICE ||
    "zh_female_vv_uranus_bigtts"
  ).trim();
}

function ttsResourceId() {
  return (process.env.DOUBAO_TTS_RESOURCE_ID || "seed-tts-2.0").trim();
}

function ttsConfigured() {
  return Boolean(speechApiKey());
}

function buildAuthHeaders() {
  const key = speechApiKey();
  const resourceId = ttsResourceId();
  const requestId = randomUUID();
  if (process.env.DOUBAO_TTS_LEGACY_AUTH === "1") {
    const appId = (process.env.DOUBAO_SPEECH_APP_ID || process.env.DOUBAO_TTS_APP_ID || "").trim();
    return {
      headers: {
        "Content-Type": "application/json",
        "X-Api-App-Id": appId,
        "X-Api-Access-Key": key,
        "X-Api-Resource-Id": resourceId,
        "X-Api-Request-Id": requestId
      },
      requestId
    };
  }
  return {
    headers: {
      "Content-Type": "application/json",
      "X-Api-Key": key,
      "X-Api-Resource-Id": resourceId,
      "X-Api-Request-Id": requestId
    },
    requestId
  };
}

function decodeAudioFromNdjson(asText) {
  const audioParts = [];
  let lastErr = null;
  for (const line of String(asText || "").split(/\r?\n/)) {
    const s = line.trim();
    if (!s) continue;
    let evt;
    try {
      evt = JSON.parse(s);
    } catch {
      continue;
    }
    const code = Number(evt.code);
    if ((code === 0 || code === 20000000) && evt.data) {
      audioParts.push(Buffer.from(String(evt.data), "base64"));
    } else if (code && code !== 0 && code !== 20000000) {
      lastErr = evt;
    }
  }
  return { audioParts, lastErr };
}

/**
 * @param {string} text
 * @param {{ outPath?: string, keepBase64?: boolean }} [opts]
 */
function synthesizeToMp3(text, opts = {}) {
  const t = String(text || "").trim();
  if (!t) return Promise.resolve({ ok: false, error: "empty" });
  if (!ttsConfigured()) {
    return Promise.resolve({
      ok: false,
      skipped: true,
      error: "TTS 未配置（缺 DOUBAO_SPEECH_API_KEY）"
    });
  }

  const auth = buildAuthHeaders();
  const body = JSON.stringify({
    user: { uid: "xiaoxing-voice" },
    req_params: {
      text: t.slice(0, 1000),
      speaker: ttsVoice(),
      audio_params: {
        format: "mp3",
        sample_rate: Number(process.env.DOUBAO_TTS_SAMPLE_RATE || 24000)
      }
    }
  });

  return new Promise((resolve) => {
    const req = https.request(
      TTS_URL,
      { method: "POST", headers: auth.headers, timeout: 45000 },
      (res) => {
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => {
          const buf = Buffer.concat(chunks);
          const httpStatus = res.statusCode || 0;
          const asText = buf.toString("utf8");
          if (httpStatus !== 200) {
            resolve({
              ok: false,
              error: `TTS HTTP ${httpStatus}: ${asText.slice(0, 240)}`
            });
            return;
          }
          const { audioParts, lastErr } = decodeAudioFromNdjson(asText);
          if (!audioParts.length) {
            resolve({
              ok: false,
              error: lastErr
                ? `TTS code ${lastErr.code}: ${lastErr.message || lastErr.msg || ""}`
                : `无音频数据: ${asText.slice(0, 200)}`
            });
            return;
          }
          const outBuf = Buffer.concat(audioParts);
          const dir = ensureDir(path.join(knowledgeRoot(), "sessions", "tts"));
          const out = opts.outPath || path.join(dir, `tts_${Date.now()}.mp3`);
          fs.writeFileSync(out, outBuf);
          const result = {
            ok: true,
            bytes: outBuf.length,
            path: out,
            fileName: path.basename(out),
            mime: "audio/mpeg",
            requestId: auth.requestId
          };
          if (opts.keepBase64) {
            result.audioBase64 = outBuf.toString("base64");
          }
          resolve(result);
        });
      }
    );
    req.on("error", (err) => resolve({ ok: false, error: String(err.message || err) }));
    req.on("timeout", () => {
      req.destroy();
      resolve({ ok: false, error: "TTS timeout" });
    });
    req.write(body);
    req.end();
  });
}

module.exports = {
  synthesizeToMp3,
  ttsConfigured,
  ttsVoice,
  ttsResourceId,
  speechApiKey
};
