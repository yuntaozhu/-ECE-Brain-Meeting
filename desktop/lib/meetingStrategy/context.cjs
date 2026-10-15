/**
 * AnalysisContext — 单轮巡检上下文（Handler 链共享可变状态）
 */
const {
  DEFAULT_AGENDA,
  knowledgeStatus,
  extractFloorLines,
  normalizeDazhiAliases,
  detectMeetingCommand,
  questionFingerprint,
  debugLog
} = require("./internal/deps.cjs");

function buildAnalysisContext(recentTranscript, currentAgenda, opts = {}) {
  const a2aTrace = [];
  const transcript = (recentTranscript || "").trim();
  const agenda = currentAgenda || DEFAULT_AGENDA;
  const kbStatus = knowledgeStatus();
  // main 传 meetingState；脚本/旧调用仍可能传 agentState
  const state = opts.agentState || opts.meetingState || null;

  const floors = extractFloorLines(transcript, 4).map((l) => normalizeDazhiAliases(l));
  let lastFloor =
    floors[floors.length - 1] || normalizeDazhiAliases(transcript.split("\n").pop() || "");
  if (lastFloor.length > 80) {
    const parts = lastFloor.split(/[。！？!?；;]/).map((p) => p.trim()).filter(Boolean);
    const tail = parts.slice(-2).join("。");
    if (tail && tail.length >= 4) lastFloor = tail;
  }

  return {
    transcript,
    agenda,
    opts,
    state,
    a2aTrace,
    kbStatus,
    floors,
    lastFloor,
    continuePayload: "",
    cmd: null,
    qFp: null,
    sinceHostMs: opts.lastHostSpeakAt ? Date.now() - opts.lastHostSpeakAt : null,
    lastHostText: String(opts.lastHostSpeakText || "").trim()
  };
}

function attachCommand(ctx) {
  ctx.cmd = detectMeetingCommand(ctx.lastFloor);
  ctx.qFp = questionFingerprint(ctx.lastFloor);
  debugLog.info("Strategy", "策略快照", {
    mode: ctx.state.mode,
    command: ctx.cmd.command,
    lastFloor: ctx.lastFloor.slice(0, 80),
    segmentId: ctx.state.segmentId,
    objectionLevel: ctx.state.objectionLevel,
    trigger: ctx.opts.trigger
  });
  const { pushAgent } = require("./agent/events.cjs");
  pushAgent(ctx.a2aTrace, {
    role: "Gate",
    action: "MODE_SNAPSHOT",
    summary: `mode=${ctx.state.mode} cmd=${ctx.cmd.command || "-"}`,
    detail: {
      mode: ctx.state.mode,
      command: ctx.cmd.command,
      segmentId: ctx.state.segmentId
    }
  });
  return ctx;
}

module.exports = {
  buildAnalysisContext,
  attachCommand
};
