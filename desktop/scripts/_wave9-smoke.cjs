/**
 * Wave 9 smoke — IPC/结果字段命名（strategy / session，无 kaiban 通道名）
 */
const fs = require("fs");
const path = require("path");
const strategy = require("../lib/meetingStrategy");
const { createMeetingSession } = require("../lib/meetingSession");
const { baseResult, playAnswer } = require("../lib/meetingStrategy/internal/result.cjs");

const mainSrc = fs.readFileSync(path.join(__dirname, "../main.cjs"), "utf8");
const preloadSrc = fs.readFileSync(path.join(__dirname, "../preload.cjs"), "utf8");

if (!/strategy:evaluate/.test(mainSrc)) throw new Error("main missing strategy:evaluate");
if (/kaiban:evaluate/.test(mainSrc)) throw new Error("kaiban:evaluate still registered");
if (!/session:mode/.test(mainSrc)) throw new Error("main missing session:mode");
if (/ipcMain\.handle\("agent:mode"/.test(mainSrc)) throw new Error("agent:mode ipc still registered");
if (!/strategyAbort/.test(mainSrc)) throw new Error("main missing strategyAbort");
if (/kaibanAbort/.test(mainSrc)) throw new Error("kaibanAbort still present");
if (!/let meetingState/.test(mainSrc)) throw new Error("main missing meetingState");
if (/\bagentState\b/.test(mainSrc)) throw new Error("agentState still present");
if (!/interaction-mode/.test(mainSrc)) throw new Error("main missing interaction-mode event");

if (!/strategyEvaluate/.test(preloadSrc)) throw new Error("preload missing strategyEvaluate");
if (/kaibanEvaluate/.test(preloadSrc)) throw new Error("preload still exposes kaibanEvaluate");
if (!/interactionMode/.test(preloadSrc)) throw new Error("preload missing interactionMode");
if (/agentMode:/.test(preloadSrc)) throw new Error("preload still exposes agentMode");

const br = baseResult({ reason: "TEST", agentMode: "HA_ASK" });
if (br.interactionMode !== "HA_ASK" || br.agentMode !== "HA_ASK") {
  throw new Error("baseResult interactionMode mirror");
}

const state = createMeetingSession("w9");
state.mode = "HA_TALK";
const pr = playAnswer("测试一句。", "TEST", state, [], {}, "", "template");
if (pr.interactionMode !== "HA_TALK" || pr.agentMode !== "HA_TALK") {
  throw new Error("playAnswer interactionMode");
}

async function main() {
  const st = createMeetingSession("w9b");
  const r = await strategy.runMeetingAnalysis("会场：谢谢大智。", strategy.DEFAULT_AGENDA, {
    agentState: st,
    trigger: "wake"
  });
  if (!r.agentMode || r.interactionMode !== r.agentMode) {
    throw new Error("analysis missing interactionMode " + JSON.stringify({ a: r.agentMode, i: r.interactionMode }));
  }
  console.log("WAVE9_OK ipc+fields");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
