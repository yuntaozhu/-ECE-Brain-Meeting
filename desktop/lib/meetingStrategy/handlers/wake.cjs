const S = require("./kit.cjs");

/**
 * 唤醒 / 点名。仅问候则返回；有实质问题则设 HA 模式后 fallthrough（return null）
 */
async function handle(ctx) {
  const { cmd, state, agenda, a2aTrace, kbStatus, qFp } = ctx;
  const lastFloor = ctx.lastFloor;

  const wakeHit =
    cmd.command === "WAKE" ||
    cmd.command === "WAKE_ASK" ||
    cmd.command === "WAKE_TALK" ||
    (cmd.named && (state.mode === S.INTERACTION_MODE.HH || state.mode === S.INTERACTION_MODE.IDLE_LISTEN));

  if (!wakeHit) return null;

  S.ensureMeetingOpen(state, agenda);
  const ha = S.classifyHaIntent(lastFloor, state.mode);
  const onlyGreeting =
    /^(大智|大致)?\s*(你好|在吗|您在吗|听得到)?[。.!！？?\s]*$/.test(lastFloor.replace(/\s/g, "")) ||
    cmd.presence ||
    (cmd.command === "WAKE" && !/吗|呢|什么|怎么|为何|多少/.test(lastFloor) && lastFloor.length < 14);
  const alreadyConsult = S.isConsultMode(state.mode) && Date.now() < (state.haLockedUntil || 0);
  S.setMode(state, ha === "HA_TALK" ? S.INTERACTION_MODE.HA_TALK : S.INTERACTION_MODE.HA_ASK);

  if (onlyGreeting) {
    const pending = (state.listenNotes || []).filter((n) =>
      /[？?]|什么|怎么|多少|哪些|吗|条件|收费|支持/.test(n)
    );
    const lastPending = pending[pending.length - 1];
    if (lastPending) {
      state.listenNotes = [];
      ctx.lastFloor = lastPending;
      S.debugLog.info("Strategy", "唤醒后按旁听记录作答", { text: lastPending.slice(0, 40) });
      return null;
    }
    if (alreadyConsult) {
      S.debugLog.info("Strategy", "咨询中重复唤醒，静默待问", {
        text: lastFloor.slice(0, 20),
        stickyLeft: Math.max(0, (state.haLockedUntil || 0) - Date.now())
      });
      return S.baseResult({
        reason: "WAKE_READY",
        a2aTrace,
        agentMode: state.mode,
        modeChange: state.mode,
        kbStatus,
        questionFp: qFp
      });
    }
    return S.baseResult({
      shouldIntervene: true,
      interventionText: "我在，请讲。",
      reason: "WAKE_ACK",
      skipQueue: true,
      a2aTrace,
      agentMode: state.mode,
      modeChange: state.mode,
      kbStatus,
      questionFp: qFp
    });
  }
  // 有实质问题：已切 HA_*，落入 consult
  return null;
}

module.exports = { handle, name: "wake" };
