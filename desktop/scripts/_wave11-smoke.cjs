/**
 * Wave 11 smoke — handlers kit + 文档入口
 */
const fs = require("fs");
const path = require("path");
const kit = require("../lib/meetingStrategy/handlers/kit.cjs");
const { HANDLERS } = require("../lib/meetingStrategy/pipeline.cjs");
const strategy = require("../lib/meetingStrategy");
const { createMeetingSession } = require("../lib/meetingSession");

if (!kit.INTERACTION_MODE || kit.INTERACTION_MODE.HA_ASK !== "HA_ASK") {
  throw new Error("kit INTERACTION_MODE");
}
if (typeof kit.baseResult !== "function" || typeof kit.runSummaryPath !== "function") {
  throw new Error("kit exports incomplete");
}

for (const h of HANDLERS) {
  if (h.name === "consult") continue;
  const src = fs.readFileSync(
    path.join(__dirname, `../lib/meetingStrategy/handlers/${h.name}.cjs`),
    "utf8"
  );
  if (/internal\/support\.cjs/.test(src)) {
    throw new Error(`${h.name} still requires support`);
  }
  if (!/kit\.cjs/.test(src) && h.name !== "consult") {
    throw new Error(`${h.name} missing kit`);
  }
}

const readme = fs.readFileSync(path.join(__dirname, "../knowledge/README.md"), "utf8");
if (!/lib\/meetingStrategy\//.test(readme)) throw new Error("README missing meetingStrategy");

async function main() {
  const state = createMeetingSession("w11");
  const r = await strategy.runMeetingAnalysis("会场：大智，会议主题是什么？", strategy.DEFAULT_AGENDA, {
    agentState: state,
    trigger: "wake"
  });
  if (!r.shouldIntervene) throw new Error("theme failed " + r.reason);
  console.log("WAVE11_OK handlers-kit");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
