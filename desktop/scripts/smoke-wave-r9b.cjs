/**
 * Wave R9b：oralize 首句分片 + laneArbiter 模糊补判。
 *   npm run smoke:wave-r9b
 */
const fs = require("fs");
const path = require("path");
const rootEnv = path.join(__dirname, "..", "..", ".env");
const deskEnv = path.join(__dirname, "..", ".env");
require("dotenv").config({ path: fs.existsSync(rootEnv) ? rootEnv : deskEnv });
process.env.DOUBAO_API_KEY = process.env.DOUBAO_API_KEY || "sk-smoke";
delete process.env.LANE_ARBITER_LLM;

const {
  classifyAskLane,
  resolveAskLane,
  isOpenIntelligenceLane,
  DRAFT_STATES
} = require("../lib/intelligence/index.cjs");
const {
  oralizeCommitted,
  splitLeadFollow,
  negationOk
} = require("../lib/meetingStrategy/paths/consult/oralize.cjs");
const { resolveLlmConfig } = require("../lib/meetingStrategy/llm/providers/resolve.cjs");
const { createMeetingSession } = require("../lib/meetingSession");
const { runMeetingAnalysis, DEFAULT_AGENDA } = require("../lib/meetingStrategy");

let pass = 0;
let fail = 0;

function check(name, ok, detail) {
  if (ok) {
    pass += 1;
    console.log("PASS", name, detail || "");
  } else {
    fail += 1;
    console.log("FAIL", name, detail || "");
  }
}

function phaseSplit() {
  const a = splitLeadFollow("可以，默认支持。但如果是跨地域，要加权限。");
  check("split:lead", a.lead === "可以，默认支持。" || /^可以/.test(a.lead), a.lead);
  check("split:follow", /跨地域|权限/.test(a.follow), a.follow);
  check("negation:ok", negationOk("不保证招满", "测算不保证招满") === true);
  check("negation:drop", negationOk("不保证招满", "一定能招满") === false);
}

function phaseLane() {
  check("lane:多少钱 still hard", classifyAskLane("多少钱").lane === "hard");
  check("lane:学生喜欢 still soft", resolveAskLane("学生喜欢吗").lane === "soft");

  const amb = resolveAskLane("课堂氛围怎么样会不会太难");
  check(
    "lane:softAmbiguous",
    amb.lane === "soft" && (amb.why === "softAmbiguous" || amb.hits.includes("softAmbiguous")),
    JSON.stringify(amb)
  );

  const need = resolveAskLane("你是说哪方面");
  check(
    "lane:need_more_info",
    need.needMoreInfo === true || need.why === "need_more_info",
    JSON.stringify(need)
  );

  const strat = resolveAskLane("从哪开始做比较稳");
  check(
    "lane:strategyAmbiguous",
    strat.lane === "strategy" && strat.why === "strategyAmbiguous",
    JSON.stringify(strat)
  );

  check("lane:open softAmbiguous", isOpenIntelligenceLane("课堂氛围怎么样会不会太难") === true);
  check("lane:hard default 不乱开", isOpenIntelligenceLane("今天天气不错") === false);
}

function phaseResolveChannel() {
  process.env.DOUBAO_CHAT_FAST_MODEL = "ep-oralize-fast";
  process.env.DOUBAO_CHAT_MODEL = "ep-host";
  const oralize = resolveLlmConfig({ channel: "oralize" });
  check(
    "resolve:oralize FAST+no thinking",
    oralize.model === "ep-oralize-fast" && oralize.disableThinking === true,
    oralize.model
  );
  const lane = resolveLlmConfig({ channel: "lane" });
  check("resolve:lane FAST", lane.model === "ep-oralize-fast" && lane.disableThinking === true);
}

async function phaseOralizeForceRule() {
  let early = "";
  const local = {
    oralize: true,
    cardSpeak: "大地合作园项目服务价是三万九千元每学期。外校园价四万九。",
    interventionText: "大地合作园项目服务价是三万九千元每学期。外校园价四万九。",
    fullAnswer: "大地合作园项目服务价是三万九千元每学期。外校园价四万九。",
    shouldIntervene: true
  };
  const out = await oralizeCommitted(local, {
    askText: "怎么收费",
    lastFloor: "怎么收费",
    opts: {
      forceRule: true,
      onEarlySpeak: (t) => {
        early = t;
      }
    }
  });
  check("oralize:forceRule 保留原稿", /三万九/.test(out.interventionText || out.fullAnswer || ""));
  check(
    "oralize:forceRule 有 lead",
    Boolean(out.leadSentence) && out.draftState === DRAFT_STATES.COMMITTED,
    out.leadSentence
  );
  check("oralize:forceRule 可先开口", Boolean(early) || Boolean(out.spokenPrefix), early || out.spokenPrefix);
}

async function phaseOralizeAbort() {
  const ac = new AbortController();
  ac.abort();
  const local = {
    oralize: true,
    cardSpeak: "不保证招满。测算仅供参考。",
    interventionText: "不保证招满。测算仅供参考。",
    fullAnswer: "不保证招满。测算仅供参考。"
  };
  const out = await oralizeCommitted(local, {
    askText: "能保证吗",
    opts: { signal: ac.signal }
  });
  check(
    "oralize:abort incomplete",
    out.incomplete === true && out.draftState === DRAFT_STATES.INTERRUPTED,
    JSON.stringify({ incomplete: out.incomplete, draftState: out.draftState })
  );
}

async function phaseHostHard() {
  const st = createMeetingSession("smoke_r9b_hard");
  st.mode = "HA_ASK";
  st.haLockedUntil = Date.now() + 120000;
  const r = await runMeetingAnalysis("会场: 三万九是学期还是一年？", DEFAULT_AGENDA, {
    agentState: st,
    meetingState: st,
    trigger: "wake",
    forceRule: true
  });
  const text = String(r.interventionText || r.fullAnswer || "");
  check("host:hard FAQ 仍秒答", /每学期|三万九/.test(text), text.slice(0, 64));
  check(
    "host:content 槽写入",
    /每学期|三万九/.test(String(st.lastContentSpeak || "")),
    String(st.lastContentSpeak || "").slice(0, 48)
  );
}

phaseSplit();
phaseLane();
phaseResolveChannel();
phaseOralizeForceRule()
  .then(() => phaseOralizeAbort())
  .then(() => phaseHostHard())
  .then(() => {
    console.log(`\nwave-r9b smoke: ${pass} pass, ${fail} fail`);
    process.exit(fail ? 1 : 0);
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
