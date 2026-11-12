/**
 * Wave Q：副驾驶 topic/fact 原料净化（规则来自 schema，引擎不写业务词）。
 * 注意：不 require gate.cjs，避免与 classifyCopilotIntent 循环依赖。
 */
const { schemaStore } = require("../knowledge");

function copilotBag() {
  return schemaStore.load().copilot || {};
}

function safeRx(src, flags) {
  try {
    return new RegExp(String(src || ""), flags || "");
  } catch (_) {
    return null;
  }
}

function cfgRx(name, flags) {
  const cfg = copilotBag();
  const src = cfg.patterns && cfg.patterns[name];
  if (!src) return null;
  return safeRx(src, flags);
}

/**
 * @returns {"ACK"|"SUMMARY_DONE"|"SUMMARY_REQUEST"|"NOISE"|"BIZ_ASK"|"OTHER"}
 */
function classifySegmentKind(segment) {
  const t = String(segment || "").trim();
  if (!t) return "OTHER";
  const ack = cfgRx("ack");
  if (ack && ack.test(t)) return "ACK";
  const done = cfgRx("summaryDoneAsk");
  if (done && done.test(t)) return "SUMMARY_DONE";
  const sum = cfgRx("summaryRequest");
  if (sum && sum.test(t)) return "SUMMARY_REQUEST";
  const noise = cfgRx("topicNoise");
  if (noise && noise.test(t) && !(cfgRx("topicBizHints") || { test: () => false }).test(t)) {
    return "NOISE";
  }
  const biz = cfgRx("topicBizHints");
  if (biz && biz.test(t)) return "BIZ_ASK";
  return "OTHER";
}

function shouldSuppressCopilotCard(kind, opts = {}) {
  if (opts.force) return false;
  return kind === "ACK" || kind === "NOISE" || kind === "SUMMARY_DONE";
}

/**
 * 从会场句抽出可填模板的短 topic；失败返回空串（调用方用 generic）。
 */
function extractCopilotTopic(segment) {
  const cfg = copilotBag();
  const te = cfg.topicExtract || {};
  let t = String(segment || "").trim();
  if (!t) return "";

  const stripWake = safeRx(te.stripWake || "^(大智|大致|大志)[，,\\s]*");
  if (stripWake) t = t.replace(stripWake, "");
  t = t.replace(/[？?。.!！，,、\s]+$/g, "").trim();

  const kind = classifySegmentKind(segment);
  if (kind === "ACK" || kind === "NOISE" || kind === "SUMMARY_DONE") return "";

  const noise = cfgRx("topicNoise");
  if (noise && noise.test(t) && !(cfgRx("topicBizHints") || { test: () => false }).test(t)) {
    return "";
  }

  // 口语残片过长且无业务锚点：不进模板
  const biz = cfgRx("topicBizHints");
  if ((!biz || !biz.test(t)) && t.length > 18) {
    // 截到第一个语气停顿，仍无锚点则弃用
    const cut = t.split(/[，,、]/)[0] || t;
    if (!biz || !biz.test(cut)) return "";
    t = cut;
  } else if (biz && biz.test(t)) {
    try {
      const hint = String((cfg.patterns && cfg.patterns.topicBizHints) || "");
      const m = t.match(
        new RegExp(`[^，,。.!！？?]{0,12}(?:${hint})[^，,。.!！？?]{0,16}`)
      );
      if (m && m[0]) t = m[0].replace(/^(的|了|是|在|有|把|被)+/, "").trim();
    } catch (_) {}
  }

  const maxLen = Number(te.maxLen) || 24;
  t = t.slice(0, maxLen).trim();
  const banned = Array.isArray(te.blacklistExact) ? te.blacklistExact : [];
  if (!t || banned.includes(t)) return "";
  return t;
}

function isUsableFact(text) {
  const s = String(text || "").trim();
  if (s.length < 8) return false;
  const cfg = copilotBag();
  const banSrc = cfg.topicExtract && cfg.topicExtract.factBan;
  if (!banSrc) return true;
  const ban = safeRx(banSrc);
  if (ban && ban.test(s)) return false;
  return true;
}

module.exports = {
  classifySegmentKind,
  shouldSuppressCopilotCard,
  extractCopilotTopic,
  isUsableFact
};
