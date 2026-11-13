/**
 * Wave R10：Focus SSOT / 催答 / ask_repair / 短窗粘合 / 无证据坦诚
 *   npm run smoke:wave-r10
 */
const fs = require("fs");
const path = require("path");
const rootEnv = path.join(__dirname, "..", "..", ".env");
const deskEnv = path.join(__dirname, "..", ".env");
require("dotenv").config({ path: fs.existsSync(rootEnv) ? rootEnv : deskEnv });
process.env.DOUBAO_API_KEY = process.env.DOUBAO_API_KEY || "sk-smoke";
delete process.env.DIALOGUE_META_LLM;

const { rx, speakFill, hp } = require("../lib/knowledge/schemaStore.cjs");
const {
  META_TYPES,
  classifyBySchema,
  pickLatestFocus,
  commitFocusAsk,
  extractAskRepairBody,
  focusGlueMs
} = require("../lib/intelligence/index.cjs");
const { isRecallLastAsk } = require("../lib/meetingSession/intents/index.cjs");
const { shouldImmediatePatrolForUi } = require("../lib/meetingSession/patrolPolicy.cjs");
const { INTERACTION_MODE } = require("../lib/meetingSession");
const { rememberRealAsk } = require("../lib/meetingStrategy/internal/result.cjs");

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

function phaseB() {
  check("r10b:urge 请回答", rx("commands", "urgeAct").test("请回答。") === true);
  check(
    "r10b:urge 请回答我刚刚的问题",
    rx("commands", "urgeAct").test("请回答我刚刚的问题。") === true
  );
  check(
    "r10b:请回答 非 recall",
    isRecallLastAsk("请回答我刚刚的问题。") === false
  );
  check(
    "r10b:咨询中催答立即巡检",
    shouldImmediatePatrolForUi("请回答。", { mode: INTERACTION_MODE.HA_ASK }) === true
  );
  check(
    "r10b:patrolForce 含请回答",
    rx("commands", "patrolForce").test("请回答我刚刚的问题") === true
  );
}

function phaseA() {
  const state = {
    lastRealAsk: "当地教育局不允许商议课，我们想你出课程怎么办？",
    lastRealAskAt: Date.now() - 60000,
    pendingAsk: "我想加入这个课程，但没有钱怎么办？",
    pendingAskAt: Date.now() - 1000,
    lastOpenAsk: "我想加入这个课程，但没有钱怎么办？",
    lastOpenAskAt: Date.now() - 1000
  };
  const focus = pickLatestFocus(state);
  check(
    "r10a:Focus 取最新 pending",
    /没有钱/.test(focus.text) && !/教育局/.test(focus.text),
    focus.text.slice(0, 48)
  );

  const st2 = {};
  commitFocusAsk(st2, "我想加入这个课程，但没有钱怎么办？", {
    rememberRealAsk,
    asPending: true
  });
  check(
    "r10a:受理写 lastRealAsk+pending",
    /没有钱/.test(st2.lastRealAsk) && /没有钱/.test(st2.pendingAsk) && st2.focusUnanswered === true
  );
}

function phaseD() {
  const body = extractAskRepairBody(
    "不对，我刚刚问的是我想加入这个课程，但没有钱怎么办？"
  );
  check("r10d:抽 repair body", /没有钱/.test(body), body.slice(0, 48));

  const cls = classifyBySchema("不对，我刚刚问的是我想加入这个课程，但没有钱怎么办？");
  check(
    "r10d:meta ask_repair",
    cls.metaType === META_TYPES.ASK_REPAIR && /没有钱/.test(cls.repairAsk || ""),
    JSON.stringify(cls)
  );

  check(
    "r10d:纯 recall 仍识别",
    classifyBySchema("我刚刚问了什么？").metaType === META_TYPES.RECALL_ASK
  );
  check(
    "r10d:纠偏句非 isRecallLastAsk",
    isRecallLastAsk("不对，我刚刚问的是我想加入这个课程，但没有钱怎么办？") === false
  );
}

function phaseC() {
  check("r10c:followOnShort 优惠", rx("commands", "followOnShort").test("可以优惠吗？") === true);
  check("r10c:focusGlueMs", focusGlueMs() >= 1500 && Number(hp("focusGlueMs")) > 0);
}

function phaseE() {
  const line = speakFill("focusGapHonest", { ask: "没有钱怎么办" });
  check(
    "r10e:坦诚模板",
    /没有钱怎么办/.test(line) && /资料/.test(line),
    line.slice(0, 56)
  );
}

async function phaseHost() {
  const { createMeetingSession } = require("../lib/meetingSession");
  const { runMeetingAnalysis, DEFAULT_AGENDA } = require("../lib/meetingStrategy");

  const st = createMeetingSession("smoke_r10_focus");
  st.mode = "HA_ASK";
  st.haLockedUntil = Date.now() + 180000;

  const r0 = await runMeetingAnalysis(
    "会场: 当地教育局不允许幼儿园开英语课怎么办？",
    DEFAULT_AGENDA,
    { agentState: st, meetingState: st, trigger: "wake", forceRule: true }
  );
  check(
    "host:教育局先答成",
    /教育局|本地规定|英语课/.test(String(r0.interventionText || r0.fullAnswer || "")),
    String(r0.interventionText || r0.fullAnswer || "").slice(0, 48)
  );

  const r1 = await runMeetingAnalysis(
    "会场: 我想加入这个课程，但没有钱怎么办？",
    DEFAULT_AGENDA,
    { agentState: st, meetingState: st, trigger: "wake", forceRule: true }
  );
  const a1 = String(r1.interventionText || r1.fullAnswer || "");
  check(
    "host:没钱不纯 skip",
    Boolean(a1) && r1.arkMode !== "skip",
    `ark=${r1.arkMode} :: ${a1.slice(0, 48)}`
  );
  check(
    "host:Focus 已写没钱",
    /没有钱|优惠|加入/.test(String(st.lastRealAsk || st.pendingAsk || "")),
    String(st.lastRealAsk || st.pendingAsk || "").slice(0, 48)
  );

  const r2 = await runMeetingAnalysis("会场: 请回答。", DEFAULT_AGENDA, {
    agentState: st,
    meetingState: st,
    trigger: "wake",
    forceRule: true
  });
  const a2 = String(r2.interventionText || r2.fullAnswer || "");
  check(
    "host:请回答有回应",
    Boolean(a2) && r2.arkMode !== "skip",
    `ark=${r2.arkMode} :: ${a2.slice(0, 48)}`
  );

  const r3 = await runMeetingAnalysis("会场: 我刚刚问了什么？", DEFAULT_AGENDA, {
    agentState: st,
    meetingState: st,
    trigger: "wake",
    forceRule: true
  });
  const a3 = String(r3.interventionText || r3.fullAnswer || "");
  check(
    "host:回放非教育局",
    /刚才您问的是/.test(a3) && /没有钱|加入/.test(a3) && !/教育局不允许|商议课|绕过教育局/.test(a3),
    a3.slice(0, 72)
  );
}

phaseB();
phaseA();
phaseD();
phaseC();
phaseE();

phaseHost()
  .then(() => {
    console.log(`\nwave-r10 smoke: ${pass} pass, ${fail} fail`);
    process.exit(fail ? 1 : 0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
