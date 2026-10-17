const S = require("./kit.cjs");
const { rx } = require("../../knowledge/schemaStore.cjs");

async function handle(ctx) {
  const { state, a2aTrace, kbStatus, lastFloor } = ctx;
  if (S.isSilentMode(state.mode)) {
    const note = String(lastFloor || "").trim();
    if (note.length >= 4 && !rx("operators", "silentSkip").test(note)) {
      if (!Array.isArray(state.listenNotes)) state.listenNotes = [];
      const prev = state.listenNotes[state.listenNotes.length - 1] || "";
      if (note !== prev) {
        state.listenNotes.push(note.slice(0, 120));
        if (state.listenNotes.length > 12) state.listenNotes.shift();
      }
    }
    S.debugLog.info("Strategy", "静默只收听", {
      mode: state.mode,
      floor: lastFloor.slice(0, 40),
      notes: (state.listenNotes || []).length
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
