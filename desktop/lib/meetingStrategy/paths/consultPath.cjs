/**
 * paths/consultPath — HA 粘滞咨询作答编排
 *
 * P1：gate → rewritePrepare → localAnswer(高置信秒答) → MeetingAgent.run
 * （不再用关键词闸门决定能不能答；议程菜单不作默认兜底）
 */
const S = require("./consult/kit.cjs");
const { handleGate } = require("./consult/gate.cjs");
const { prepareAsk } = require("./consult/rewritePrepare.cjs");
const { tryLocalAnswer } = require("./consult/localAnswer.cjs");
const { oralizeCommitted } = require("./consult/oralize.cjs");
const { runMeetingAgent } = require("../agent/index.cjs");

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

  const local = tryLocalAnswer(ctx);
  if (local) return await oralizeCommitted(local, ctx);

  return await runMeetingAgent(ctx);
}

module.exports = { handleConsult };
