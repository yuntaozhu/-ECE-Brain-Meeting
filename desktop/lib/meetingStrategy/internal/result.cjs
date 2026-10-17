/** 结果工厂、口播工具、纠错重答 */
const D = require("./deps.cjs");
const scripts = require("./scripts.cjs");
// 口播热路径：debugLog 直连 platform，避免 deps 未完成导出时 info/warn 崩
const { debugLog } = require("../../platform/debugLog.cjs");
const {
  matchFaqInstant,
  rememberAnswer,
  stripIntroBoilerplate,
  clipUtterance,
  detectUserTone,
  isEnrollmentBenefitAsk,
  isBusinessIntent,
  isOperateQuestion,
  buildFastLead,
  isDefinitionSpeak,
  queryWiki,
  AGENT_MODE
} = D;
const { APOLOGY_INSULT, APOLOGY_RETRY } = scripts;

function rememberRealAsk(state, question) {
  if (!state) return;
  const q = String(question || "").trim();
  if (q.length < 8) return;
  if (detectUserTone(q)) return;
  const { rx } = require("../../knowledge/schemaStore.cjs");
  if (rx("speak", "realAskSkip").test(q) && q.length < 16) return;
  state.lastRealAsk = q.slice(0, 200);
  state.lastRealAskAt = Date.now();
}

/** 投诉后重答上一实质问：优先 FAQ / 行事历本地口播，禁止样板班兜底 */
function answerCorrectionForPrev(prevAsk, tone, state, a2aTrace, kbStatus, qFp) {
  const q = String(prevAsk || "").trim();
  const { speakLine, rx } = require("../../knowledge/schemaStore.cjs");
  const prefix = tone === "insult" || tone === "retry" ? speakLine("correctPrefix") : "";
  const faq =
    matchFaqInstant(q) ||
    (rx("speak", "correctRollout").test(q) ? matchFaqInstant(speakLine("faqRollout")) : null) ||
    (rx("speak", "correctPricing").test(q) ? matchFaqInstant(speakLine("faqWorth")) : null) ||
    (isEnrollmentBenefitAsk(q) ? matchFaqInstant(speakLine("faqEnrollment")) : null);
  if (faq?.answer) {
    return playAnswer(
      `${prefix}${faq.answer}`,
      "WAKE_ANSWER",
      state,
      a2aTrace,
      kbStatus,
      qFp,
      "faq-correct",
      { cacheQuestion: q }
    );
  }
  if (isBusinessIntent(q) || isOperateQuestion(q) || rx("speak", "correctBiz").test(q)) {
    const fast = buildFastLead(q);
    const body = clipUtterance(fast.lead || fast.source || "", 160);
    if (body && !isDefinitionSpeak(body)) {
      return playAnswer(
        `${prefix}${body}`,
        "WAKE_ANSWER",
        state,
        a2aTrace,
        kbStatus,
        qFp,
        "biz-correct",
        { cacheQuestion: q }
      );
    }
  }
  const wikiQ = queryWiki(q, 2);
  const top = wikiQ.hits?.[0];
  if (top?.speak && (top.score || 0) >= 6 && !isDefinitionSpeak(top.speak)) {
    return playAnswer(
      `${prefix}${clipUtterance(top.speak, 160)}`,
      "WAKE_ANSWER",
      state,
      a2aTrace,
      kbStatus,
      qFp,
      "wiki-correct",
      { cacheQuestion: q }
    );
  }
  return playAnswer(
    tone === "insult" ? APOLOGY_INSULT : APOLOGY_RETRY,
    "WAKE_ANSWER",
    state,
    a2aTrace,
    kbStatus,
    qFp,
    "template"
  );
}

function compactText(text) {
  return String(text || "").replace(/\s+/g, "");
}

function alreadyCovered(extra, spoken) {
  const e = compactText(extra);
  const s = compactText(spoken);
  if (e.length < 8) return true;
  if (!s) return false;
  return s.includes(e.slice(0, Math.min(16, e.length)));
}

function continuationAfter(full, spoken) {
  const spokenRaw = String(spoken || "").trim();
  const fullRaw = String(full || "").trim();
  if (!spokenRaw) return fullRaw;
  const f = compactText(fullRaw);
  const s = compactText(spokenRaw);
  if (!f.startsWith(s) || f.length <= s.length + 6) return "";
  const rest = fullRaw.slice(spokenRaw.length).replace(/^[，,；;。\s]+/, "");
  return leadClause(rest, 36);
}

function emitLead(opts, text) {
  const t = stripIntroBoilerplate(String(text || "").trim());
  if (!t) return "";
  // 日志由 onEarlySpeak→speakSoft 统一打，避免「先开口播」成对出现
  try {
    opts.onEarlySpeak?.(t);
  } catch (err) {
    debugLog.warn("Strategy", "先开口播失败", { error: String(err?.message || err) });
  }
  return t;
}

function firstSentence(text) {
  const t = String(text || "").trim();
  if (!t) return "";
  const m = t.match(/^[\s\S]{8,80}?[。！？!?]/);
  if (m) return m[0].trim();
  if (t.length >= 24) return t.slice(0, 36).trim();
  return "";
}

function clipSpeak(text, max = 80) {
  return String(text || "")
    .replace(/^["「]|["」]$/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

function newEvent(sender, target, action, payload = {}) {
  return {
    eventId: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    timestamp: Date.now(),
    sender,
    target,
    action,
    payload
  };
}

function objectionAnswer(level) {
  const { speakLine } = require("../../knowledge/schemaStore.cjs");
  if (level >= 4) return speakLine("objection4");
  if (level >= 3) return speakLine("objection3");
  if (level >= 2) return speakLine("objection2");
  return speakLine("objection1");
}

function baseResult(extra) {
  const out = {
    shouldIntervene: false,
    interventionText: "",
    reason: "OK",
    latestToDos: [],
    nextStageRecommendation: null,
    a2aTrace: [],
    arkConfigured: Boolean((process.env.DOUBAO_API_KEY || process.env.ARK_API_KEY || "").trim()),
    arkMode: "skip",
    arkBillingOverdue: false,
    arkError: null,
    agentMode: AGENT_MODE.HH,
    modeChange: null,
    ...extra
  };
  if (out.interactionMode == null) out.interactionMode = out.agentMode;
  if (out.agentMode == null) out.agentMode = out.interactionMode;
  return out;
}

function playAnswer(text, reason, state, a2aTrace, kbStatus, qFp, arkMode, meta = {}) {
  const answer = stripIntroBoilerplate(clipUtterance(text, 160));
  a2aTrace.push(newEvent("HostAgent", "AudioBridge", "PLAY_ANSWER", { ttsText: answer, reason }));
  if (meta.cacheQuestion && answer && state?.meetingId) {
    rememberAnswer(state.meetingId, {
      question: meta.cacheQuestion,
      tts: answer,
      arkMode: arkMode || "template"
    });
    rememberRealAsk(state, meta.cacheQuestion);
  }
  return {
    shouldIntervene: true,
    interventionText: answer,
    fullAnswer: answer,
    reason,
    latestToDos: [],
    nextStageRecommendation: "MainDiscussion",
    a2aTrace,
    arkConfigured: true,
    arkMode: arkMode || "template",
    arkBillingOverdue: false,
    arkError: null,
    agentMode: state.mode,
    interactionMode: state.mode,
    kbStatus,
    questionFp: qFp || "",
    wake: { lastFloor: "" }
  };
}


module.exports = {
  rememberRealAsk,
  answerCorrectionForPrev,
  compactText,
  alreadyCovered,
  continuationAfter,
  emitLead,
  firstSentence,
  clipSpeak,
  newEvent,
  objectionAnswer,
  baseResult,
  playAnswer
};
