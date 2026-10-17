/**
 * Chat 失败/超时本地口播。
 * 句式与兜底文案只读 schema/speak-lines.json。
 */
const {
  matchFaqInstant,
  isRecallLastAsk,
  isAskListRequest,
  isSessionMemoryMeta,
  readSession,
  isCasualChitchat,
  isEnrollmentBenefitAsk,
  retrieveKnowledge,
  clipUtterance,
  leadClause,
  DEFAULT_AGENDA
} = require("../internal/deps.cjs");
const {
  CHITCHAT_LINE,
  IDENTITY_LINE,
  CLARIFY_LINE,
  formatAskRecap,
  agendaRedirectLine
} = require("../internal/scripts.cjs");
const { repeatLine } = require("../agent/relevance.cjs");
const { decideSpeak } = require("../decideSpeak.cjs");
const { speakLine, speakFill, rx } = require("../../knowledge/schemaStore.cjs");

function isExplicitAgendaAsk(q) {
  return rx("speak", "explicitAgenda").test(q);
}

function isObviousChitchatOrOffTopic(q) {
  if (isCasualChitchat(q)) return true;
  return rx("speak", "obviousChitchat").test(q);
}

function looksLikeAgendaMenu(text) {
  return rx("speak", "agendaMenu").test(String(text || ""));
}

function extractAnswerBody(raw) {
  let s = String(raw || "").trim();
  if (!s) return "";
  if (/^##\s*Q:/.test(s) || /^Q:/.test(s)) {
    const m = s.match(/\nA[:：]\s*([\s\S]+)/i);
    if (m) s = m[1].trim();
    else return "";
  }
  s = s.replace(/^A[:：]\s*/i, "").trim();
  if (looksLikeAgendaMenu(s)) return "";
  if (s.length < 12) return "";
  return s;
}

function kbBiteAnswer(askText) {
  const q = String(askText || "").trim();
  if (!q) return "";
  let intent = null;
  let script = "";
  try {
    const { ruleUnderstand, intentSoftAnswer } = require("../agent/intent.cjs");
    intent = ruleUnderstand(q);
    script = intentSoftAnswer(intent, q);
  } catch (_) {
    /* ignore */
  }
  let hits = [];
  try {
    hits = retrieveKnowledge(q, 4)?.hits || [];
  } catch (_) {
    hits = [];
  }
  const d = decideSpeak({ ask: q, hits, intent, script });
  if (!d.speak || looksLikeAgendaMenu(d.speak)) return "";
  if (d.action === "answer") return leadClause(d.speak, 90);
  return d.speak;
}

function chatFallbackFor(askText, state, agenda, opts = {}) {
  const q = String(askText || "").trim();
  if (rx("speak", "wakeOnly").test(q)) return speakLine("wakePresence");
  if (isAskListRequest(q)) {
    const rows = readSession(state?.meetingId, { limit: 40 });
    return formatAskRecap(rows);
  }
  if (isRecallLastAsk(q)) {
    const prev = String(state?.lastRealAsk || "").trim();
    if (prev) return speakFill("recallPrev", { prev: clipUtterance(prev, 80) });
    return speakLine("recallEmpty");
  }
  if (isSessionMemoryMeta(q)) {
    const prev = String(state?.lastRealAsk || "").trim();
    return prev
      ? speakFill("memoryPrev", { prev: clipUtterance(prev, 60) })
      : speakLine("memoryEmpty");
  }
  if (isCasualChitchat(q)) return CHITCHAT_LINE;
  if (rx("speak", "identityAsk").test(q)) return IDENTITY_LINE;
  if (isExplicitAgendaAsk(q)) {
    return (
      matchFaqInstant(speakLine("faqAgenda"))?.answer ||
      matchFaqInstant(q)?.answer ||
      speakFill("agendaToday", { agenda: agenda || DEFAULT_AGENDA })
    );
  }

  const kb = kbBiteAnswer(q);
  if (kb && !looksLikeAgendaMenu(kb)) return kb;

  if (isEnrollmentBenefitAsk(q)) {
    return matchFaqInstant(speakLine("faqEnrollment"))?.answer || speakLine("enrollmentSoft");
  }

  if (isObviousChitchatOrOffTopic(q)) {
    return CLARIFY_LINE;
  }

  if (opts.allowAgendaRedirect === true && opts.forceAgenda) {
    return agendaRedirectLine(agenda || DEFAULT_AGENDA);
  }
  return kb || repeatLine();
}

module.exports = { chatFallbackFor, kbBiteAnswer, extractAnswerBody };
