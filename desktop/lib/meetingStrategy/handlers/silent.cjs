const S = require("./kit.cjs");

async function handle(ctx) {
  const { state, a2aTrace, kbStatus, lastFloor } = ctx;
  if (S.isSilentMode(state.mode)) {
    S.debugLog.info("Strategy", "静默只收听", {
      mode: state.mode,
      floor: lastFloor.slice(0, 40)
    });
    return S.baseResult({
      reason: "SILENT_LISTEN",
      a2aTrace,
      agentMode: state.mode,
      kbStatus,
      wake: { lastFloor, silent: true }
    });
  }
  return S.baseResult({ reason: "OK", a2aTrace, agentMode: state.mode, kbStatus });
}

module.exports = { handle, name: "silent" };
