/**
 * 按需屏幕上下文：保存截图路径供建议卡 / 速览注入（OCR/VLM 可后续接）。
 * 截图采集在主进程用 desktopCapturer；本模块只管落盘与读取。
 */
const fs = require("fs");
const path = require("path");
const os = require("os");
const { refreshBridge } = require("./jot.cjs");

function screenDir() {
  return path.join(os.tmpdir(), "ece-screen-ctx");
}

function latestMetaPath() {
  return path.join(screenDir(), "latest.json");
}

function ensureDir() {
  fs.mkdirSync(screenDir(), { recursive: true });
}

/**
 * @param {Buffer} pngBuffer
 * @param {{ note?: string, sourceId?: string }} [meta]
 */
function saveScreenCapture(pngBuffer, meta = {}) {
  if (!pngBuffer?.length) return { ok: false, error: "empty_png" };
  ensureDir();
  const file = path.join(screenDir(), `cap_${Date.now()}.png`);
  fs.writeFileSync(file, pngBuffer);
  const info = {
    ts: Date.now(),
    path: file,
    note: String(meta.note || "").slice(0, 200),
    sourceId: meta.sourceId || "",
    ocrText: meta.ocrText || null,
    bytes: pngBuffer.length
  };
  fs.writeFileSync(latestMetaPath(), JSON.stringify(info, null, 2), "utf8");
  refreshBridge({ lastScreen: { ts: info.ts, path: info.path, note: info.note } });
  return { ok: true, ...info };
}

function getLatestScreenContext() {
  try {
    if (!fs.existsSync(latestMetaPath())) return null;
    return JSON.parse(fs.readFileSync(latestMetaPath(), "utf8"));
  } catch (_) {
    return null;
  }
}

function updateScreenOcr(ocrText) {
  const cur = getLatestScreenContext();
  if (!cur?.path) return { ok: false, error: "no_capture" };
  const text = String(ocrText || "").trim();
  if (!text) return { ok: false, error: "empty_ocr" };
  const next = { ...cur, ocrText: text.slice(0, 1200) };
  fs.writeFileSync(latestMetaPath(), JSON.stringify(next, null, 2), "utf8");
  refreshBridge({
    lastScreen: { ts: next.ts, path: next.path, note: next.note || "", ocr: true }
  });
  return { ok: true, ...next };
}

function formatScreenForPrompt() {
  const s = getLatestScreenContext();
  if (!s) return "";
  const ageSec = Math.round((Date.now() - s.ts) / 1000);
  if (ageSec > 180) return ""; // 超过 3 分钟不注入
  const bits = [`[Screen Context] captured ${ageSec}s ago`];
  if (s.note) bits.push(`note: ${s.note}`);
  if (s.ocrText) bits.push(`ocr: ${String(s.ocrText).slice(0, 400)}`);
  else bits.push(`image: ${s.path} (OCR 未接，仅路径)`);
  return bits.join(" | ");
}

module.exports = {
  saveScreenCapture,
  getLatestScreenContext,
  updateScreenOcr,
  formatScreenForPrompt,
  screenDir
};
