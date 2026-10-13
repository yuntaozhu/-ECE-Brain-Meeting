const S = require("./kit.cjs");

async function handle(ctx) {
  const { cmd, state, agenda, opts, a2aTrace, kbStatus } = ctx;
  if (cmd.command === "SUMMARY") {
    return await S.runSummaryPath(state, agenda, opts, a2aTrace, kbStatus, true);
  }
  if (
    cmd.command === "CONFIRM_SUMMARY" ||
    (state.summaryPendingConfirm && /要总结|需要|总结吧|可以/.test(cmd.text))
  ) {
    state.summaryPendingConfirm = false;
    return await S.runSummaryPath(state, agenda, opts, a2aTrace, kbStatus, true);
  }
  return null;
}

module.exports = { handle, name: "summary" };
