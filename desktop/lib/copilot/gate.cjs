/**
 * 副驾驶意图门控（旁路，不进入 decideSpeak）。
 * 分类与触发阈值来自 knowledge/schema/copilot-gate.json。
 */
const { schemaStore } = require("../knowledge");
const { isQuestionForm } = require("../duplex");
const { isCasualChitchat } = require("../meetingSession/intents");

function copilotCfg() {
  return schemaStore.load().copilot || {};
}

function copilotRx(name) {
  return schemaStore.rx("copilot", name);
}

function lastTranscriptSegment(transcript) {
  const raw = String(transcript || "").trim();
  if (!raw) return "";
  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.replace(/^\[?\s*(会场|大智|Others|Me|Remote|Host)[\]:]?\s*/i, "").trim())
    .filter(Boolean);
  return lines.length ? lines[lines.length - 1] : raw;
}

/**
 * @param {string} segment
 * @returns {{
 *   category: string,
 *   should_trigger: boolean,
 *   urgency: string,
 *   target_topic: string,
 *   segment: string
 * }}
 */
function classifyCopilotIntent(segment) {
  const cfg = copilotCfg();
  const t = String(segment || "").trim();
  const minChars = Number(cfg.limits?.minChars) || 4;
  if (!t || t.length < minChars) {
    return {
      category: "CHITCHAT",
      should_trigger: false,
      urgency: "Ignore",
      target_topic: "",
      segment: t
    };
  }

  let category = "INFORMATION_SHARING";
  try {
    if (isCasualChitchat(t) || copilotRx("chitchat").test(t)) {
      category = "CHITCHAT";
    } else if (copilotRx("opinionSeeking").test(t)) {
      // 征集观点优先于泛问句（避免「怎么推进」被归成 DIRECT_QUESTION）
      category = "OPINION_SEEKING";
    } else if (copilotRx("directQuestion").test(t) || isQuestionForm(t)) {
      category = "DIRECT_QUESTION";
    } else if (copilotRx("informationSharing").test(t)) {
      category = "INFORMATION_SHARING";
    }
  } catch (_) {
    if (isCasualChitchat(t)) category = "CHITCHAT";
    else if (isQuestionForm(t)) category = "DIRECT_QUESTION";
  }

  const triggerCats = Array.isArray(cfg.triggerCategories)
    ? cfg.triggerCategories
    : ["DIRECT_QUESTION", "OPINION_SEEKING"];
  const urgencyMap = cfg.urgencyByCategory || {};
  const should_trigger = triggerCats.includes(category);
  const target_topic = t.replace(/[？?。.!！，,、\s]+$/g, "").slice(0, 36);

  return {
    category,
    should_trigger,
    urgency: urgencyMap[category] || (should_trigger ? "Medium" : "Low"),
    target_topic,
    segment: t
  };
}

module.exports = {
  classifyCopilotIntent,
  lastTranscriptSegment,
  copilotCfg
};
