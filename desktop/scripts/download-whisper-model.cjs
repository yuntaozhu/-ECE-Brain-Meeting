/**
 * 下载 whisper.cpp ggml-base 模型到 desktop/models/whisper/
 *
 *   npm run whisper:model
 *
 * 默认：ggml-base.bin（多语，含中文；约 140MB）
 * 覆盖：WHISPER_MODEL_URL / WHISPER_MODEL_NAME
 */
const fs = require("fs");
const path = require("path");
const https = require("https");
const http = require("http");

const OUT_DIR = path.join(__dirname, "..", "models", "whisper");
const NAME = process.env.WHISPER_MODEL_NAME || "ggml-base.bin";
const URL =
  process.env.WHISPER_MODEL_URL ||
  `https://huggingface.co/ggerganov/whisper.cpp/resolve/main/${NAME}`;

function download(url, dest, redirects = 0) {
  return new Promise((resolve, reject) => {
    if (redirects > 5) {
      reject(new Error("too many redirects"));
      return;
    }
    const lib = url.startsWith("https") ? https : http;
    const req = lib.get(url, { headers: { "User-Agent": "ece-brain-whisper-setup" } }, (res) => {
      if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location) {
        res.resume();
        const next = res.headers.location.startsWith("http")
          ? res.headers.location
          : new URL(res.headers.location, url).toString();
        download(next, dest, redirects + 1).then(resolve, reject);
        return;
      }
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode} for ${url}`));
        res.resume();
        return;
      }
      const total = Number(res.headers["content-length"] || 0);
      let got = 0;
      let lastLog = 0;
      const out = fs.createWriteStream(dest);
      res.on("data", (c) => {
        got += c.length;
        const now = Date.now();
        if (now - lastLog > 1500) {
          lastLog = now;
          const pct = total ? ((got / total) * 100).toFixed(1) : "?";
          console.log(`  … ${(got / 1048576).toFixed(1)} MB (${pct}%)`);
        }
      });
      res.pipe(out);
      out.on("finish", () => out.close(() => resolve(dest)));
      out.on("error", reject);
    });
    req.on("error", reject);
  });
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const dest = path.join(OUT_DIR, NAME);
  if (fs.existsSync(dest) && fs.statSync(dest).size > 1_000_000) {
    console.log("已存在:", dest);
    console.log("在 .env 设置:");
    console.log(`  HOST_ASR_MODE=local`);
    console.log(`  WHISPER_MODEL=${dest}`);
    console.log(`  WHISPER_BIN=<whisper-cli 或 main 可执行文件路径>`);
    console.log("或启动 whisper.cpp server 后设 WHISPER_SERVER_URL=http://127.0.0.1:8080");
    return;
  }
  console.log("下载", URL);
  console.log("→", dest);
  const tmp = dest + ".part";
  try {
    await download(URL, tmp);
    fs.renameSync(tmp, dest);
  } catch (err) {
    try {
      fs.unlinkSync(tmp);
    } catch (_) {}
    console.error("失败:", err.message || err);
    process.exit(1);
  }
  console.log("完成:", dest, `(${(fs.statSync(dest).size / 1048576).toFixed(1)} MB)`);
  console.log("\n下一步：安装 whisper.cpp 可执行文件，并在 .env 写入 HOST_ASR_MODE=local 与 WHISPER_BIN/WHISPER_SERVER_URL");
}

main();
