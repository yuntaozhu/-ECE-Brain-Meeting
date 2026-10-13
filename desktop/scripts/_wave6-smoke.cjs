/**
 * Wave 6 smoke — meetingStrategy 引擎入口
 */
const strategy = require("../lib/meetingStrategy");
const { createMeetingSession } = require("../lib/meetingSession");

async function main() {
  if (typeof strategy.runMeetingAnalysis !== "function") throw new Error("runMeetingAnalysis");
  console.log("facade ok");

  const state = createMeetingSession("w6");
  const r = await strategy.runMeetingAnalysis("会场：大智，怎么收费？", strategy.DEFAULT_AGENDA, {
    agentState: state,
    trigger: "wake"
  });
  if (!r.shouldIntervene || !/三万九|服务价|收费/.test(r.interventionText || "")) {
    throw new Error(
      "price answer failed: " +
        JSON.stringify({
          reason: r.reason,
          text: r.interventionText,
          ark: r.arkMode
        })
    );
  }
  console.log("price via engine ok", r.reason, r.arkMode);

  const stop = await strategy.runMeetingAnalysis("会场：谢谢大智。", strategy.DEFAULT_AGENDA, {
    agentState: state,
    trigger: "wake"
  });
  if (stop.reason !== "STOP") throw new Error("STOP failed " + stop.reason);
  console.log("STOP ok");
  console.log("WAVE6_OK");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
