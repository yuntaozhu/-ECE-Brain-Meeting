/**
 * 副驾驶去模板：检测骨架套话 + 组装非空壳 Option B。
 */
const { fillTpl } = require("./counterPattern.cjs");
const { copilotCfg } = require("./gate.cjs");
const { isUsableFact } = require("./topicQuality.cjs");

const DEFAULT_SKELETON_RX = [
  "建议先确认边界与代价再拍板",
  "建议先对齐边界与代价",
  "按现有口径",
  "关于.+，建议先确认边界",
  "围绕.+，您更关心价格、回报，还是落地节奏"
];

function skeletonPatterns(cfg) {
  const bag = cfg || copilotCfg();
  const list = bag.refine?.skeletonBan || bag.skeletonBan || DEFAULT_SKELETON_RX;
  return (Array.isArray(list) ? list : DEFAULT_SKELETON_RX)
    .map((s) => {
      try {
        return new RegExp(String(s), "i");
      } catch (_) {
        return null;
      }
    })
    .filter(Boolean);
}

/**
 * @param {string} text
 * @param {object} [cfg]
 */
function isSkeletonSuggestion(text, cfg) {
  const t = String(text || "").trim();
  if (!t) return true;
  return skeletonPatterns(cfg).some((rx) => rx.test(t));
}

/**
 * Option B：有 fact 走风险改写；无 fact 用 topic 句（已去「边界与代价再拍板」空壳）。
 * @param {{ fact?: string, topic?: string, templates?: object }} args
 * @param {object} [cfg]
 */
function buildPushBackLine(args = {}, cfg) {
  const bag = cfg || copilotCfg();
  const templates = args.templates || bag.templates || {};
  const fact = String(args.fact || "").trim();
  const topic = String(args.topic || "").trim() || "这一点";
  if (fact && isUsableFact(fact)) {
    const line = fillTpl(templates.push_back_with_fact || "", { fact, topic });
    if (line && !isSkeletonSuggestion(line, bag)) return line;
    return `风险侧先看清：${fact}——参考测算不是承诺，招生和执行不到位就落空。`;
  }
  const byTopic = fillTpl(templates.push_back_with_topic || "", { topic });
  if (byTopic && !isSkeletonSuggestion(byTopic, bag)) return byTopic;
  return `「${topic}」别只听乐观数字，先问清测算假设、招生量和执行条件再决定。`;
}

/**
 * 精炼结果若仍是骨架，用本地非骨架兜底（不发明报价）。
 */
function detemplateSuggestions(suggestions, ctx = {}, cfg) {
  const bag = cfg || copilotCfg();
  const next = { ...(suggestions || {}) };
  const fact = String(ctx.fact || "").trim();
  const topic = String(ctx.topic || "").trim() || "这一点";
  if (isSkeletonSuggestion(next.push_back, bag)) {
    next.push_back = buildPushBackLine({ fact, topic, templates: bag.templates }, bag);
  }
  if (isSkeletonSuggestion(next.push_forward, bag) && fact && isUsableFact(fact)) {
    next.push_forward = fact;
  }
  if (isSkeletonSuggestion(next.counter_inquiry, bag)) {
    next.counter_inquiry =
      fillTpl(bag.templates?.counter_inquiry_with_topic || "", { topic }) ||
      `您说的「${topic}」，是按新增招生测算，还是按在园美语相关收入？`;
  }
  return next;
}

module.exports = {
  isSkeletonSuggestion,
  buildPushBackLine,
  detemplateSuggestions,
  skeletonPatterns
};
