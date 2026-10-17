/**
 * 咨询门控：粘滞超时、纠错、去重、参观/信任/投入/回忆/闲聊抵触
 */
const S = require("./kit.cjs");

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
    Date.now() > (state.haLockedUntil || 0)
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
    const prev = String(state.lastRealAsk || "").trim();
    const prevFresh = prev && Date.now() - (state.lastRealAskAt || 0) < 180000;
    S.debugLog.info("Strategy", "投诉纠错", {
      tone,
      hasPrev: Boolean(prevFresh),
      prev: prev.slice(0, 40)
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
    Date.now() - opts.lastQuestionAt < 45000
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
      cacheQuestion: lastFloor
    });
  }

  if (S.isRecallLastAsk(lastFloor) || S.isRecallLastAsk(cmd.payload || "")) {
    S.setMode(state, S.INTERACTION_MODE.HA_ASK);
    state.haLockedUntil = Date.now() + 90000;
    const prev = String(state.lastRealAsk || "").trim();
    const prevFresh = prev && Date.now() - (state.lastRealAskAt || 0) < 30 * 60 * 1000;
    if (prevFresh) {
      return S.playAnswer(
        S.speakFill("recallPrevNow", { prev: S.clipUtterance(prev, 80) }),
        "WAKE_ANSWER",
        state,
        a2aTrace,
        kbStatus,
        qFp,
        "recall"
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
          !S.rx("speak", "realAskSkip").test(l)
      );
    if (priorFloor) {
      return S.playAnswer(
        S.speakFill("recallFloor", { prev: S.clipUtterance(priorFloor, 80) }),
        "WAKE_ANSWER",
        state,
        a2aTrace,
        kbStatus,
        qFp,
        "recall"
      );
    }
    return S.playAnswer(
      S.speakLine("recallEmptyNow"),
      "WAKE_ANSWER",
      state,
      a2aTrace,
      kbStatus,
      qFp,
      "template"
    );
  }

  if (S.isSessionMemoryMeta(lastFloor) || S.isSessionMemoryMeta(cmd.payload || "")) {
    S.setMode(state, S.INTERACTION_MODE.HA_ASK);
    state.haLockedUntil = Date.now() + 90000;
    const prev = String(state.lastRealAsk || "").trim();
    const tip = prev
      ? S.speakFill("memoryPrevLong", { prev: S.clipUtterance(prev, 60) })
      : S.speakLine("memoryEmptyLong");
    return S.playAnswer(tip, "WAKE_ANSWER", state, a2aTrace, kbStatus, qFp, "template");
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
