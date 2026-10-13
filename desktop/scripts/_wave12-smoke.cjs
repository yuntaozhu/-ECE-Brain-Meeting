/**
 * Wave 12 smoke — consult/engine/context 脱离 support
 */
const fs = require("fs");
const path = require("path");
const strategy = require("../lib/meetingStrategy");
const { createMeetingSession } = require("../lib/meetingSession");

const root = path.join(__dirname, "../lib/meetingStrategy");
const mustNotSupport = [
  "engine.cjs",
  "context.cjs",
  "paths/consultPath.cjs",
  "paths/consult/gate.cjs",
  "paths/consult/rewritePrepare.cjs",
  "paths/consult/localAnswer.cjs",
  "paths/consult/bizAnswer.cjs",
  "paths/consult/llmAnswer.cjs"
];
for (const rel of mustNotSupport) {
  const src = fs.readFileSync(path.join(root, rel), "utf8");
  if (/internal\/support\.cjs/.test(src)) throw new Error(`${rel} still requires support`);
}

const kit = require("../lib/meetingStrategy/paths/consult/kit.cjs");
if (!kit.INTERACTION_MODE || typeof kit.speakViaChat !== "function") {
  throw new Error("consult kit incomplete");
}

async function main() {
  const state = createMeetingSession("w12");
  const r = await strategy.runMeetingAnalysis("会场：大智，怎么收费？", strategy.DEFAULT_AGENDA, {
    agentState: state,
    trigger: "wake"
  });
  if (!r.shouldIntervene || !/三万九|收费|万元/.test(r.interventionText || "")) {
    throw new Error("price failed " + JSON.stringify({ reason: r.reason, t: r.interventionText }));
  }
  if (!r.interactionMode) throw new Error("missing interactionMode");
  console.log("WAVE12_OK consult-kit", r.reason);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
