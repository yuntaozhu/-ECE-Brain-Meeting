/**
 * meetingStrategy/engine — 策略引擎入口（Handler 责任链）
 * 与开源 KaibanJS 无关。
 */
const { debugLog, DEFAULT_AGENDA, knowledgeStatus, AGENT_MODE, INTERACTION_MODE } = require("./internal/deps.cjs");
const { baseResult } = require("./internal/result.cjs");
const { THINKING_FILLER } = require("./internal/scripts.cjs");
const { arkChat } = require("./llm");
const { buildAnalysisContext, attachCommand } = require("./context.cjs");
const { HANDLERS } = require("./pipeline.cjs");
const { semanticStatus } = require("../knowledge");

const { hasLlmKey, llmProviderStatus } = require("./llm/providers/resolve.cjs");

function hasArkKey() {
  return hasLlmKey();
}

/**
 * @param {string} recentTranscript
 * @param {string} currentAgenda
 * @param {object} opts
 */
async function runMeetingAnalysis(recentTranscript, currentAgenda, opts = {}) {
  const ctx = buildAnalysisContext(recentTranscript, currentAgenda, opts);
  if (!ctx.state) {
    debugLog.error("Strategy", "缺少 meetingState/agentState");
    return baseResult({ reason: "NO_STATE", a2aTrace: ctx.a2aTrace, kbStatus: ctx.kbStatus });
  }

  // 回声先判；未命中再挂口令。pipeline 内仍保留 echoSkip 作为兜底。
  for (const h of HANDLERS) {
    if (h.name === "echoSkip") {
      const echoResult = await h.handle(ctx);
      if (echoResult) return echoResult;
      attachCommand(ctx);
      continue;
    }
    const result = await h.handle(ctx);
    if (result) return result;
  }

  return baseResult({
    reason: "OK",
    a2aTrace: ctx.a2aTrace,
    agentMode: ctx.state.mode,
    interactionMode: ctx.state.mode,
    kbStatus: ctx.kbStatus
  });
}

module.exports = {
  runMeetingAnalysis,
  hasArkKey,
  hasLlmKey,
  llmProviderStatus,
  arkChat,
  DEFAULT_AGENDA,
  knowledgeStatus,
  THINKING_FILLER,
  /** @deprecated 请用 INTERACTION_MODE */
  AGENT_MODE,
  INTERACTION_MODE: INTERACTION_MODE || AGENT_MODE,
  semanticStatus
};
