/**
 * 咨询门控：粘滞超时、纠错、去重、参观/信任/投入/回忆/闲聊抵触
 */
const S = require("./kit.cjs");
const { banCard, inCorrectingWindow } = require("../../../intelligence/frameGate.cjs");

/** 粘滞到期只截断之后的闲聊；当前这句完整问仍要改写并检索。 */
function currentAskSurvivesTimeout(text) {
  const q = String(text || "").trim();
  if (!q || !S.rx("operators", "interrogative").test(q)) return false;
  const { isTruncatedAsk } = require("../../agent/relevance.cjs");
  if (isTruncatedAsk(q)) return false;
  return q.replace(/[^\u4e00-\u9fffA-Za-z0-9]/g, "").length >= 4;
}

function markCorrecting(state, keepFocusAsk) {
  if (!state) return;
  const wrongTitle = String(
    (state.lastDesign && state.lastDesign.hypothesisId) ||
      (state.lastSpeakDraft && state.lastSpeakDraft.title) ||
      (state.lastIntelligence && state.lastIntelligence.card && state.lastIntelligence.card.title) ||
      ""
  ).trim();
  if (wrongTitle) banCard(state, wrongTitle);
  else {
    const { frameCfg } = require("../../../intelligence/frameGate.cjs");
    state.correctingUntil = Date.now() + frameCfg().correctWindowMs;
  }
  const keep = String(keepFocusAsk || "").trim();
  if (keep.length >= 8) {
    const { commitFocusAsk } = require("../../../intelligence/memory.cjs");
    commitFocusAsk(state, keep, { asPending: true });
  } else {
    state.lastOpenAsk = "";
    state.pendingAsk = "";
  }
  if (state.lastIntelligence) {
    state.lastIntelligence = {
      ...state.lastIntelligence,
      sticky: { ...(state.lastIntelligence.sticky || {}), clearCarry: true }
    };
  }
}

/**
 * @returns {object|null} 结果或 null（继续）
 */
function handleGate(ctx) {
  const { agenda, opts, state, a2aTrace, kbStatus, floors, cmd, qFp } = ctx;
  const lastFloor = ctx.lastFloor;

  if (
    !cmd.named &&
    cmd.command !== "CONTINUE" &&
    cmd.command !== "WAKE_ASK" &&
    Date.now() > (state.haLockedUntil || 0) &&
    !currentAskSurvivesTimeout(lastFloor)
  ) {
    S.setMode(state, S.INTERACTION_MODE.IDLE_LISTEN);
    S.debugLog.info("Strategy", "咨询粘滞到期，回静默", { stickyMs: S.HA_STICKY_MS });
    return S.baseResult({
      reason: "HA_TIMEOUT_SILENT",
      a2aTrace,
      agentMode: state.mode,
      modeChange: S.INTERACTION_MODE.IDLE_LISTEN,
      kbStatus
    });
  }

  const tone = S.detectUserTone(lastFloor) || S.detectUserTone(cmd.payload || "");
  if (tone) {
    S.setMode(state, S.INTERACTION_MODE.HA_ASK);
    state.haLockedUntil = Date.now() + 90000;
    markCorrecting(state);
    const prev = String(state.lastRealAsk || "").trim();
    const prevFresh = prev && Date.now() - (state.lastRealAskAt || 0) < 180000;
    S.debugLog.info("Strategy", "投诉纠错", {
      tone,
      hasPrev: Boolean(prevFresh),
      prev: prev.slice(0, 40),
      ban: String(state.banCardTitle || "").slice(0, 40)
    });
    if (prevFresh) {
      return S.answerCorrectionForPrev(prev, tone, state, a2aTrace, kbStatus, qFp);
    }
    return S.playAnswer(
      tone === "insult" ? S.APOLOGY_INSULT : S.APOLOGY_RETRY,
      "WAKE_ANSWER",
      state,
      a2aTrace,
      kbStatus,
      qFp,
      "template"
    );
  }

  if (
    qFp &&
    opts.lastQuestionFp === qFp &&
    opts.lastQuestionAt &&
    Date.now() - opts.lastQuestionAt < 45000 &&
    !inCorrectingWindow(state)
  ) {
    return S.baseResult({
      reason: "DEDUP_SKIP",
      a2aTrace,
      agentMode: state.mode,
      kbStatus,
      questionFp: qFp
    });
  }

  if (S.isLocalVisitIntent(lastFloor)) {
    S.setMode(state, S.INTERACTION_MODE.HA_ASK);
    return S.playAnswer(S.VISIT_HANDOFF, "WAKE_ANSWER", state, a2aTrace, kbStatus, qFp, "faq");
  }
  if (S.isTrustChallenge(lastFloor)) {
    S.bumpObjectionLevel(state, lastFloor);
    return S.playAnswer(S.TRUST_LINES, "WAKE_ANSWER", state, a2aTrace, kbStatus, qFp, "template");
  }
  if (S.isWhyInvestIntent(lastFloor)) {
    state.objectionLevel = Math.max(state.objectionLevel || 1, 4);
    const investFaq =
      S.matchFaqInstant(lastFloor) ||
      S.matchFaqInstant("投入三万九真的值得吗") ||
      S.matchFaqInstant("我掏钱为了啥");
    return S.playAnswer(
      investFaq?.answer || S.objectionAnswer(4),
      "WAKE_ANSWER",
      state,
      a2aTrace,
      kbStatus,
      qFp,
      investFaq?.answer ? "faq" : "template"
    );
  }

  if (S.isAskListRequest(lastFloor) || S.isAskListRequest(cmd.payload || "")) {
    S.setMode(state, S.INTERACTION_MODE.HA_ASK);
    state.haLockedUntil = Date.now() + 90000;
    const rows = S.readSession(state.meetingId, { limit: 40 });
    const speech = S.formatAskRecap(rows);
    S.debugLog.info("Strategy", "本场提问回顾", { chars: speech.length });
    return S.playAnswer(speech, "WAKE_ANSWER", state, a2aTrace, kbStatus, qFp, "recall-list", {
      speakKind: "meta"
    });
  }

  // R10d：不对，我刚刚问的是 X → 写 Focus 并按 X 重答
  {
    const { extractAskRepairBody, commitFocusAsk } = require("../../../intelligence/memory.cjs");
    const repairBody = extractAskRepairBody(lastFloor) || extractAskRepairBody(cmd.payload || "");
    if (repairBody) {
      S.setMode(state, S.INTERACTION_MODE.HA_ASK);
      state.haLockedUntil = Date.now() + 90000;
      markCorrecting(state, repairBody);
      commitFocusAsk(state, repairBody, { asPending: true });
      S.debugLog.info("Strategy", "ask_repair 写回 Focus", { prev: repairBody.slice(0, 48) });
      return S.answerCorrectionForPrev(repairBody, "retry", state, a2aTrace, kbStatus, qFp);
    }
  }

  if (S.isRecallLastAsk(lastFloor) || S.isRecallLastAsk(cmd.payload || "")) {
    S.setMode(state, S.INTERACTION_MODE.HA_ASK);
    state.haLockedUntil = Date.now() + 90000;
    const ttl = 30 * 60 * 1000;
    const { pickLatestFocus } = require("../../../intelligence/memory.cjs");
    const rejectMeta = (t) =>
      S.isRecallLastAsk(t) || S.isSessionMemoryMeta(t) || S.rx("commands", "urgeAct").test(t);
    const focus = pickLatestFocus(state, { ttlMs: ttl, reject: rejectMeta });
    let prev = focus.text || "";
    // 纠偏窗口内再问「上一问」：默认按实质问重答，避免只会复述问句
    if (prev && inCorrectingWindow(state)) {
      S.debugLog.info("Strategy", "纠偏窗口内 recall→重答", { prev: prev.slice(0, 40) });
      return S.answerCorrectionForPrev(prev, "retry", state, a2aTrace, kbStatus, qFp);
    }
    // R10a/d：未答 Focus 也只回放问句（禁止弱匹配错卡当「重答」）
    if (prev) {
      S.debugLog.info("Strategy", "recall Focus", {
        prev: prev.slice(0, 40),
        source: focus.source,
        unanswered: Boolean(state.focusUnanswered)
      });
      return S.playAnswer(
        S.speakFill("recallPrevNow", { prev: S.clipUtterance(prev, 80) }),
        "WAKE_ANSWER",
        state,
        a2aTrace,
        kbStatus,
        qFp,
        "recall",
        { speakKind: "meta", speakReason: "recall_ask" }
      );
    }
    const priorFloor = [...floors]
      .reverse()
      .find(
        (l) =>
          l &&
          l !== lastFloor &&
          !S.isRecallLastAsk(l) &&
          !S.isSessionMemoryMeta(l) &&
          l.length >= 8 &&
          !S.rx("speak", "realAskSkip").test(l) &&
          !S.rx("commands", "urgeAct").test(l)
      );
    if (priorFloor) {
      return S.playAnswer(
        S.speakFill("recallFloor", { prev: S.clipUtterance(priorFloor, 80) }),
        "WAKE_ANSWER",
        state,
        a2aTrace,
        kbStatus,
        qFp,
        "recall",
        { speakKind: "meta", speakReason: "recall_ask" }
      );
    }
    return S.playAnswer(
      S.speakLine("recallEmptyNow"),
      "WAKE_ANSWER",
      state,
      a2aTrace,
      kbStatus,
      qFp,
      "template",
      { speakKind: "meta", speakReason: "recall_ask_empty" }
    );
  }

  if (S.isSessionMemoryMeta(lastFloor) || S.isSessionMemoryMeta(cmd.payload || "")) {
    S.setMode(state, S.INTERACTION_MODE.HA_ASK);
    state.haLockedUntil = Date.now() + 90000;
    const { pickLatestFocus } = require("../../../intelligence/memory.cjs");
    const focus = pickLatestFocus(state, { ttlMs: 30 * 60 * 1000 });
    const tip = focus.text
      ? S.speakFill("memoryPrevLong", { prev: S.clipUtterance(focus.text, 60) })
      : S.speakLine("memoryEmptyLong");
    return S.playAnswer(tip, "WAKE_ANSWER", state, a2aTrace, kbStatus, qFp, "template", {
      speakKind: "meta",
      speakReason: "session_memory"
    });
  }

  const lvl = S.bumpObjectionLevel(state, lastFloor);
  if (S.rx("speak", "objectionCue").test(lastFloor)) {
    const talk = S.classifyHaIntent(lastFloor, state.mode) === "HA_TALK";
    S.setMode(state, talk ? S.INTERACTION_MODE.HA_TALK : S.INTERACTION_MODE.HA_ASK);
    return S.playAnswer(S.objectionAnswer(lvl), "WAKE_ANSWER", state, a2aTrace, kbStatus, qFp, "template");
  }

  return null;
}

module.exports = { handleGate };
