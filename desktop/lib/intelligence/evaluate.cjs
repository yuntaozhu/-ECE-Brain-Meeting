/**
 * Wave R / 方案 C：咨询编排入口。
 * 不重写 decideSpeak；串联 localAnswer →（放行）MeetingAgent，并保证 IntelligenceResult 写回。
 */
const { tryLocalAnswer } = require("../meetingStrategy/paths/consult/localAnswer.cjs");
const { oralizeCommitted } = require("../meetingStrategy/paths/consult/oralize.cjs");
const { runMeetingAgent } = require("../meetingStrategy/agent/index.cjs");
const { GATES } = require("./contract.cjs");
const { commitDraft, writeLastIntelligence, makeSpeakDraft } = require("./draft.cjs");

function speakTextOf(result) {
  return String(
    (result && (result.interventionText || result.fullAnswer || result.spokenPrefix)) || ""
  ).trim();
}

/**
 * 若下游未写 Intelligence，用口播结果补一版（兼容旧路径）。
 */
function ensureIntelligence(state, speakResult, path) {
  if (!state) return null;
  if (state.lastIntelligence?.draft?.text) return state.lastIntelligence;
  if (state.lastIntelligence?.gate === GATES.AGENT && state.lastIntelligence?.debug?.releasedToAgent) {
    return state.lastIntelligence;
  }
  const text = speakTextOf(speakResult);
  if (text && speakResult && speakResult.shouldIntervene !== false) {
    commitDraft(state, {
      text,
      arkMode: speakResult.arkMode || path || "",
      title: speakResult.speakTitle || "",
      card: {
        title: speakResult.speakTitle || "",
        speak: text
      }
    });
  } else if (speakResult && !text && state.lastIntelligence?.debug?.releasedToAgent) {
    writeLastIntelligence(state, {
      gate: GATES.SKIP,
      card: state.lastIntelligence.card || null,
      draft: null,
      debug: { releasedToAgent: true, reason: "empty_after_agent" }
    });
  }
  return state.lastIntelligence || null;
}

/**
 * @param {object} ctx consult 上下文（已 prepareAsk）
 * @returns {Promise<{ speakResult: object, intelligence: object|null, path: string }>}
 */
async function evaluateConsult(ctx) {
  const local = tryLocalAnswer(ctx);
  let speakResult;
  let path = "local";
  if (local) {
    speakResult = await oralizeCommitted(local, ctx);
  } else {
    path = "agent";
    speakResult = await runMeetingAgent(ctx);
  }
  const intelligence = ensureIntelligence(ctx.state, speakResult, path);
  if (intelligence && !intelligence.variants && intelligence.draft?.text) {
    intelligence.variants = {
      push_forward: intelligence.draft.text,
      push_back: "",
      counter_inquiry: ""
    };
  }
  return { speakResult, intelligence, path };
}

/**
 * 只读快照：当前 state 上的智能层结果。
 */
function peekIntelligence(state) {
  if (!state) return null;
  return state.lastIntelligence || null;
}

module.exports = {
  evaluateConsult,
  ensureIntelligence,
  peekIntelligence,
  makeSpeakDraft,
  GATES
};
