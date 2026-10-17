/**
 * 会议会话 — 意图谓词（招生/回忆/闲聊/偏题等）
 * 句式只读 knowledge/schema/session-intents.json 与 query-classify.json。
 */
const { isQuestionForm, TOPIC_HINT_RE, LOGISTICS_RE, normText } = require("../../duplex");
const { AGENT_MODE, DAZHI_RE } = require("../constants.cjs");
const { normalizeDazhiAliases } = require("../commands/normalize.cjs");
const { detectAgentCommand } = require("../commands/detectCommand.cjs");
const { load, rx } = require("../../knowledge/schemaStore.cjs");

function lim(name) {
  const value = load().session.limits[name];
  if (value == null) throw new Error("missing session limit " + name);
  return value;
}

function s(name) {
  return rx("session", name);
}

function isPolicyLikeQuestion(text) {
  const t = normalizeDazhiAliases(text);
  return s("policyLike").test(t) && isQuestionForm(t);
}

function classifyHaIntent(lastFloor, currentHa) {
  const cmd = detectAgentCommand(lastFloor);
  if (cmd.talkMode || cmd.command === "WAKE_TALK") return "HA_TALK";
  if (cmd.askMode || cmd.command === "WAKE_ASK") return "HA_ASK";
  if (s("haTalkCue").test(cmd.text)) return "HA_TALK";
  if (currentHa === AGENT_MODE.HA_TALK && !s("haAskLock").test(cmd.text)) {
    if (isPolicyLikeQuestion(cmd.text)) return "HA_ASK";
    return "HA_TALK";
  }
  if (isPolicyLikeQuestion(cmd.text)) return "HA_ASK";
  if (isQuestionForm(cmd.text)) return "HA_ASK";
  return currentHa === AGENT_MODE.HA_TALK ? "HA_TALK" : "HA_ASK";
}

function shouldSteerOffTopic(lastFloor, agenda) {
  const t = normalizeDazhiAliases(lastFloor);
  if (!t || t.length < lim("steerMinLen")) return { steer: false, reason: "", weak: false };
  if (LOGISTICS_RE.test(t) && !TOPIC_HINT_RE.test(t)) {
    return { steer: false, reason: "logistics", weak: false };
  }
  if (s("offTopic").test(t) && !TOPIC_HINT_RE.test(t)) {
    return { steer: true, reason: "off-topic-dict", weak: false };
  }
  const agendaHit = agenda && normText(t).includes(normText(agenda).slice(0, 4));
  if (t.length >= lim("steerWeakLen") && !TOPIC_HINT_RE.test(t) && !agendaHit && !DAZHI_RE.test(t)) {
    return { steer: false, reason: "weak-no-topic", weak: true };
  }
  return { steer: false, reason: "on-topic", weak: false };
}

function isLocalVisitIntent(text) {
  return s("localVisit").test(normalizeDazhiAliases(text));
}

function isWhyInvestIntent(text) {
  return s("whyInvest").test(normalizeDazhiAliases(text));
}

function isEnrollmentBenefitAsk(text) {
  const t = normalizeDazhiAliases(String(text || "").trim());
  const max = load().classify.limits.enrollmentMax;
  if (!t || !rx("classify", "enrollmentNeed").test(t)) return false;
  if (rx("classify", "enrollmentBlock").test(t)) return false;
  if (rx("classify", "enrollmentHelp").test(t)) return true;
  return (
    rx("classify", "enrollmentJoin").test(t) &&
    rx("classify", "enrollmentAsk").test(t) &&
    rx("classify", "enrollmentParticle").test(t) &&
    t.length <= max
  );
}

function isRecallLastAsk(text) {
  const t = normalizeDazhiAliases(String(text || "").trim());
  if (!t) return false;
  if (isAskListRequest(t)) return false;
  if (s("recallExact").test(t)) return true;
  return s("recallLoose").test(t);
}

function isAskListRequest(text) {
  const t = normalizeDazhiAliases(String(text || "").trim());
  if (!t) return false;
  return s("askList").test(t);
}

function isSessionMemoryMeta(text) {
  const t = normalizeDazhiAliases(String(text || "").trim());
  if (!t) return false;
  return s("sessionMemory").test(t);
}

function isCasualChitchat(text) {
  const t = normalizeDazhiAliases(String(text || "").trim());
  if (!t) return false;
  const bare = t.replace(/\s/g, "");
  if (s("casualExact").test(bare)) return true;
  return s("casualLoose").test(t);
}

function isBizDeicticFollowUp(text) {
  const t = normalizeDazhiAliases(String(text || "").trim());
  if (!t || t.length < lim("deicticMinLen")) return false;
  if (isCasualChitchat(t) || isRecallLastAsk(t) || isSessionMemoryMeta(t)) return false;
  if (s("commandSkip").test(t)) return false;
  return s("deictic").test(t);
}

function isBizStickyFollowUp(text) {
  const t = normalizeDazhiAliases(String(text || "").trim());
  if (!t || t.length < lim("stickyMinLen")) return false;
  if (isCasualChitchat(t) || isRecallLastAsk(t) || isSessionMemoryMeta(t)) return false;
  if (s("commandSkip").test(t)) return false;
  if (isBizDeicticFollowUp(t)) return true;
  return s("sticky").test(t);
}

function detectUserTone(text) {
  const t = normalizeDazhiAliases(String(text || "").trim());
  if (!t) return null;
  if (s("toneInsult").test(t)) return "insult";
  if (s("toneRetry").test(t)) return "retry";
  return null;
}

function isTrustChallenge(text) {
  return s("trustChallenge").test(normalizeDazhiAliases(text));
}

module.exports = {
  isPolicyLikeQuestion,
  classifyHaIntent,
  shouldSteerOffTopic,
  isLocalVisitIntent,
  isWhyInvestIntent,
  isEnrollmentBenefitAsk,
  isRecallLastAsk,
  isAskListRequest,
  isSessionMemoryMeta,
  isCasualChitchat,
  isBizDeicticFollowUp,
  isBizStickyFollowUp,
  detectUserTone,
  isTrustChallenge
};
