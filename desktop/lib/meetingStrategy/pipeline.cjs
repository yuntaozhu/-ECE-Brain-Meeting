/**
 * Handler 责任链：按固定顺序匹配，首个非 null 结果即返回。
 * Handler 可通过改写 ctx.lastFloor 后 return null 实现 fallthrough。
 */
const HANDLERS = [
  require("./handlers/echoSkip.cjs"),
  require("./handlers/modeControl.cjs"),
  require("./handlers/meetingLife.cjs"),
  require("./handlers/interruptHold.cjs"),
  require("./handlers/wake.cjs"),
  require("./handlers/summary.cjs"),
  require("./handlers/consult.cjs"),
  require("./handlers/silent.cjs")
];

async function runHandlerPipeline(ctx) {
  for (const h of HANDLERS) {
    const result = await h.handle(ctx);
    if (result) return result;
  }
  return null;
}

module.exports = {
  HANDLERS,
  runHandlerPipeline
};
