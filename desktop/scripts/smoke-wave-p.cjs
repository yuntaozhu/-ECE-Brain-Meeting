/**
 * Wave P′：对话链 — 选题抽取 + 试播开链 + 短答立刻巡检门控。
 *   node scripts/smoke-wave-p.cjs
 */
const {
  extractOfferedChoices,
  matchOfferedChoice
} = require("../lib/meetingStrategy/query/offerExtract.cjs");
const dialogueThread = require("../lib/meetingSession/dialogueThread.cjs");
const { shouldImmediatePatrolForUi, AGENT_MODE } =
  require("../lib/meetingSession");

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

const offer = "您判断时最看重开口数据、续费，还是家长口碑？";
const choices = extractOfferedChoices(offer);
check(
  "extract A/B/还是C",
  choices.length >= 3 &&
    choices.some((c) => c.includes("开口")) &&
    choices.some((c) => c.includes("续费")) &&
    choices.some((c) => c.includes("家长口碑")),
  choices
);

const hit = matchOfferedChoice("家长口碑！", offer);
check(
  "match 家长口碑",
  hit && hit.choice.includes("家长口碑") && /招生|口碑/.test(hit.rewritten),
  hit
);

dialogueThread.close("reset");
const th = dialogueThread.openFromOffer(offer, { source: "copilot-trial" });
check("open thread", Boolean(th && th.choices.length >= 3), th);
check("thread active", dialogueThread.isActive() === true);

check(
  "patrol IDLE + thread + 家长口碑",
  shouldImmediatePatrolForUi("家长口碑！", {
    mode: AGENT_MODE.IDLE_LISTEN,
    duplexPhase: "IDLE",
    recentHostUtterances: [offer],
    lastWakeSpeakAt: Date.now()
  }) === true
);

check(
  "patrol HA_ASK + 家长口碑",
  shouldImmediatePatrolForUi("家长口碑", {
    mode: AGENT_MODE.HA_ASK,
    duplexPhase: "IDLE",
    recentHostUtterances: [offer],
    lastWakeSpeakAt: Date.now()
  }) === true
);

const hit2 = dialogueThread.matchFloor("续费");
check("thread match 续费", hit2 && /续费/.test(hit2.choice), hit2);
dialogueThread.noteChoice(hit2?.choice || "续费");
check("focus set", dialogueThread.getActive()?.focus?.includes("续费"), dialogueThread.snapshot());

dialogueThread.close("stop");
check(
  "closed no false patrol",
  shouldImmediatePatrolForUi("家长口碑", {
    mode: AGENT_MODE.IDLE_LISTEN,
    duplexPhase: "IDLE",
    recentHostUtterances: [offer],
    lastWakeSpeakAt: Date.now() - 120000
  }) === false
);

const priceOffer = "您更关心的是总价能不能谈，还是先看收益保障和学期核算？";
const priceChoices = extractOfferedChoices(priceOffer);
check(
  "price_tradeoff choices",
  priceChoices.length >= 2,
  priceChoices
);

console.log(`\nwave-p smoke: ${pass} pass, ${fail} fail`);
process.exit(fail ? 1 : 0);
