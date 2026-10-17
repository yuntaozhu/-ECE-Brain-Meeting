/**
 * Chat 失败/超时本地口播。
 * P0：默认走知识库/启发式，禁止「未知 → 议程菜单」当兜底。
 */
const {
  matchFaqInstant,
  isRecallLastAsk,
  isAskListRequest,
  isSessionMemoryMeta,
  readSession,
  isCasualChitchat,
  isEnrollmentBenefitAsk,
  buildFastLead,
  isDefinitionSpeak,
  retrieveKnowledge,
  queryWiki,
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
const { decideSpeak, repeatLine } = require("../agent/relevance.cjs");

function isExplicitAgendaAsk(q) {
  return /(会议主题|开什么会|今天.*主题|这次会议的主题|今天开什么会)/.test(q);
}

function isObviousChitchatOrOffTopic(q) {
  if (isCasualChitchat(q)) return true;
  return /^(天气|吃饭|几点了|你好啊|哈哈+|嗯+|哦+)[。.!！？?\s]*$/.test(q);
}

function looksLikeAgendaMenu(text) {
  return /今天主题是|您可以问全园美语是什么|四端联动、校园经营与家园共育/.test(String(text || ""));
}

/** 从 FAQ 块抽出 A: 正文；拒绝标题行 */
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

/**
 * 从本地知识挤一句口播。
 * 优先启发式/精确 FAQ，弱相关 keyword 命中不可靠时宁可用 soft fallback。
 */
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

/**
 * @param {string} askText
 * @param {object} state
 * @param {string} agenda
 * @param {object} [opts]
 * @returns {string}
 */
function chatFallbackFor(askText, state, agenda, opts = {}) {
  const q = String(askText || "").trim();
  if (/^(大智|大致)[。.!！？?\s]*$/.test(q)) return "我在，请讲。";
  if (isAskListRequest(q)) {
    const rows = readSession(state?.meetingId, { limit: 40 });
    return formatAskRecap(rows);
  }
  if (isRecallLastAsk(q)) {
    const prev = String(state?.lastRealAsk || "").trim();
    if (prev) return `刚才您问的是：${clipUtterance(prev, 80)}`;
    return "我这边还没记下您上一句实质问题。请再说一遍。";
  }
  if (isSessionMemoryMeta(q)) {
    const prev = String(state?.lastRealAsk || "").trim();
    return prev
      ? `上一问我记着：${clipUtterance(prev, 60)}。也可以说「大智总结一下」。`
      : "本场转写有记。您可以说「大智总结一下」听要点。";
  }
  if (isCasualChitchat(q)) return CHITCHAT_LINE;
  if (/(你是谁|你是什么|你叫什么)/.test(q)) return IDENTITY_LINE;
  if (isExplicitAgendaAsk(q)) {
    return (
      matchFaqInstant("今天会议主题是什么")?.answer ||
      matchFaqInstant(q)?.answer ||
      `今天主题是${agenda || DEFAULT_AGENDA}。`
    );
  }

  const kb = kbBiteAnswer(q);
  if (kb && !looksLikeAgendaMenu(kb)) return kb;

  if (isEnrollmentBenefitAsk(q)) {
    return (
      matchFaqInstant("加入全园美语对招生有帮助吗")?.answer ||
      "有帮助。项目核心目标是让美语特色成为招生引擎，测算口径不等于保证招满。"
    );
  }

  if (isObviousChitchatOrOffTopic(q)) {
    return CLARIFY_LINE;
  }

  if (opts.allowAgendaRedirect === true && opts.forceAgenda) {
    return agendaRedirectLine(agenda || DEFAULT_AGENDA);
  }
  // 无对齐命中时走设计算法的澄清或复述，不再用议程菜单句
  return kb || repeatLine();
}

module.exports = { chatFallbackFor, kbBiteAnswer };
