/**
 * 可播字段出口清洗：剥离控场元数据、第三人称「对方」。
 * 规则只读 schema（copilot.speakSanitize），引擎不写业务词。
 */
const { copilotCfg } = require("./gate.cjs");

function sanitizeSpeakText(text) {
  let s = String(text || "").replace(/\s+/g, " ").trim();
  if (!s) return "";

  const cfg = copilotCfg().speakSanitize || {};
  const pairs = Array.isArray(cfg.replacePairs) ? cfg.replacePairs : [["对方", "您"]];
  for (const row of pairs) {
    const from = row && row[0] != null ? String(row[0]) : "";
    const to = row && row[1] != null ? String(row[1]) : "";
    if (!from) continue;
    s = s.split(from).join(to);
  }

  const patterns = Array.isArray(cfg.stripPatterns) ? cfg.stripPatterns : [];
  for (const src of patterns) {
    try {
      s = s.replace(new RegExp(String(src), "gi"), " ");
    } catch (_) {}
  }

  s = s
    .replace(/[「"]\s*[」"]/g, "")
    .replace(/\s{2,}/g, " ")
    .replace(/[，,、]\s*[。.!！]/g, "。")
    .replace(/^[，,、。.!！\s]+|[，,、\s]+$/g, "")
    .trim();
  return s;
}

/** 文本是否仍含禁止进 TTS 的元标记（用于冒烟断言）。 */
function hasSpeakMetaLeak(text) {
  const cfg = copilotCfg().speakSanitize || {};
  const markers = Array.isArray(cfg.forbiddenMarkers)
    ? cfg.forbiddenMarkers
    : ["历史已否决", "可参考 FAQ", "可反问", "对方"];
  const s = String(text || "");
  return markers.some((m) => m && s.includes(m));
}

module.exports = { sanitizeSpeakText, hasSpeakMetaLeak };
