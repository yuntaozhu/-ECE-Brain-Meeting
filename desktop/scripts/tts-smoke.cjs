/**
 * 独立 TTS 最小合成验证（seed-tts-2.0 / independent）。
 *
 * 用法（在 desktop/ 下）:
 *   npm run tts:smoke
 *   node scripts/tts-smoke.cjs
 *
 * 读取仓库根 .env / desktop/.env：
 *   DOUBAO_TTS_API_KEY 或 DOUBAO_SPEECH_API_KEY
 *   DOUBAO_TTS_SPEAKER 或 DOUBAO_TTS_VOICE
 *   DOUBAO_TTS_RESOURCE_ID（默认 seed-tts-2.0）
 *
 * 成功：写出 mp3，打印 HTTP/业务结果。
 * 失败：原样打印 code/message，并给出运维提示。
 *
 * HOST_TTS_MODE=independent：独立 TTS，消费 seed-tts-2.0 字符额度，不与 Dialog 共享。
 * text_words_lifetime：字符总量额度，不是并发；换 Key 不能重置，须补资源包/后付费（生效约 5–10 分钟）。
 */
const fs = require("fs");
const path = require("path");
const os = require("os");
const https = require("https");
const { randomUUID } = require("crypto");

const DESKTOP_ROOT = path.join(__dirname, "..");
const REPO_ROOT = path.join(DESKTOP_ROOT, "..");

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const text = fs.readFileSync(filePath, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const s = line.trim();
    if (!s || s.startsWith("#") || !s.includes("=")) continue;
    const i = s.indexOf("=");
    const k = s.slice(0, i).trim();
    let v = s.slice(i + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    if (process.env[k] == null || process.env[k] === "") process.env[k] = v;
  }
}

loadEnvFile(path.join(REPO_ROOT, ".env"));
loadEnvFile(path.join(DESKTOP_ROOT, ".env"));

try {
  require("dotenv").config({ path: path.join(REPO_ROOT, ".env") });
  require("dotenv").config({ path: path.join(DESKTOP_ROOT, ".env") });
} catch (_) {}

const {
  validateIndependentTtsConfig,
  speechApiKey,
  ttsVoice,
  ttsResourceId,
  TTS_URL,
  makeTtsError,
  maskSecret
} = require("../lib/tts/hostTts.cjs");

const SMOKE_TEXT = "你好，这是一次配额验证。";
const OUT_PATH = path.join(os.tmpdir(), "tts_smoke.mp3");

function humanHint(code, message) {
  const msg = String(message || "");
  if (/text_words_lifetime/i.test(msg)) {
    return "字符额度未生效/耗尽，请在控制台补资源包或等 5-10 分钟配置生效";
  }
  if (/quota exceeded for types:\s*concurrency/i.test(msg)) {
    return "并发超限，请增购并发或降低并发";
  }
  if (/speaker not found|45002000|45002001/i.test(msg) || code === 45002000 || code === 45002001) {
    return "音色 ID 不是 2.0 音色或拼写错误";
  }
  return "请查看上方原始 code/message";
}

function main() {
  process.env.HOST_TTS_MODE = process.env.HOST_TTS_MODE || "independent";

  const cfg = validateIndependentTtsConfig();
  if (!cfg.ok) {
    console.error("配置校验失败:", cfg.error);
    process.exit(2);
  }

  const apiKey = speechApiKey();
  const speaker = ttsVoice();
  const resourceId = ttsResourceId();
  const requestId = randomUUID();

  console.log("TTS smoke");
  console.log("  url         =", TTS_URL);
  console.log("  mode        = independent");
  console.log("  resource_id =", resourceId);
  console.log("  speaker     =", speaker);
  console.log("  api_key     =", maskSecret(apiKey));
  console.log("  request_id  =", requestId);
  console.log("  text        =", SMOKE_TEXT);
  console.log("  out         =", OUT_PATH);

  const body = JSON.stringify({
    user: { uid: "dazhi-tts-smoke" },
    req_params: {
      text: SMOKE_TEXT,
      speaker,
      audio_params: {
        format: "mp3",
        sample_rate: 24000
      }
    }
  });

  const headers = {
    "Content-Type": "application/json",
    "X-Api-Key": apiKey,
    "X-Api-Resource-Id": resourceId,
    "X-Api-Request-Id": requestId,
    "X-Control-Require-Usage-Tokens-Return": "*"
  };

  const req = https.request(
    TTS_URL,
    { method: "POST", headers, timeout: 30000 },
    (res) => {
      const httpStatus = res.statusCode || 0;
      console.log("HTTP status =", httpStatus);
      const chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => {
        const buf = Buffer.concat(chunks);
        const asText = buf.toString("utf8");

        // 非 200：尝试 JSON 错误
        if (httpStatus !== 200) {
          let code;
          let message = asText.slice(0, 800);
          try {
            const j = JSON.parse(asText);
            code = j.code;
            message = j.message || j.msg || message;
          } catch (_) {}
          console.error("ERROR code   =", code);
          console.error("ERROR message=", message);
          console.error("HINT         =", humanHint(code, message));
          const err = makeTtsError({ httpStatus, code, message });
          if (err.quotaType === "text_words_lifetime") process.exit(3);
          process.exit(1);
        }

        // 流式 JSONL：聚合 data 为 mp3；若整包是错误 JSON 则打印
        const trimmed = asText.trim();
        if (trimmed.startsWith("{") && !trimmed.includes("\n") && /"code"\s*:/.test(trimmed)) {
          try {
            const j = JSON.parse(trimmed);
            if (j.code && j.code !== 0 && j.code !== 20000000) {
              console.error("ERROR code   =", j.code);
              console.error("ERROR message=", j.message || j.msg);
              console.error("HINT         =", humanHint(j.code, j.message || j.msg));
              process.exit(1);
            }
          } catch (_) {}
        }

        const audioParts = [];
        let lastErr = null;
        for (const line of asText.split(/\r?\n/)) {
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

        if (lastErr && audioParts.length === 0) {
          console.error("ERROR code   =", lastErr.code);
          console.error("ERROR message=", lastErr.message || lastErr.msg);
          console.error("HINT         =", humanHint(lastErr.code, lastErr.message || lastErr.msg));
          process.exit(1);
        }

        if (audioParts.length === 0) {
          console.error("无音频数据。原始响应前 500 字:");
          console.error(asText.slice(0, 500));
          process.exit(1);
        }

        const out = Buffer.concat(audioParts);
        fs.writeFileSync(OUT_PATH, out);
        console.log("OK bytes     =", out.length);
        console.log("OK file      =", OUT_PATH);
        process.exit(0);
      });
    }
  );

  req.on("timeout", () => {
    console.error("请求超时");
    req.destroy();
    process.exit(1);
  });
  req.on("error", (err) => {
    console.error("网络错误:", err.message);
    process.exit(1);
  });
  req.write(body);
  req.end();
}

main();
