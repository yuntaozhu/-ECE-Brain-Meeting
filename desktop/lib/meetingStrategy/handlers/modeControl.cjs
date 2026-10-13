const S = require("./kit.cjs");

/** PAUSE / RESUME / STOP */
async function handle(ctx) {
  const { cmd, state, a2aTrace, kbStatus } = ctx;
  if (cmd.command === "PAUSE_LOG") {
    S.setMode(state, S.INTERACTION_MODE.PAUSED);
    return S.baseResult({
      shouldIntervene: true,
      interventionText: "好，记录已暂停。",
      reason: "MODE_PAUSE",
      a2aTrace,
      agentMode: state.mode,
      modeChange: S.INTERACTION_MODE.PAUSED,
      kbStatus
    });
  }
  if (cmd.command === "RESUME_LOG") {
    S.setMode(state, S.INTERACTION_MODE.HH);
    return S.baseResult({
      shouldIntervene: true,
      interventionText: "好，继续旁听记录。",
      reason: "MODE_RESUME",
      a2aTrace,
      agentMode: state.mode,
      modeChange: S.INTERACTION_MODE.HH,
      kbStatus
    });
  }
  if (cmd.command === "STOP") {
    S.setMode(state, S.INTERACTION_MODE.IDLE_LISTEN, { newSegment: true });
    state.holdToEnd = false;
    state.interrupted = false;
    state.interruptBuffer = null;
    state.holdFloorLines = [];
    state.haLockedUntil = 0;
    state.bizFollowUps = 0;
    S.setLifecycle(state, state.meetingOpen ? S.MEETING_LIFE.SILENT : S.MEETING_LIFE.OFF);
    return S.baseResult({
      shouldIntervene: true,
      interventionText: "好，我继续静默旁听。需要时请再呼叫大智。",
      reason: "STOP",
      interruptTts: true,
      a2aTrace,
      agentMode: state.mode,
      modeChange: S.INTERACTION_MODE.IDLE_LISTEN,
      kbStatus,
      meetingLifecycle: S.deriveMeetingLife(state)
    });
  }
  return null;
}

module.exports = { handle, name: "modeControl" };
