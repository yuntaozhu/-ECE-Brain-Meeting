/**
 * 大智对话回归（无麦克风）。默认不跑经营/深度，避免调 Chat。
 *   node scripts/eval-dialog.cjs
 *   node scripts/eval-dialog.cjs --only price-glue
 *   node scripts/eval-dialog.cjs --file knowledge/eval-p0-long.json
 */
const fs = require("fs");
const path = require("path");

const rootEnv = path.join(__dirname, "..", "..", ".env");
const deskEnv = path.join(__dirname, "..", ".env");
require("dotenv").config({ path: fs.existsSync(rootEnv) ? rootEnv : deskEnv });

const { createMeetingSession } = require("../lib/meetingSession");
const { runMeetingAnalysis, DEFAULT_AGENDA } = require("../lib/meetingStrategy");

const only = (() => {
  const i = process.argv.indexOf("--only");
  return i >= 0 ? process.argv[i + 1] : "";
})();
const fileArg = (() => {
  const i = process.argv.indexOf("--file");
  return i >= 0 ? process.argv[i + 1] : "";
})();

function includesAny(text, arr) {
  const t = String(text || "");
  return (arr || []).some((x) => t.includes(x));
}
function includesNone(text, arr) {
  const t = String(text || "");
  return (arr || []).every((x) => !t.includes(x));
}

function check(row, r) {
  const e = row.expect || {};
  const answer = String(r.interventionText || r.fullAnswer || "");
  const fails = [];
  if (e.reasonAny?.length && !e.reasonAny.includes(r.reason)) {
    fails.push(`reason=${r.reason} not in ${e.reasonAny.join("|")}`);
  }
  if (e.modeAny?.length && !e.modeAny.includes(r.agentMode)) {
    fails.push(`mode=${r.agentMode}`);
  }
  if (e.answerIncludesAny?.length && !includesAny(answer, e.answerIncludesAny)) {
    fails.push(`missing any of: ${e.answerIncludesAny.join("|")}`);
  }
  if (e.answerIncludesAll?.length) {
    const miss = e.answerIncludesAll.filter((x) => !String(answer || "").includes(x));
    if (miss.length) fails.push(`missing all of: ${miss.join("|")}`);
  }
  if (e.answerForbids?.length && !includesNone(answer, e.answerForbids)) {
    fails.push("hit forbid");
  }
  return fails;
}

async function main() {
  const file = fileArg
    ? path.resolve(path.join(__dirname, ".."), fileArg)
    : path.join(__dirname, "..", "knowledge", "eval-dialog.json");
  let rows = JSON.parse(fs.readFileSync(file, "utf8"));
  if (only) rows = rows.filter((r) => r.id === only);
  const state = createMeetingSession(`eval_${Date.now()}`);
  let lastHost = "";
  let lastHostAt = 0;
  let pass = 0;

  for (const row of rows) {
    if (row.setup?.lastHostSpeakText) {
      lastHost = row.setup.lastHostSpeakText;
      lastHostAt = Date.now() - 8000;
    }
    const transcript = [lastHost ? `大智: ${lastHost}` : "", `会场: ${row.input}`]
      .filter(Boolean)
      .join("\n");
    const r = await runMeetingAnalysis(transcript, DEFAULT_AGENDA, {
      agentState: state,
      lastHostSpeakText: lastHost,
      lastHostSpeakAt: lastHostAt,
      trigger: "wake",
      quietMs: 3000
    });
    const fails = check(row, r);
    const ok = fails.length === 0;
    if (ok) pass += 1;
    const spoken = String(r.interventionText || r.fullAnswer || "");
    const answer = spoken.replace(/\s+/g, " ").slice(0, 90);
    console.log(`${ok ? "PASS" : "FAIL"} ${row.id} reason=${r.reason} ark=${r.arkMode}`);
    console.log(`  ${answer}`);
    if (!ok) console.log(`  ${fails.join("; ")}`);
    if (r.shouldIntervene && spoken) {
      lastHost = spoken;
      lastHostAt = Date.now();
    }
  }
  console.log(`[eval-dialog] ${pass}/${rows.length}`);
  process.exit(pass === rows.length ? 0 : 2);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
