/**
 * 经营顾问路径：先播本地短句，后台续写
 */
const S = require("./kit.cjs");

/**
 * @returns {object|null}
 */
function tryBizAnswer(ctx) {
  const { agenda, opts, state, a2aTrace, kbStatus, floors, qFp, askText, useBiz, lastFloor } = ctx;
  if (!useBiz) return null;

  const tier = S.classifyAnswerTier(askText, {
    bizFollowUps: state.bizFollowUps || 0
  });
  const deep = tier === "L3";
  const fast = S.buildFastLead(askText);
  const spokenParts = [];
  const lead = S.emitLead(opts, fast.lead);
  const follow = S.emitLead(opts, fast.follow);
  if (lead) spokenParts.push(lead);
  if (follow) spokenParts.push(follow);
  const spokenText = spokenParts.join("");
  opts.onStatus?.({
    phase: "thinking",
    reason: deep ? "HA_BIZ_DEEP" : "HA_BIZ",
    tier
  });
  const signal = opts.signal;
  void (async () => {
    try {
      if (signal?.aborted) return;
      const biz = await S.runBusinessAdvisor({
        question: askText,
        recentFloors: floors,
        lastHostAnswer: String(opts.lastHostSpeakText || spokenText || ""),
        agenda,
        signal,
        onStatus: opts.onStatus,
        tier,
        meetingId: state.meetingId,
        bizFollowUps: state.bizFollowUps || 0,
        timeoutMs: S.FAST_LLM_MS
      });
      if (signal?.aborted || !biz?.usedLlm) return;
      state.bizFollowUps = (state.bizFollowUps || 0) + 1;
      const extra = S.leadClause(biz.plan?.tts || "", 36);
      if (!extra || S.isDefinitionSpeak(extra) || S.alreadyCovered(extra, spokenText)) return;
      S.emitLead(opts, extra);
      S.debugLog.info("Strategy", "经营续写接上", { text: extra.slice(0, 40) });
    } catch (err) {
      S.debugLog.warn("Strategy", "经营续写失败", { error: String(err?.message || err) });
    }
  })();

  const answer = spokenText || fast.source || "";
  if (answer && state?.meetingId) {
    S.rememberAnswer(state.meetingId, {
      question: askText,
      tts: answer,
      arkMode: "biz-lead"
    });
    S.rememberRealAsk(state, askText);
  }
  a2aTrace.push(
    S.newEvent("HostAgent", "AudioBridge", "EARLY_LEAD", {
      lead: lead.slice(0, 40),
      follow: follow.slice(0, 40)
    })
  );
  return {
    shouldIntervene: Boolean(answer),
    interventionText: "",
    fullAnswer: answer,
    spokenPrefix: lead,
    earlyCovered: true,
    earlySpoken: true,
    reason: "BIZ_ANSWER",
    latestToDos: [],
    nextStageRecommendation: "MainDiscussion",
    a2aTrace,
    arkConfigured: true,
    arkMode: "biz-lead",
    arkBillingOverdue: false,
    arkError: null,
    agentMode: state.mode,
    kbStatus,
    questionFp: qFp,
    wake: { lastFloor, chatReply: true, rewritten: askText, tier }
  };
}

module.exports = { tryBizAnswer };
