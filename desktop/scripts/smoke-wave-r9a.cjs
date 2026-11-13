/**
 * Wave R9a：Dialogue-Meta + 记忆三槽 + meta channel / llmChatJson。
 *   npm run smoke:wave-r9a
 */
const fs = require("fs");
const path = require("path");
const rootEnv = path.join(__dirname, "..", "..", ".env");
const deskEnv = path.join(__dirname, "..", ".env");
require("dotenv").config({ path: fs.existsSync(rootEnv) ? rootEnv : deskEnv });
process.env.DOUBAO_API_KEY = process.env.DOUBAO_API_KEY || "sk-smoke";
// R9a 默认规则闸；不强制打 LLM
delete process.env.DIALOGUE_META_LLM;

const {
  META_TYPES,
  classifyBySchema,
  validateMetaJson,
  handleDialogueMeta,
  commitContentSpeak,
  commitMetaSpeak,
  readSlots,
  DRAFT_STATES,
  rejectWriteIfIncomplete
} = require("../lib/intelligence/index.cjs");
const { resolveLlmConfig } = require("../lib/meetingStrategy/llm/providers/resolve.cjs");
const { llmChatJson } = require("../lib/meetingStrategy/llm/transport.cjs");
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

function phaseClassify() {
  const a = classifyBySchema("你是怎么回复的？");
  check(
    "meta:recall_answer 怎么回复",
    a.metaType === META_TYPES.RECALL_ANSWER && a.shouldSpeak === true,
    JSON.stringify(a)
  );

  const b = classifyBySchema("我刚才问了什么问题？");
  check(
    "meta:recall_ask",
    b.metaType === META_TYPES.RECALL_ASK,
    JSON.stringify(b)
  );

  const c = classifyBySchema("没听清");
  check(
    "meta:memory_repair",
    c.metaType === META_TYPES.MEMORY_REPAIR && c.needsRepair === true,
    JSON.stringify(c)
  );

  const d = classifyBySchema("你是谁？");
  check(
    "meta:身份非 meta",
    d.metaType === META_TYPES.NONE,
    JSON.stringify(d)
  );

  const e = classifyBySchema("学费多少钱");
  check(
    "meta:业务非 meta",
    e.metaType === META_TYPES.NONE,
    JSON.stringify(e)
  );

  const f = classifyBySchema("为什么不回答");
  check(
    "meta:why_silent",
    f.metaType === META_TYPES.WHY_SILENT,
    JSON.stringify(f)
  );

  const bad = validateMetaJson("{not json");
  check("meta:json 校验失败", bad.ok === false && bad.error === "json_parse");

  const good = validateMetaJson({
    metaType: "recall_ask",
    confidence: 0.9,
    needsRepair: false,
    shouldSpeak: true,
    directSpeak: null,
    memoryRead: { lastRealAsk: true }
  });
  check("meta:json 校验通过", good.ok === true && good.value.metaType === "recall_ask");
}

function phaseMemory() {
  const st = {};
  check("mem:incomplete 拒绝", rejectWriteIfIncomplete(DRAFT_STATES.INTERRUPTED) === true);
  check(
    "mem:interrupted 不写 content",
    commitContentSpeak(st, "业务答句", { draftState: DRAFT_STATES.INTERRUPTED }) === false &&
      !st.lastContentSpeak
  );
  check(
    "mem:committed 写 content",
    commitContentSpeak(st, "业务答句一二三", { draftState: DRAFT_STATES.COMMITTED }) === true &&
      st.lastContentSpeak === "业务答句一二三"
  );
  check(
    "mem:committed 写 meta",
    commitMetaSpeak(st, "刚才您问的是：测试", { draftState: DRAFT_STATES.COMMITTED }) === true &&
      /刚才您问的是/.test(st.lastMetaSpeak)
  );
  const slots = readSlots(st);
  check(
    "mem:三槽可读",
    slots.lastContentSpeak === "业务答句一二三" && /刚才您问的是/.test(slots.lastMetaSpeak)
  );
}

async function phaseHostPath() {
  const st = createMeetingSession("smoke_r9a_recall_answer");
  st.mode = "HA_ASK";
  st.haLockedUntil = Date.now() + 120000;
  st.lastContentSpeak = "三万九是每学期，参考口径不保证招满。";
  st.lastContentSpeakAt = Date.now();
  st.lastRealAsk = "三万九是学期还是一年？";
  st.lastRealAskAt = Date.now();

  const r = await runMeetingAnalysis("会场: 你是怎么回复的？", DEFAULT_AGENDA, {
    agentState: st,
    meetingState: st,
    trigger: "wake",
    forceRule: true
  });
  const text = String(r.interventionText || r.fullAnswer || "");
  check(
    "host:怎么回复→recall_answer 非身份",
    /刚才我答的是/.test(text) && /每学期|三万九/.test(text) && !/我是大智/.test(text),
    text.slice(0, 80)
  );
  check(
    "host:arkMode dialogue-meta",
    r.arkMode === "dialogue-meta" || r.speakKind === "meta",
    String(r.arkMode)
  );
  check(
    "host:写 lastMetaSpeak 不污染 content",
    /刚才我答的是/.test(String(st.lastMetaSpeak || "")) &&
      st.lastContentSpeak === "三万九是每学期，参考口径不保证招满。",
    String(st.lastMetaSpeak || "").slice(0, 48)
  );

  const st2 = createMeetingSession("smoke_r9a_repair");
  st2.mode = "HA_ASK";
  st2.haLockedUntil = Date.now() + 120000;
  const r2 = await runMeetingAnalysis("会场: 没听清", DEFAULT_AGENDA, {
    agentState: st2,
    meetingState: st2,
    trigger: "wake",
    forceRule: true
  });
  const t2 = String(r2.interventionText || "");
  check("host:repair", /没听清|再说完整/.test(t2), t2.slice(0, 48));

  const st3 = createMeetingSession("smoke_r9a_identity");
  st3.mode = "HA_ASK";
  st3.haLockedUntil = Date.now() + 120000;
  const r3 = await runMeetingAnalysis("会场: 你是谁？", DEFAULT_AGENDA, {
    agentState: st3,
    meetingState: st3,
    trigger: "wake",
    forceRule: true
  });
  const t3 = String(r3.interventionText || "");
  check(
    "host:你是谁仍走身份/FAQ",
    /大智|顾问/.test(t3) && r3.arkMode !== "dialogue-meta",
    `${r3.arkMode}|${t3.slice(0, 48)}`
  );
}

function phaseResolve() {
  const prevFast = process.env.DOUBAO_CHAT_FAST_MODEL;
  const prevChat = process.env.DOUBAO_CHAT_MODEL;
  process.env.DOUBAO_API_KEY = process.env.DOUBAO_API_KEY || "sk-smoke";
  process.env.DOUBAO_CHAT_FAST_MODEL = "ep-fast-r9a";
  process.env.DOUBAO_CHAT_MODEL = "ep-host-r9a";

  const meta = resolveLlmConfig({ channel: "meta" });
  check(
    "resolve:meta 用 FAST 且关 thinking",
    meta.model === "ep-fast-r9a" && meta.disableThinking === true && meta.channel === "meta",
    meta.model
  );
  check("transport:llmChatJson 导出", typeof llmChatJson === "function");

  if (prevFast == null) delete process.env.DOUBAO_CHAT_FAST_MODEL;
  else process.env.DOUBAO_CHAT_FAST_MODEL = prevFast;
  if (prevChat == null) delete process.env.DOUBAO_CHAT_MODEL;
  else process.env.DOUBAO_CHAT_MODEL = prevChat;
}

async function phaseHandleDirect() {
  const st = createMeetingSession("smoke_r9a_direct");
  st.mode = "HA_ASK";
  const ctx = {
    state: st,
    a2aTrace: [],
    kbStatus: {},
    floors: [],
    cmd: { command: "WAKE_ASK", named: false },
    qFp: "fp",
    lastFloor: "你是怎么回复的",
    opts: { forceRule: true }
  };
  st.lastContentSpeak = "开口实拍给家长看。";
  st.lastContentSpeakAt = Date.now();
  const hit = await handleDialogueMeta(ctx);
  check(
    "handle:直接命中",
    hit && hit.shouldIntervene && /刚才我答的是/.test(hit.interventionText || ""),
    String(hit && hit.interventionText).slice(0, 48)
  );

  const skip = await handleDialogueMeta({
    ...ctx,
    lastFloor: "全园美语怎么收费",
    cmd: { command: "WAKE_ASK", named: false }
  });
  check("handle:业务放行 null", skip == null);
}

phaseClassify();
phaseMemory();
phaseResolve();
phaseHandleDirect()
  .then(() => phaseHostPath())
  .then(() => {
    console.log(`\nwave-r9a smoke: ${pass} pass, ${fail} fail`);
    process.exit(fail ? 1 : 0);
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
