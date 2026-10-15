/**
 * 渲染端同步策略 API：复用 meetingSession / duplex，避免 UI 再抄一份。
 */
const {
  displayCorrectAsr,
  looksLikeBargeInCommand,
  shouldImmediatePatrolForUi
} = require("../lib/meetingSession");
const { looksLikeHostEcho, estimateHoldMs } = require("../lib/duplex");

/**
 * @param {import('electron').IpcMain} ipcMain
 */
function registerPolicyIpc(ipcMain) {
  ipcMain.on("policy:sync", (event, req) => {
    const op = req?.op;
    const args = req?.args || {};
    try {
      let value;
      switch (op) {
        case "displayCorrectAsr":
          value = displayCorrectAsr(args.text);
          break;
        case "looksLikeBargeIn":
          value = looksLikeBargeInCommand(args.text);
          break;
        case "looksLikeHostEcho":
          value = looksLikeHostEcho(args.text, args.recentHostUtterances || [], {
            sinceHostMs: args.sinceHostMs
          });
          break;
        case "shouldImmediatePatrol":
          value = shouldImmediatePatrolForUi(args.text, {
            mode: args.mode,
            duplexPhase: args.duplexPhase,
            recentHostUtterances: args.recentHostUtterances,
            lastWakeSpeakAt: args.lastWakeSpeakAt
          });
          break;
        case "estimateHoldMs":
          value = estimateHoldMs(args.text, { chunks: args.chunks });
          break;
        default:
          throw new Error("unknown policy op: " + op);
      }
      event.returnValue = { ok: true, value };
    } catch (err) {
      event.returnValue = { ok: false, error: String(err?.message || err), value: null };
    }
  });
}

module.exports = { registerPolicyIpc };
