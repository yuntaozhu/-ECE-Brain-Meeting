/**
 * paths/consultPath — HA 粘滞咨询作答编排
 *
 * Wave R Phase 4：gate → rewritePrepare → intelligence.evaluateConsult
 * （localAnswer 定卡 / 放行 Agent；写 SpeakDraft；不重写 decideSpeak）
 */
const S = require("./consult/kit.cjs");
const { handleGate } = require("./consult/gate.cjs");
const { prepareAsk } = require("./consult/rewritePrepare.cjs");
const { evaluateConsult } = require("../../intelligence/evaluate.cjs");

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

  const prepared = await prepareAsk(ctx);
  if (prepared) return prepared;

  const { speakResult } = await evaluateConsult(ctx);
  return speakResult;
}

module.exports = { handleConsult };
