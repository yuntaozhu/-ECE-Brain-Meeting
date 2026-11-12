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
 *   DOUBAO_TTS_LEGACY_AUTH=1 时走旧版 AppId+AccessKey（默认关）
 *
 * 成功：写出 mp3，打印 HTTP/业务结果。
 * 失败：原样打印 code/message / X-Tt-Logid，并给出运维提示。
 *
 * 严禁打印 API Key / Access Key / Token 明文。
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

// 诊断：TTS_SMOKE_FORCE_SPEECH_KEY=1 时忽略 DOUBAO_TTS_API_KEY，强制回退 SPEECH Key
if (process.env.TTS_SMOKE_FORCE_SPEECH_KEY === "1") {
  delete process.env.DOUBAO_TTS_API_KEY;
}

const {
  validateIndependentTtsConfig,
  speechApiKey,
  speechApiKeySource,
  speechAppId,
  ttsVoice,
  ttsResourceId,
  TTS_URL,
  makeTtsError,
  maskSecret,
  buildIndependentTtsAuthHeaders
} = require("../lib/tts/hostTts.cjs");

const SMOKE_TEXT = "你好，这是一次配额验证。";
const OUT_PATH = path.join(os.tmpdir(), "tts_smoke.mp3");

function pickLogId(headers) {
  if (!headers) return "";
  return (
    headers["x-tt-logid"] ||
    headers["X-Tt-Logid"] ||
    headers["x-tt-logId"] ||
    headers["X-Tt-LogId"] ||
    ""
  );
}

function headerPresence(headers) {
  return Object.keys(headers)
    .sort()
    .map((name) => {
      const v = headers[name];
      const isSecret = /api-?key|access-?key|authorization|token/i.test(name);
      return {
        name,
        set: v != null && String(v).length > 0,
        len: String(v || "").length,
        preview: isSecret ? "(redacted)" : String(v || "").slice(0, 64)
      };
    });
}

function humanHint(code, message, httpStatus, meta = {}) {
  const msg = String(message || "");
  const status = Number(httpStatus) || 0;
  if (/text_words_lifetime/i.test(msg)) {
    return "字符额度未生效/耗尽，请在控制台补资源包或等 5-10 分钟配置生效";
  }
  if (/quota exceeded for types:\s*concurrency/i.test(msg)) {
    return "并发超限，请增购并发或降低并发";
  }
  if (
    status === 401 ||
    status === 403 ||
    code === 45000030 ||
    /forbidden|unauthorized|not granted|requested resource/i.test(msg)
  ) {
    const parts = [
      "鉴权/资源未开通或凭证归属不一致：",
      "1) 控制台确认 seed-tts-2.0 已开在「豆包语音」同一应用；",
      "2) 当前 keySource=" + (meta.keySource || "?") + "；",
      meta.keysDiffer
        ? "3) DOUBAO_TTS_API_KEY 与 DOUBAO_SPEECH_API_KEY 不同——请人工确认 TTS Key 是否属于已开通应用，或临时清空 DOUBAO_TTS_API_KEY 回退 SPEECH Key 再测；"
        : "3) TTS/SPEECH Key 一致或仅一侧有值；",
      "4) 勿用方舟 ARK/LLM Key；新版勿混传 AppId（默认已忽略）。"
    ];
    return parts.join(" ");
  }
  if (/speaker not found|45002000|45002001/i.test(msg) || code === 45002000 || code === 45002001) {
    return "音色 ID 不是 2.0 音色或拼写错误";
  }
  return "请查看上方原始 code/message 与 X-Tt-Logid";
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
  const keySource = speechApiKeySource();
  const ttsKey = (process.env.DOUBAO_TTS_API_KEY || "").trim();
  const speechKey = (process.env.DOUBAO_SPEECH_API_KEY || "").trim();
  const keysDiffer = Boolean(ttsKey && speechKey && ttsKey !== speechKey);
  const auth = buildIndependentTtsAuthHeaders({ requestId: randomUUID() });

  console.log("TTS smoke");
  console.log("  url              =", TTS_URL);
  console.log("  mode             = independent");
  console.log("  auth_mode        =", auth.authMode);
  console.log("  resource_id      =", resourceId);
  console.log("  speaker          =", speaker);
  console.log("  key_source       =", keySource);
  console.log("  api_key_masked   =", maskSecret(apiKey));
  console.log("  api_key_len      =", apiKey.length);
  console.log("  keys_tts_vs_speech_differ =", keysDiffer);
  console.log("  app_id_env_set   =", Boolean(speechAppId()));
  console.log("  app_id_used      =", auth.appIdUsed || "(none)");
  console.log("  request_id       =", auth.requestId);
  console.log("  header_names     =", auth.headerNames.join(", "));
  console.log("  headers_detail   =", JSON.stringify(headerPresence(auth.headers)));
  console.log("  text             =", SMOKE_TEXT);
  console.log("  out              =", OUT_PATH);

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

  const req = https.request(
    TTS_URL,
    { method: "POST", headers: auth.headers, timeout: 30000 },
    (res) => {
      const httpStatus = res.statusCode || 0;
      const logId = pickLogId(res.headers);
      console.log("HTTP status        =", httpStatus);
      console.log("X-Tt-Logid         =", logId || "(none)");
      console.log(
        "resp_header_names  =",
        Object.keys(res.headers || {})
          .sort()
          .join(", ")
      );
      const chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => {
        const buf = Buffer.concat(chunks);
        const asText = buf.toString("utf8");

        if (httpStatus !== 200) {
          let code;
          let message = asText.slice(0, 800);
          try {
            const j = JSON.parse(asText);
            // 豆包语音偶发 { header: { code, message } } 嵌套
            const h = j.header && typeof j.header === "object" ? j.header : null;
            code = j.code != null ? j.code : h?.code;
            message = j.message || j.msg || h?.message || h?.msg || message;
          } catch (_) {}
          console.error("ERROR body       =", asText.slice(0, 800));
          console.error("ERROR code       =", code);
          console.error("ERROR message    =", message);
          const err = makeTtsError({ httpStatus, code, message, logid: logId });
          console.error("businessCode     =", err.businessCode || "(none)");
          console.error(
            "HINT             =",
            humanHint(code, message, httpStatus, { keySource, keysDiffer })
          );
          if (err.quotaType === "text_words_lifetime") process.exit(3);
          if (err.businessCode === "TTS_AUTH_FORBIDDEN") process.exit(4);
          process.exit(1);
        }

        const trimmed = asText.trim();
        if (trimmed.startsWith("{") && !trimmed.includes("\n") && /"code"\s*:/.test(trimmed)) {
          try {
            const j = JSON.parse(trimmed);
            if (j.code && j.code !== 0 && j.code !== 20000000) {
              console.error("ERROR code       =", j.code);
              console.error("ERROR message    =", j.message || j.msg);
              console.error(
                "HINT             =",
                humanHint(j.code, j.message || j.msg, httpStatus, { keySource, keysDiffer })
              );
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
          console.error("ERROR code       =", lastErr.code);
          console.error("ERROR message    =", lastErr.message || lastErr.msg);
          console.error(
            "HINT             =",
            humanHint(lastErr.code, lastErr.message || lastErr.msg, httpStatus, {
              keySource,
              keysDiffer
            })
          );
          process.exit(1);
        }

        if (audioParts.length === 0) {
          console.error("无音频数据。原始响应前 500 字:");
          console.error(asText.slice(0, 500));
          process.exit(1);
        }

        const out = Buffer.concat(audioParts);
        fs.writeFileSync(OUT_PATH, out);
        console.log("OK bytes         =", out.length);
        console.log("OK file          =", OUT_PATH);
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
