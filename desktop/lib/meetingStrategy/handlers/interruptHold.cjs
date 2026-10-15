const S = require("./kit.cjs");

/**
 * INTERRUPT / CONTINUE / HOLD / 我说完了
 * 可改写 ctx.lastFloor 后返回 null（落入后续咨询 Handler）
 */
async function handle(ctx) {
  const { cmd, state, opts, a2aTrace, kbStatus, qFp } = ctx;
  let { lastFloor } = ctx;

  if (cmd.command === "INTERRUPT" || (cmd.interrupt && cmd.holdToEnd)) {
    state.holdToEnd = false;
    state.interrupted = false;
    state.interruptAt = Date.now();
    state.interruptBuffer = null;
    state.holdFloorLines = [];
    state.listenNotes = [];
    state.haLockedUntil = 0;
    S.setMode(state, S.INTERACTION_MODE.IDLE_LISTEN);
    S.setLifecycle(state, state.meetingOpen ? S.MEETING_LIFE.SILENT : S.MEETING_LIFE.OFF);
    S.debugLog.info("Strategy", "听我说：停口播并旁听", {
      floor: lastFloor.slice(0, 40)
    });
    return S.baseResult({
      shouldIntervene: false,
      reason: "INTERRUPT",
      interruptTts: true,
      a2aTrace,
      agentMode: state.mode,
      modeChange: S.INTERACTION_MODE.IDLE_LISTEN,
      kbStatus,
      meetingLifecycle: S.deriveMeetingLife(state)
    });
  }

  if (cmd.command === "CONTINUE" || cmd.continueSpeak) {
    state.holdToEnd = false;
    const wasHold = state.interrupted;
    state.interrupted = false;
    const holdNote = (state.holdFloorLines || []).join("").trim();
    state.holdFloorLines = [];
    const leftover = String(
      state.interruptBuffer?.fullText || state.lastInterruptedText || opts.lastHostSpeakText || ""
    ).trim();
    state.interruptBuffer = null;
    let floorNote = S.peelWakePayload(lastFloor)
      .replace(/^(请继续|你继续|接着说|继续说|继续答|继续讲)[，,。.\s]*/g, "")
      .trim();
    if (/^(请继续|你继续|接着说|继续)[。.!！？?\s]*$/.test(floorNote)) floorNote = "";

    const reask = (holdNote.length >= 8 ? holdNote : "") || (floorNote.length >= 8 ? floorNote : "");
    if (reask) {
      S.setMode(state, S.INTERACTION_MODE.HA_ASK);
      S.setLifecycle(state, S.MEETING_LIFE.CONSULT);
      ctx.lastFloor = reask;
      ctx.continuePayload = reask;
      S.debugLog.info("Strategy", "请继续：按打断后补充重答", {
        sticky: true,
        until: state.haLockedUntil,
        payload: reask.slice(0, 40)
      });
      return null;
    }
    if (wasHold && leftover) {
      S.setMode(state, S.isConsultMode(state.mode) ? state.mode : S.INTERACTION_MODE.HA_ASK);
      S.setLifecycle(state, S.MEETING_LIFE.CONSULT);
      S.debugLog.info("Strategy", "请继续：续播上一答", { leftover: leftover.slice(0, 40) });
      return S.playAnswer(leftover, "CONTINUE", state, a2aTrace, kbStatus, qFp, "cache", {
        cacheQuestion: leftover.slice(0, 40)
      });
    }
    S.setMode(state, S.INTERACTION_MODE.HA_ASK);
    S.setLifecycle(state, S.MEETING_LIFE.CONSULT);
    S.debugLog.info("Strategy", "请继续：无缓冲，短确认", { sticky: true });
    return S.baseResult({
      shouldIntervene: true,
      interventionText: S.CONTINUE_SCRIPT,
      reason: "CONTINUE",
      a2aTrace,
      agentMode: state.mode,
      kbStatus,
      meetingLifecycle: S.MEETING_LIFE.CONSULT
    });
  }

  if (cmd.command === "CONTINUE_HH") {
    S.setMode(state, S.INTERACTION_MODE.HH);
    return S.baseResult({
      shouldIntervene: true,
      interventionText: "好，你们继续，我旁听。",
      reason: "CONTINUE_HH",
      a2aTrace,
      agentMode: state.mode,
      modeChange: S.INTERACTION_MODE.HH,
      kbStatus
    });
  }

  if (state.holdToEnd && !cmd.sayDone) {
    const note = String(S.peelWakePayload(lastFloor) || lastFloor || "").trim();
    if (note.length >= 2 && note.length < 160) {
      if (!Array.isArray(state.holdFloorLines)) state.holdFloorLines = [];
      const prev = state.holdFloorLines[state.holdFloorLines.length - 1] || "";
      if (note !== prev) {
        state.holdFloorLines.push(note.slice(0, 120));
        if (state.holdFloorLines.length > 8) state.holdFloorLines.shift();
      }
      S.debugLog.info("Strategy", "打断中收听补充", { note: note.slice(0, 40), n: state.holdFloorLines.length });
    }
    return S.baseResult({ reason: "HOLDING", a2aTrace, agentMode: state.mode, kbStatus, holdToEnd: true });
  }

  if (cmd.sayDone && state.holdToEnd) {
    state.holdToEnd = false;
    const holdNote = (state.holdFloorLines || []).join("").trim();
    state.holdFloorLines = [];
    if (holdNote.length >= 8) {
      state.interrupted = false;
      ctx.lastFloor = holdNote;
      S.setMode(state, S.INTERACTION_MODE.HA_ASK);
      S.debugLog.info("Strategy", "我说完了：按补充作答", { payload: holdNote.slice(0, 40) });
      return null;
    }
    const leftover = String(
      state.interruptBuffer?.fullText || state.lastInterruptedText || opts.lastHostSpeakText || ""
    ).trim();
    state.interrupted = false;
    state.interruptBuffer = null;
    if (leftover) {
      S.setMode(state, S.isConsultMode(state.mode) ? state.mode : S.INTERACTION_MODE.HA_ASK);
      return S.playAnswer(leftover, "CONTINUE", state, a2aTrace, kbStatus, qFp, "cache", {
        cacheQuestion: leftover.slice(0, 40)
      });
    }
  } else if (cmd.sayDone) {
    state.holdToEnd = false;
  }

  return null;
}

module.exports = { handle, name: "interruptHold" };
