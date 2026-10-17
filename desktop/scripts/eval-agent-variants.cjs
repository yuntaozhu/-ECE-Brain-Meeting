/**
 * Agent 口语变体评测 — intent + 禁止子串 + 知识锚点
 *   node scripts/eval-agent-variants.cjs
 *   node scripts/eval-agent-variants.cjs --live   # 允许调豆包（较慢）
 */
const fs = require("fs");
const path = require("path");

const rootEnv = path.join(__dirname, "..", "..", ".env");
const deskEnv = path.join(__dirname, "..", ".env");
require("dotenv").config({ path: fs.existsSync(rootEnv) ? rootEnv : deskEnv });

const live = process.argv.includes("--live");
if (!live) {
  // 强制走本地 Understand 规则 + 软兜底，验证「亏损≠第二条路」
  process.env.DOUBAO_API_KEY = "";
  process.env.ARK_API_KEY = "";
}

const { createMeetingSession } = require("../lib/meetingSession");
const { runMeetingAnalysis, DEFAULT_AGENDA } = require("../lib/meetingStrategy");
const { chatFallbackFor } = require("../lib/meetingStrategy/llm/fallback.cjs");
const { ruleUnderstand } = require("../lib/meetingStrategy/agent/intent.cjs");

const file = path.join(__dirname, "..", "knowledge", "eval-agent-variants.json");
const rows = JSON.parse(fs.readFileSync(file, "utf8"));

function includesAny(text, arr) {
  const t = String(text || "");
  return (arr || []).some((x) => t.includes(x));
}
function includesNone(text, arr) {
  const t = String(text || "");
  return (arr || []).every((x) => !t.includes(x));
}
function includesAll(text, arr) {
  const t = String(text || "");
  return (arr || []).every((x) => t.includes(x));
}

async function main() {
  console.log(`[eval-agent-variants] live=${live} cases=${rows.length}`);
  let pass = 0;
  const state = createMeetingSession(`eval_agent_${Date.now()}`);
  state.mode = "HA_ASK";
  state.haLockedUntil = Date.now() + 120000;

  for (const row of rows) {
    const lastHost = row.setup?.lastHostSpeakText || "";
    if (lastHost) state.lastDesign = null;
    if (lastHost) {
      state.mode = "HA_BIZ";
      state.haLockedUntil = Date.now() + 120000;
    } else {
      state.mode = "HA_ASK";
      state.haLockedUntil = Date.now() + 120000;
    }
    const transcript = [lastHost ? `大智: ${lastHost}` : "", `会场: ${row.input}`]
      .filter(Boolean)
      .join("\n");
    const r = await runMeetingAnalysis(transcript, DEFAULT_AGENDA, {
      agentState: state,
      meetingState: state,
      lastHostSpeakText: lastHost,
      lastHostSpeakAt: lastHost ? Date.now() - 5000 : 0,
      trigger: "eval",
      forceRule: !live
    });
    let answer = String(r.interventionText || r.fullAnswer || r.spokenPrefix || "");
    if (!answer || answer.length < 8) {
      answer = chatFallbackFor(row.input.replace(/^大智[，,]\s*/, ""), state, DEFAULT_AGENDA);
    }
    const e = row.expect || {};
    const fails = [];
    const gotIntent = r.intent?.intent || ruleUnderstand(row.input.replace(/^大智[，,]\s*/, "")).intent;
    if (e.intent?.length) {
      const okIntent = e.intent.includes(gotIntent);
      if (!okIntent) fails.push(`intent want ${e.intent.join("|")} got ${gotIntent}`);
    }
    if (e.answerForbids?.length && !includesNone(answer, e.answerForbids)) {
      fails.push(`hit forbid in: ${answer.slice(0, 80)}`);
    }
    if (e.answerIncludesAny?.length && !includesAny(answer, e.answerIncludesAny)) {
      fails.push(`missing anchors; got: ${answer.slice(0, 80)}`);
    }
    if (e.answerIncludesAll?.length && !includesAll(answer, e.answerIncludesAll)) {
      fails.push(`missing all anchors; got: ${answer.slice(0, 80)}`);
    }
    if (fails.length) {
      console.log(`FAIL ${row.id}`);
      fails.forEach((f) => console.log(`  - ${f}`));
    } else {
      pass += 1;
      console.log(`OK   ${row.id} [${gotIntent}] :: ${answer.slice(0, 56)}`);
    }
  }

  const fb = chatFallbackFor("我的投资能回本吗？", state, DEFAULT_AGENDA);
  if (/今天主题是|您可以问全园美语是什么|第二条路/.test(fb)) {
    console.log("FAIL fallback-no-agenda", fb.slice(0, 80));
  } else {
    pass += 1;
    console.log(`OK   fallback-no-agenda :: ${fb.slice(0, 60)}`);
  }

  const lossFb = chatFallbackFor(
    "我的园所经营的不是很好，引入39,000的课程后会不会让我亏损？",
    state,
    DEFAULT_AGENDA
  );
  if (/第二条路/.test(lossFb) || /今天主题是/.test(lossFb)) {
    console.log("FAIL fallback-loss-no-alternate", lossFb.slice(0, 80));
  } else if (!/(不保证|测算|一点八|三万九)/.test(lossFb)) {
    console.log("FAIL fallback-loss-anchors", lossFb.slice(0, 80));
  } else {
    pass += 1;
    console.log(`OK   fallback-loss-no-alternate :: ${lossFb.slice(0, 60)}`);
  }

  const total = rows.length + 2;
  console.log(`\n${pass}/${total} passed`);
  if (pass < total) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
