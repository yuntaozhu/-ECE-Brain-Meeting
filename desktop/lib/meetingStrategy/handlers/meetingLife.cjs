const S = require("./kit.cjs");

/** MEETING_START / MEETING_END */
async function handle(ctx) {
  const { cmd, state, agenda, opts, a2aTrace, kbStatus } = ctx;
  if (cmd.command === "MEETING_START") {
    const prevId = state.meetingId;
    const newId = `mtg_${Date.now()}`;
    state.meetingId = newId;
    S.newSegment(state);
    state.meetingOpen = true;
    state.agenda = agenda;
    state.holdToEnd = false;
    state.interrupted = false;
    state.lastInterruptedText = "";
    state.interruptBuffer = null;
    state.holdFloorLines = [];
    state.bizFollowUps = 0;
    state.summaryPendingConfirm = false;
    state.objectionLevel = 1;
    try {
      if (prevId) S.clearMeetingCache(prevId);
      S.clearMeetingCache(newId);
    } catch (_) {}
    S.setMode(state, S.INTERACTION_MODE.IDLE_LISTEN);
    S.setLifecycle(state, S.MEETING_LIFE.OPENING);
    const openLine = `各位园长好，我是大智。本场围绕${S.clipSpeak(agenda, 36)}。需要我时请呼叫「大智」；说「谢谢大智」我继续静默听会。`;
    S.debugLog.info("Strategy", "会议开始", { meetingId: newId, agenda: agenda.slice(0, 40), prevId });
    a2aTrace.push(
      S.newEvent("DirectorAgent", "HostAgent", "MEETING_START", { meetingId: newId, agenda: agenda.slice(0, 40) })
    );
    return S.baseResult({
      shouldIntervene: true,
      interventionText: openLine,
      fullAnswer: openLine,
      reason: "MEETING_START",
      a2aTrace,
      agentMode: state.mode,
      modeChange: S.INTERACTION_MODE.IDLE_LISTEN,
      kbStatus,
      meetingId: newId,
      agenda,
      meetingLifecycle: S.MEETING_LIFE.OPENING,
      clearMainContext: true,
      warmKnowledge: true
    });
  }
  if (cmd.command === "MEETING_END") {
    S.debugLog.info("Strategy", "会议结束 → 会末总结", { meetingId: state.meetingId });
    return await S.runClosingPath(state, agenda, opts, a2aTrace, kbStatus);
  }
  return null;
}

module.exports = { handle, name: "meetingLife" };
