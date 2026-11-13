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
const { handleDialogueMeta } = require("../../intelligence/dialogueMeta.cjs");

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

  // Wave R9a：Dialogue-Meta（口令归 duplex；粘滞 gate 未命中时补会话元，拦 FAQ 越权）
  const metaHit = await handleDialogueMeta(ctx);
  if (metaHit) return metaHit;

  const prepared = await prepareAsk(ctx);
  if (prepared) return prepared;

  const { speakResult } = await evaluateConsult(ctx);
  return speakResult;
}

module.exports = { handleConsult };
