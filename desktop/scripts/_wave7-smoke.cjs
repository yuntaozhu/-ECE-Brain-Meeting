/**
 * Wave 7 smoke — Handler 链 + query/advisors
 */
const strategy = require("../lib/meetingStrategy");
const { createMeetingSession } = require("../lib/meetingSession");

if (!strategy.query || typeof strategy.query.rewriteQueryRuleBased !== "function") {
  throw new Error("strategy.query missing");
}
if (!strategy.advisors || typeof strategy.advisors.runBusinessAdvisor !== "function") {
  throw new Error("strategy.advisors missing");
}
if (typeof strategy.advisors.isOperateQuestion !== "function") {
  throw new Error("advisors.isOperateQuestion missing");
}
console.log("query + advisors ok");

const { HANDLERS } = require("../lib/meetingStrategy/pipeline.cjs");
const names = HANDLERS.map((h) => h.name);
const expect = [
  "echoSkip",
  "modeControl",
  "meetingLife",
  "interruptHold",
  "wake",
  "summary",
  "consult",
  "silent"
];
if (names.join(",") !== expect.join(",")) {
  throw new Error("handler order " + names.join(","));
}
console.log("handler chain", names.join(" → "));

async function main() {
  const state = createMeetingSession("w7");
  const r = await strategy.runMeetingAnalysis("会场：大智，会议主题是什么？", strategy.DEFAULT_AGENDA, {
    agentState: state,
    trigger: "wake"
  });
  if (!r.shouldIntervene || !/主题|全园美语/.test(r.interventionText || "")) {
    throw new Error("theme failed " + JSON.stringify({ reason: r.reason, t: r.interventionText }));
  }
  console.log("theme ok", r.reason);
  console.log("WAVE7_OK");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
