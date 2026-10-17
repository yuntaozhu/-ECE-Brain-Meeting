/**
 * 回归门。
 * 从冒烟和变体评测导出 cases.jsonl（断言原文不改），再按同样条件重放。
 * 旧脚本仍是 23/23 与 22/22 的验收门。诊断带上前置口播和上一拍设计。
 *
 *   node test/benchmarkRunner.cjs
 *   node test/benchmarkRunner.cjs --dump
 */
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const DESKTOP = path.join(__dirname, "..");
const SMOKE = path.join(DESKTOP, "scripts", "smoke-scene-faq.cjs");
const EVAL_JSON = path.join(DESKTOP, "knowledge", "eval-agent-variants.json");
const CASES = path.join(__dirname, "cases.jsonl");

function patternBody(literal) {
  return String(literal || "").replace(/^\//, "").replace(/\/[a-z]*$/, "");
}

function loadCases() {
  const smokeSrc = fs.readFileSync(SMOKE, "utf8");
  const cases = [];
  const re = /id:\s*"([^"]+)"\s*,\s*q:\s*"([^"]+)"\s*,\s*need:\s*(\/[^/\n]+\/)\s*,\s*forbid:\s*(\/[^/\n]+\/)/g;
  let m;
  while ((m = re.exec(smokeSrc))) {
    cases.push({
      id: m[1],
      suite: "smoke",
      kind: "ask",
      q: m[2],
      need: patternBody(m[3]),
      forbid: patternBody(m[4])
    });
  }
  cases.push(
    {
      id: "trunc-skip-how-do",
      suite: "smoke",
      kind: "trunc-skip",
      q: "你如何做？"
    },
    {
      id: "ability-follow",
      suite: "smoke",
      kind: "ask",
      prior: ["他不具备这个能力怎么办？"],
      q: "不会做阅读测评",
      need: "报告|机试|十秒|系统出",
      forbid: "写死的标准|不定场次|你是在问"
    },
    {
      id: "bare-listen-cmd",
      suite: "smoke",
      kind: "command",
      q: "听我说。",
      command: "INTERRUPT"
    },
    {
      id: "reask-expensive",
      suite: "smoke",
      kind: "ask",
      q: "大智回复我刚才的问题。",
      setup: { lastOpenAsk: "一年39000太贵了，我们现在经营困难，付不起这么多钱。" },
      need: "收益保障|每学期",
      forbid: "你想先听哪一步"
    }
  );
  const rows = JSON.parse(fs.readFileSync(EVAL_JSON, "utf8"));
  for (const row of rows) {
    cases.push({
      id: row.id,
      suite: "eval",
      kind: "ask",
      q: row.input,
      setup: row.setup || undefined,
      expect: row.expect
    });
  }
  cases.push(
    {
      id: "fallback-no-agenda",
      suite: "eval",
      kind: "fallback",
      q: "我的投资能回本吗？",
      forbidAny: ["今天主题是", "您可以问全园美语是什么", "第二条路"]
    },
    {
      id: "fallback-loss-no-alternate",
      suite: "eval",
      kind: "fallback",
      q: "我的园所经营的不是很好，引入39,000的课程后会不会让我亏损？",
      forbidAny: ["第二条路", "今天主题是"],
      needAny: ["不保证", "测算", "一点八", "三万九"]
    }
  );
  return cases;
}

function dumpCases(cases) {
  const lines = cases.map((row) => JSON.stringify(row)).join("\n") + "\n";
  fs.writeFileSync(CASES, lines);
  console.log("[benchmark] wrote", cases.length, "rows ->", CASES);
}

function runScript(rel) {
  const result = spawnSync(process.execPath, [path.join(DESKTOP, rel)], {
    cwd: DESKTOP,
    encoding: "utf8",
    env: { ...process.env, DOUBAO_API_KEY: "", ARK_API_KEY: "" }
  });
  const tail = String(result.stdout || "").trim().split(/\n/).slice(-2).join(" | ");
  console.log(`[benchmark] ${rel} exit=${result.status} ${tail}`);
  return result.status === 0;
}

function includesAny(text, arr) {
  return (arr || []).some((x) => String(text || "").includes(x));
}

function diagLine(id, d, completeness) {
  const s = (d && d.shadow) || {};
  return [
    id,
    d ? d.action : "",
    d ? d.reason : "",
    "p=" + (d && d.posterior != null ? Number(d.posterior).toFixed(3) : ""),
    "align=" + (s.align == null ? "" : Number(s.align).toFixed(2)),
    "extra=" + (s.extra == null ? "" : Number(s.extra).toFixed(2)),
    "alignW=" + (s.alignW == null ? "" : s.alignW),
    "polarityCancel=" + (s.polarityCancel == null ? "" : s.polarityCancel),
    "req=" + (s.reqSlots || []).join("|"),
    "missing=" + (s.missingSlots || []).join("|"),
    "card=" + (s.cardSlots || []).join("|"),
    "complete=" + (completeness == null ? "" : Number(completeness).toFixed(2))
  ].join("\t");
}

async function replay(cases) {
  process.env.DOUBAO_API_KEY = process.env.DOUBAO_API_KEY || "sk-smoke";
  process.env.ARK_API_KEY = process.env.ARK_API_KEY || "";
  const { createMeetingSession, detectAgentCommand } = require("../lib/meetingSession");
  const { runMeetingAnalysis, DEFAULT_AGENDA } = require("../lib/meetingStrategy");
  const { chatFallbackFor } = require("../lib/meetingStrategy/llm/fallback.cjs");
  const { ruleUnderstand, intentSoftAnswer } = require("../lib/meetingStrategy/agent/intent.cjs");
  const { isTruncatedAsk } = require("../lib/meetingStrategy/agent/relevance.cjs");
  const { decideSpeak } = require("../lib/meetingStrategy/decideSpeak.cjs");
  const { retrieveKnowledge } = require("../lib/knowledge");
  const { evaluateSyntacticCompleteness } = require("../lib/text/universalOperators.cjs");

  let pass = 0;
  const fails = [];
  const actions = {};
  let shadowCompared = 0;
  let shadowDiverged = 0;
  console.log("[benchmark] diagnosis");

  for (const c of cases) {
    if (c.kind === "trunc-skip") {
      if (isTruncatedAsk(c.q)) fails.push(`${c.id} still truncated`);
      else pass += 1;
      console.log(`${c.id}\ttrunc-skip\t${isTruncatedAsk(c.q) ? "FAIL" : "ok"}`);
      continue;
    }
    if (c.kind === "command") {
      const got = detectAgentCommand(c.q);
      if (got.command === c.command) pass += 1;
      else fails.push(`${c.id} command ${got.command}`);
      console.log(`${c.id}\tcommand\t${got.command}`);
      continue;
    }
    if (c.kind === "fallback") {
      const state = createMeetingSession(`bench_${c.id}`);
      const fb = chatFallbackFor(c.q, state, DEFAULT_AGENDA);
      const bad = includesAny(fb, c.forbidAny);
      const miss = c.needAny && !includesAny(fb, c.needAny);
      if (bad || miss) fails.push(`${c.id} :: ${fb.slice(0, 70)}`);
      else pass += 1;
      console.log(`${c.id}\tfallback\t${fb.slice(0, 40)}`);
      continue;
    }

    const state = createMeetingSession(`bench_${c.id}`);
    const lastHost = c.setup?.lastHostSpeakText || "";
    state.mode = lastHost ? "HA_BIZ" : "HA_ASK";
    state.haLockedUntil = Date.now() + 120000;
    if (c.setup?.lastOpenAsk) {
      state.lastOpenAsk = c.setup.lastOpenAsk;
      state.lastOpenAskAt = Date.now();
    }
    for (const prior of c.prior || []) {
      await runMeetingAnalysis(`会场: ${prior}`, DEFAULT_AGENDA, {
        agentState: state,
        meetingState: state,
        trigger: "wake",
        forceRule: true
      });
    }
    const prevDesign = state.lastDesign || null;
    const transcript = [lastHost ? `大智: ${lastHost}` : "", `会场: ${c.q}`].filter(Boolean).join("\n");
    const r = await runMeetingAnalysis(transcript, DEFAULT_AGENDA, {
      agentState: state,
      meetingState: state,
      lastHostSpeakText: lastHost,
      lastHostSpeakAt: lastHost ? Date.now() - 5000 : 0,
      trigger: c.suite === "eval" ? "eval" : "wake",
      forceRule: true
    });
    let answer = String(r.interventionText || r.fullAnswer || r.spokenPrefix || "");
    if (c.suite === "eval" && answer.length < 8) {
      answer = chatFallbackFor(c.q.replace(/^大智[，,]\s*/, ""), state, DEFAULT_AGENDA);
    }

    const local = [];
    if (c.need && !new RegExp(c.need).test(answer)) local.push(`need ${answer.slice(0, 60)}`);
    if (c.forbid && new RegExp(c.forbid).test(answer)) local.push(`forbid ${answer.slice(0, 60)}`);
    if (c.expect?.intent?.length) {
      const got = r.intent?.intent || ruleUnderstand(c.q.replace(/^大智[，,]\s*/, "")).intent;
      if (!c.expect.intent.includes(got)) local.push(`intent ${got}`);
    }
    if (c.expect?.answerForbids?.length && includesAny(answer, c.expect.answerForbids)) {
      local.push(`forbid ${answer.slice(0, 60)}`);
    }
    if (c.expect?.answerIncludesAny?.length && !includesAny(answer, c.expect.answerIncludesAny)) {
      local.push(`anchors ${answer.slice(0, 60)}`);
    }
    if (local.length) fails.push(`${c.id} ${local.join("; ")}`);
    else pass += 1;

    const ask = c.setup?.lastOpenAsk || c.q;
    const intent = ruleUnderstand(String(ask).replace(/^大智[，,]\s*/, ""));
    const hits = retrieveKnowledge(ask, 4)?.hits || [];
    const d = decideSpeak({
      ask,
      hits,
      intent,
      script: intentSoftAnswer(intent, ask),
      prevDesign,
      lastHost
    });
    actions[d.action] = (actions[d.action] || 0) + 1;
    if (d.shadow && d.shadow.shadowAction) {
      shadowCompared += 1;
      if (d.shadow.isDiverged) shadowDiverged += 1;
    }
    console.log(diagLine(c.id, d, evaluateSyntacticCompleteness(ask)));
  }

  console.log("[benchmark] actions " + Object.entries(actions).map(([k, v]) => `${k}=${v}`).join(" "));
  console.log(`[benchmark] shadow diverged ${shadowDiverged}/${shadowCompared}`);
  return { pass, total: cases.length, fails };
}

async function main() {
  const cases = loadCases();
  dumpCases(cases);
  if (process.argv.includes("--dump")) return;

  const smokeOk = runScript("scripts/smoke-scene-faq.cjs");
  const evalOk = runScript("scripts/eval-agent-variants.cjs");
  const lint = spawnSync(process.execPath, [path.join(__dirname, "no-hardcode-lint.cjs")], {
    cwd: DESKTOP,
    encoding: "utf8"
  });
  process.stdout.write(lint.stdout || "");
  if (lint.status !== 0) process.stderr.write(lint.stderr || "");

  const replayed = await replay(cases);
  if (replayed.fails.length) {
    console.error("[benchmark] jsonl FAIL");
    replayed.fails.forEach((line) => console.error("  - " + line));
  } else {
    console.log(`[benchmark] jsonl ${replayed.pass}/${replayed.total}`);
  }
  if (!smokeOk || !evalOk || lint.status !== 0 || replayed.fails.length) process.exit(1);
  console.log("[benchmark] ok");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
