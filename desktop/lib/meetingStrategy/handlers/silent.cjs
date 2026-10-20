const S = require("./kit.cjs");
const { rx } = require("../../knowledge/schemaStore.cjs");
const { shouldSteerOffTopic } = require("../../meetingSession");
const { STEER_MAX_PER_SEGMENT, STEER_COOLDOWN_MS } = require("../../meetingSession/constants.cjs");
const { agendaRedirectLine } = require("../internal/scripts.cjs");

async function handle(ctx) {
  const { state, a2aTrace, kbStatus, lastFloor, agenda } = ctx;
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

    // 聆听态：连续偏离议程才拉回一次，说完仍静默
    const named = /大智|大致|李老师/.test(note);
    if (!named && note.length >= 8) {
      const steer = shouldSteerOffTopic(note, agenda || state.agenda || "");
      const weakStreak = Number(state.offTopicStreak || 0);
      const nextStreak = steer.steer || steer.weak ? weakStreak + 1 : 0;
      state.offTopicStreak = nextStreak;
      const now = Date.now();
      const cooled = now - (state.lastSteerAt || 0) >= STEER_COOLDOWN_MS;
      const underCap = Number(state.steerCount || 0) < STEER_MAX_PER_SEGMENT;
      if ((steer.steer || nextStreak >= 2) && cooled && underCap) {
        state.lastSteerAt = now;
        state.steerCount = Number(state.steerCount || 0) + 1;
        state.offTopicStreak = 0;
        const line = agendaRedirectLine(agenda || state.agenda || "");
        S.debugLog.info("Strategy", "聆听偏离，拉回议程", {
          floor: note.slice(0, 40),
          reason: steer.reason,
          steerCount: state.steerCount
        });
        return S.baseResult({
          shouldIntervene: true,
          interventionText: line,
          fullAnswer: line,
          reason: "STEER",
          a2aTrace,
          agentMode: state.mode,
          kbStatus,
          wake: { lastFloor, silent: true, steer: true }
        });
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
