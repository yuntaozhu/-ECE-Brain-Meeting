/**
 * paths/consultPath — HA 粘滞咨询作答编排
 *
 * 子策略：gate → rewritePrepare → localAnswer → bizAnswer → llmAnswer
 */
const S = require("./consult/kit.cjs");
const { handleGate } = require("./consult/gate.cjs");
const { prepareAsk } = require("./consult/rewritePrepare.cjs");
const { tryLocalAnswer } = require("./consult/localAnswer.cjs");
const { tryBizAnswer } = require("./consult/bizAnswer.cjs");
const { runLlmAnswer } = require("./consult/llmAnswer.cjs");

async function handleConsult(ctx) {
  const { state, agenda } = ctx;
  if (
    state.mode !== S.INTERACTION_MODE.HA_ASK &&
    state.mode !== S.INTERACTION_MODE.HA_TALK &&
    state.mode !== S.INTERACTION_MODE.HA_BIZ
  ) {
    return null;
  }

  S.ensureMeetingOpen(state, agenda);

  const gated = handleGate(ctx);
  if (gated) return gated;

  const prepared = prepareAsk(ctx);
  if (prepared) return prepared;

  const local = tryLocalAnswer(ctx);
  if (local) return local;

  const biz = tryBizAnswer(ctx);
  if (biz) return biz;

  return await runLlmAnswer(ctx);
}

module.exports = { handleConsult };
