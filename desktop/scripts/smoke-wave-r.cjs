/**
 * Wave R Phase 0–7：定卡闸、智能层、Seed-Evolving、观测、受众帧与纠偏闭环。
 *   npm run smoke:wave-r
 */
const fs = require("fs");
const path = require("path");
const rootEnv = path.join(__dirname, "..", "..", ".env");
const deskEnv = path.join(__dirname, "..", ".env");
require("dotenv").config({ path: fs.existsSync(rootEnv) ? rootEnv : deskEnv });
process.env.DOUBAO_API_KEY = process.env.DOUBAO_API_KEY || "sk-smoke";

const {
  GATES,
  validateIntelligenceResult,
  evaluateCommitRelease,
  commitDraft,
  draftFpOf,
  observeTurn,
  evaluateFrameMatch,
  banCard,
  inCorrectingWindow
} = require("../lib/intelligence/index.cjs");
const { detectUserTone, isRecallLastAsk } = require("../lib/meetingSession/intents/index.cjs");
const { shouldImmediatePatrolForUi } = require("../lib/meetingSession/patrolPolicy.cjs");
const { AGENT_MODE } = require("../lib/meetingSession/constants.cjs");
const { matchFaqInstant } = require("../lib/knowledge");
const { buildCopilotPacket } = require("../lib/copilot/index.cjs");
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

/** @type {{ id: string, q: string, titleNeed: RegExp, answerNeed: RegExp, answerForbid: RegExp }} */
const faqCases = [
  {
    id: "contact-who",
    q: "想加入找谁联系？",
    titleNeed: /联系|申请|预约|负责人/,
    answerNeed: /项目负责人|0756|对接|预约/,
    answerForbid: /三万九千元每学期|不以在籍人数|三笔账/
  },
  {
    id: "term-or-year",
    q: "三万九是学期还是一年？",
    titleNeed: /学期|收费|三万九|39000/,
    answerNeed: /每学期/,
    answerForbid: /按年另报价才是正解/
  },
  {
    id: "teacher-bar",
    q: "老师不是英语专业，门槛高吗？",
    titleNeed: /专业|门槛|英语老师/,
    answerNeed: /不需要先招专业|敢说|Teacher说|意愿/,
    answerForbid: /教育局|偷偷上课|普惠园单独排除/
  },
  {
    id: "vs-training",
    q: "全园美语班和外面的英语培训机构有什么区别？",
    titleNeed: /区别|培训|优势/,
    answerNeed: /系统建设|四端|特色园|课堂里学/,
    answerForbid: /说服家长报课|先护收费盘面|教育局/
  },
  {
    id: "intl-garden",
    q: "是不是只有高端国际园才适合做全园美语？",
    titleNeed: /国际园/,
    answerNeed: /不是|外校园|四万九|按系统执行/,
    answerForbid: /教育局不允许|偷偷上课/
  },
  {
    id: "unprofessional",
    q: "家长觉得幼儿园开英语课不太专业，老师也不专业怎么办？",
    titleNeed: /不专业|专业/,
    answerNeed: /看得见|开口|测评|成果展|Teacher说/,
    answerForbid: /教育局不允许|偷偷上课|绕过教育局/
  },
  {
    id: "edu-bureau-still",
    q: "当地教育局不允许幼儿园开英语课怎么办？",
    titleNeed: /教育局/,
    answerNeed: /教育局|不能按英语课|本地规定/,
    answerForbid: /高端国际园|只有高端/
  },
  {
    id: "apply-who",
    q: "申请找谁？",
    titleNeed: /联系|申请|预约/,
    answerNeed: /项目负责人|对接|0756|预约/,
    answerForbid: /不以在籍人数乘单价/
  }
];

/** 副驾驶同源：FAQ 命中标题应进入 key_facts / suggestions 可用语境 */
const copilotAlign = [
  {
    id: "copilot-contact",
    q: "想加入找谁联系？",
    need: /负责人|0756|对接|预约/
  },
  {
    id: "copilot-unprofessional",
    q: "家长觉得老师不专业怎么办？",
    need: /看得见|开口|测评|成果|Teacher/,
    forbid: /教育局不允许|偷偷上课/
  },
  {
    id: "copilot-intl",
    q: "高端国际园做英语是不是更有优势？",
    need: /外校园|四万九|不是|系统执行|合作园/,
    forbid: /偷偷上课|绕过教育局/
  }
];

// —— contract ——
check("GATES has committed", GATES.COMMITTED === "committed");
const bad = validateIntelligenceResult({ gate: "nope" });
check("validate rejects bad gate", bad === "bad_gate", bad);
const good = validateIntelligenceResult({
  gate: GATES.COMMITTED,
  draft: { text: "demo", draftFp: "x" },
  variants: { push_forward: "a", push_back: "b", counter_inquiry: "c" }
});
check("validate accepts sketch", good === null);

// —— FAQ R0 ——
for (const c of faqCases) {
  const hit = matchFaqInstant(c.q);
  const title = String(hit?.title || "");
  const answer = String(hit?.answer || "");
  check(
    `faq:${c.id}:hit`,
    Boolean(hit && answer.length >= 8),
    title.slice(0, 48) || "(null)"
  );
  check(`faq:${c.id}:title`, c.titleNeed.test(title), title.slice(0, 64));
  check(`faq:${c.id}:answer`, c.answerNeed.test(answer), answer.slice(0, 72));
  check(
    `faq:${c.id}:forbid`,
    !c.answerForbid.test(answer),
    answer.slice(0, 72)
  );
}

// —— Copilot align skeleton ——
for (const c of copilotAlign) {
  const faq = matchFaqInstant(c.q);
  const faqText = String(faq?.answer || "");
  const pkt = buildCopilotPacket(c.q, {
    agenda: "全园美语教研会",
    skipPrefetch: true,
    force: true
  });
  const blob = [
    faqText,
    pkt?.suggestions?.push_forward,
    pkt?.suggestions?.push_back,
    pkt?.key_facts?.join(" ")
  ]
    .filter(Boolean)
    .join("\n");
  check(
    `copilot:${c.id}:faq`,
    c.need.test(faqText),
    faqText.slice(0, 72) || "(no faq)"
  );
  check(
    `copilot:${c.id}:packet`,
    Boolean(pkt?.should_trigger && pkt.suggestions),
    pkt?.stage || ""
  );
  if (c.forbid) {
    check(
      `copilot:${c.id}:no-sticky-bureau`,
      !c.forbid.test(blob),
      blob.slice(0, 80)
    );
  }
}

// —— Phase 2 commit gate（纯数值）——
check(
  "gate:weak_posterior releases",
  evaluateCommitRelease(
    { action: "answer", reason: "posterior", posterior: 0.4, align: 0.5, extra: 0.2 },
    { hasKey: true, forceRule: false }
  ).why === "weak_posterior"
);
check(
  "gate:low_align_high_extra releases",
  evaluateCommitRelease(
    { action: "answer", reason: "posterior", posterior: 0.7, align: 0.2, extra: 0.6 },
    { hasKey: true, forceRule: false }
  ).why === "low_align_high_extra"
);
check(
  "gate:forceRule keeps",
  evaluateCommitRelease(
    { action: "answer", reason: "posterior", posterior: 0.3, align: 0.1, extra: 0.9 },
    { hasKey: true, forceRule: true }
  ).release === false
);
check(
  "gate:card-switch keeps",
  evaluateCommitRelease(
    { action: "answer", reason: "card-switch", posterior: 0.2, align: 0.1, extra: 0.9 },
    { hasKey: true, forceRule: false }
  ).release === false
);
check(
  "gate:strong commit keeps",
  evaluateCommitRelease(
    { action: "answer", reason: "posterior", posterior: 0.8, align: 0.6, extra: 0.2 },
    { hasKey: true, forceRule: false }
  ).release === false
);

const draftState = {};
const d = commitDraft(draftState, { text: "三万九每学期。", arkMode: "faq", title: "收费" });
check("draft:fp stable", Boolean(d && d.draftFp === draftFpOf("三万九每学期。")), d && d.draftFp);
check(
  "draft:state written",
  draftState.lastSpeakDraft &&
    draftState.lastIntelligence &&
    draftState.lastIntelligence.gate === GATES.COMMITTED,
  draftState.lastIntelligence && draftState.lastIntelligence.gate
);

async function hostDraftSmoke() {
  const state = createMeetingSession("smoke_wr_draft");
  state.mode = "HA_ASK";
  state.haLockedUntil = Date.now() + 120000;
  const r = await runMeetingAnalysis("会场: 三万九是学期还是一年？", DEFAULT_AGENDA, {
    agentState: state,
    meetingState: state,
    trigger: "wake",
    forceRule: true
  });
  const answer = String(r.interventionText || r.fullAnswer || "");
  check("host:term-or-year speaks", /每学期/.test(answer), answer.slice(0, 64));
  check(
    "host:SpeakDraft written",
    Boolean(state.lastSpeakDraft && state.lastSpeakDraft.text && /每学期/.test(state.lastSpeakDraft.text)),
    state.lastSpeakDraft && String(state.lastSpeakDraft.text).slice(0, 48)
  );
  check(
    "host:Intelligence committed",
    state.lastIntelligence && state.lastIntelligence.gate === GATES.COMMITTED,
    state.lastIntelligence && state.lastIntelligence.gate
  );
}

async function phase3Smoke() {
  const { isTopicShift } = require("../lib/intelligence/index.cjs");
  const { isRecallLastAsk } = require("../lib/meetingSession");
  const { isClosedFaqQuestion } = require("../lib/meetingStrategy/query/classify.cjs");

  check(
    "recall:上一问变体",
    isRecallLastAsk("上一个问题是什么？") &&
      isRecallLastAsk("请告诉我上一个问题是什么？") &&
      isRecallLastAsk("我上面提的问题是什么？"),
    "patterns"
  );
  check("closed:学期还是一年", isClosedFaqQuestion("三万九是学期还是一年？"), "closed");

  const eduTitle =
    "Q: 教育局不允许幼儿园开英语课怎么办？ / 当地教育局不允许开英语课怎么办？";
  const eduSpeak =
    "资料没有写可以绕过教育局。当地不允许幼儿园开英语课，就不能按英语课去开，也不要偷偷上课。";
  check(
    "shift:国际园离开教育局卡",
    isTopicShift(
      "是不是只有高端国际园才适合做全园美语？",
      { type: "answer", hypothesisId: eduTitle },
      eduSpeak
    ) === true
  );
  check(
    "shift:同卡不误清",
    isTopicShift(
      "当地教育局不允许开英语课怎么办？",
      { type: "answer", hypothesisId: eduTitle },
      eduSpeak
    ) === false
  );

  const st = createMeetingSession("smoke_wr_p3");
  st.mode = "HA_ASK";
  st.haLockedUntil = Date.now() + 120000;
  st.lastDesign = {
    type: "answer",
    hypothesisId: eduTitle,
    segments: [],
    depth: "final"
  };
  const r1 = await runMeetingAnalysis(
    "会场: 是不是只有高端国际园才适合做全园美语？",
    DEFAULT_AGENDA,
    {
      agentState: st,
      meetingState: st,
      trigger: "wake",
      forceRule: true,
      lastHostSpeakText: eduSpeak
    }
  );
  const a1 = String(r1.interventionText || r1.fullAnswer || "");
  check(
    "host:异题不粘教育局",
    /外校园|四万九|不是|国际园|合作园|系统执行/.test(a1) && !/偷偷上课|绕过教育局/.test(a1),
    a1.slice(0, 72)
  );

  const st2 = createMeetingSession("smoke_wr_recall");
  st2.mode = "HA_ASK";
  st2.haLockedUntil = Date.now() + 120000;
  st2.lastRealAsk = "高端国际园做英语是不是更有优势？";
  st2.lastRealAskAt = Date.now();
  const r2 = await runMeetingAnalysis("会场: 上一个问题是什么？", DEFAULT_AGENDA, {
    agentState: st2,
    meetingState: st2,
    trigger: "wake",
    forceRule: true
  });
  const a2 = String(r2.interventionText || r2.fullAnswer || "");
  check(
    "host:上一问回放",
    /刚才您问的是/.test(a2) && /国际园|优势/.test(a2) && !/今天主题是/.test(a2),
    a2.slice(0, 80)
  );

  const st3 = createMeetingSession("smoke_wr_closed");
  st3.mode = "HA_ASK";
  st3.haLockedUntil = Date.now() + 120000;
  const r3 = await runMeetingAnalysis("会场: 三万九是学期还是一年？", DEFAULT_AGENDA, {
    agentState: st3,
    meetingState: st3,
    trigger: "wake",
    forceRule: true
  });
  const a3 = String(r3.interventionText || r3.fullAnswer || "");
  check("host:闭题每学期", /每学期/.test(a3), a3.slice(0, 64));
}

async function phase5Smoke() {
  const { resolveLlmConfig } = require("../lib/meetingStrategy/llm/providers/resolve.cjs");
  const prevModel = process.env.COPILOT_LLM_MODEL;
  const prevThink = process.env.COPILOT_LLM_THINKING;
  const prevFast = process.env.DOUBAO_CHAT_FAST_MODEL;
  const prevChat = process.env.DOUBAO_CHAT_MODEL;
  const prevKey = process.env.DOUBAO_API_KEY;

  process.env.DOUBAO_API_KEY = process.env.DOUBAO_API_KEY || "sk-smoke";
  process.env.DOUBAO_CHAT_FAST_MODEL = "ep-fast-smoke";
  process.env.DOUBAO_CHAT_MODEL = "ep-host-smoke";
  process.env.COPILOT_LLM_MODEL = "doubao-seed-evolving";
  process.env.COPILOT_LLM_THINKING = "disabled";

  const host = resolveLlmConfig({ fast: true });
  const copilot = resolveLlmConfig({ channel: "copilot" });
  check(
    "resolve:host fast 不抢 Evolving",
    host.model === "ep-fast-smoke",
    host.model
  );
  check(
    "resolve:copilot 用 Seed-Evolving",
    copilot.model === "doubao-seed-evolving" && copilot.channel === "copilot",
    copilot.model
  );
  check("resolve:copilot 默认关 thinking", copilot.disableThinking === true);

  process.env.COPILOT_LLM_THINKING = "enabled";
  const copilotOn = resolveLlmConfig({ channel: "copilot" });
  check("resolve:thinking enabled 可开", copilotOn.disableThinking === false);

  delete process.env.COPILOT_LLM_MODEL;
  const fallback = resolveLlmConfig({ channel: "copilot" });
  check(
    "resolve:无 COPILOT_LLM_MODEL 回退 FAST",
    fallback.model === "ep-fast-smoke",
    fallback.model
  );

  if (prevModel == null) delete process.env.COPILOT_LLM_MODEL;
  else process.env.COPILOT_LLM_MODEL = prevModel;
  if (prevThink == null) delete process.env.COPILOT_LLM_THINKING;
  else process.env.COPILOT_LLM_THINKING = prevThink;
  if (prevFast == null) delete process.env.DOUBAO_CHAT_FAST_MODEL;
  else process.env.DOUBAO_CHAT_FAST_MODEL = prevFast;
  if (prevChat == null) delete process.env.DOUBAO_CHAT_MODEL;
  else process.env.DOUBAO_CHAT_MODEL = prevChat;
  if (prevKey == null) delete process.env.DOUBAO_API_KEY;
  else process.env.DOUBAO_API_KEY = prevKey;
}

async function phase4Smoke() {
  const { alignCopilotFromDraft, evaluateConsult, GATES } = require("../lib/intelligence/index.cjs");
  const { buildCopilotPacket } = require("../lib/copilot/index.cjs");

  const draft = {
    text: "大地合作园项目服务价是三万九千元每学期；外校园价四万九。",
    draftFp: "abc",
    title: "收费",
    arkMode: "faq"
  };
  const pkt = buildCopilotPacket("会场: 三万九是学期还是一年？", {
    agenda: "全园美语教研会",
    skipPrefetch: true,
    force: true,
    speakDraft: draft,
    draftAgeMs: 1000
  });
  check(
    "copilot:draft aligned stage",
    pkt.stage === "aligned" && pkt.aligned === true && /每学期/.test(pkt.suggestions?.push_forward || ""),
    `${pkt.stage} :: ${(pkt.suggestions?.push_forward || "").slice(0, 48)}`
  );
  check(
    "copilot:draftFp 同源",
    pkt.draftFp === "abc",
    pkt.draftFp
  );

  const instant = {
    should_trigger: true,
    target_topic: "收费",
    suggestions: {
      push_forward: "套路推进",
      push_back: "套路回推",
      counter_inquiry: "您最关心哪条？"
    },
    key_facts: []
  };
  const aligned = alignCopilotFromDraft(instant, draft);
  check(
    "align:覆盖 A 为 Draft",
    aligned.aligned && /每学期/.test(aligned.suggestions.push_forward) && !/套路推进/.test(aligned.suggestions.push_forward),
    aligned.suggestions.push_forward.slice(0, 48)
  );

  const st = createMeetingSession("smoke_wr_eval");
  st.mode = "HA_ASK";
  st.haLockedUntil = Date.now() + 120000;
  const ctx = {
    agenda: DEFAULT_AGENDA,
    opts: { forceRule: true, trigger: "wake" },
    state: st,
    a2aTrace: [],
    kbStatus: {},
    floors: ["三万九是学期还是一年？"],
    qFp: "fp",
    askText: "三万九是学期还是一年？",
    lastFloor: "三万九是学期还是一年？",
    rw: { closed: true, rewritten: "三万九是学期还是一年？" },
    useBiz: false
  };
  // prepareAsk 字段已手工填入；直接 evaluate
  const { speakResult, intelligence, path } = await evaluateConsult(ctx);
  const spoken = String(speakResult?.interventionText || speakResult?.fullAnswer || "");
  check("evaluate:path local|agent", path === "local" || path === "agent", path);
  check("evaluate:speaks 每学期", /每学期/.test(spoken), spoken.slice(0, 64));
  check(
    "evaluate:Intelligence draft",
    intelligence &&
      intelligence.gate === GATES.COMMITTED &&
      intelligence.draft &&
      /每学期/.test(intelligence.draft.text),
    intelligence && intelligence.gate
  );
  check(
    "evaluate:state.lastSpeakDraft",
    st.lastSpeakDraft && /每学期/.test(st.lastSpeakDraft.text),
    st.lastSpeakDraft && String(st.lastSpeakDraft.text).slice(0, 40)
  );
}

function phase6Smoke() {
  const state = {
    lastIntelligence: {
      gate: GATES.COMMITTED,
      card: { title: "收费", posterior: 0.82, align: 0.7 },
      draft: { text: "三万九每学期。", draftFp: "obs-fp", arkMode: "faq" },
      debug: { releasedToAgent: false }
    },
    lastSpeakDraft: { text: "三万九每学期。", draftFp: "obs-fp", arkMode: "faq" }
  };
  const obs = observeTurn(state, { stage: "aligned", aligned: true });
  check("observe:gate", obs.gate === GATES.COMMITTED, obs.gate);
  check("observe:draftFp", obs.draftFp === "obs-fp", obs.draftFp);
  check("observe:source aligned", obs.source === "aligned", obs.source);
  check("observe:cardId", /收费/.test(String(obs.cardId || "")), obs.cardId);
  check("observe:posterior", obs.posterior === 0.82, obs.posterior);

  const agentObs = observeTurn(
    {
      lastIntelligence: {
        gate: GATES.AGENT,
        card: { title: "弱卡", posterior: 0.4 },
        debug: { releasedToAgent: true }
      }
    },
    { releasedToAgent: true }
  );
  check("observe:source agent", agentObs.source === "agent", agentObs.source);
  check("observe:releasedToAgent", agentObs.releasedToAgent === true);
}

function phase7Smoke() {
  const childQ = "学习这个课程对孩子有什么帮助？";
  const childFaq = matchFaqInstant(childQ);
  check(
    "faq:child-benefit:hit",
    Boolean(childFaq && /孩子/.test(childFaq.title || "")),
    childFaq && childFaq.title
  );
  check(
    "faq:child-benefit:answer",
    Boolean(childFaq && /开口|ABCmouse|进步|孩子/i.test(childFaq.answer || "")),
    childFaq && String(childFaq.answer || "").slice(0, 48)
  );
  check(
    "faq:child-benefit:not-rollout",
    Boolean(childFaq && !/摸清教师意愿|教师意愿/.test(childFaq.answer || "")),
    childFaq && String(childFaq.answer || "").slice(0, 40)
  );

  const bareBenefit = matchFaqInstant("有什么好处？");
  check(
    "faq:bare-benefit:not-forced-enroll",
    !bareBenefit || !/招生引擎/.test(bareBenefit.answer || "") || /招生|园所/.test(bareBenefit.title || ""),
    bareBenefit && bareBenefit.title
  );

  const badFrame = evaluateFrameMatch(
    childQ,
    "从签约到落地要做哪些准备？",
    "先摸清教师意愿、账号使用、硬件网络"
  );
  check("frame:child≠rollout", badFrame.ok === false, badFrame.why);
  const goodFrame = evaluateFrameMatch(childQ, childFaq && childFaq.title, childFaq && childFaq.answer);
  check("frame:child=child", goodFrame.ok === true, goodFrame.why || goodFrame.ask.audience);

  check(
    "gate:frame_mismatch releases",
    evaluateCommitRelease(
      {
        action: "answer",
        reason: "posterior",
        posterior: 0.96,
        align: 0.8,
        extra: 0,
        title: "从签约到落地要做哪些准备？",
        speak: "先摸清教师意愿"
      },
      { hasKey: true, askText: childQ }
    ).why.includes("audience_mismatch")
  );

  check("tone:不正确", detectUserTone("但是你回答的不正确。") === "retry");
  check(
    "patrol:不正确 immediate",
    shouldImmediatePatrolForUi("但是你回答的不正确。", { mode: AGENT_MODE.HA_ASK }) === true
  );
  check("recall:上一问 still", isRecallLastAsk("我刚刚问了什么问题？") === true);

  const st = {};
  banCard(st, "从签约到落地要做哪些准备？");
  check("correct:window", inCorrectingWindow(st) === true);
  check(
    "gate:low_align_commit releases",
    evaluateCommitRelease(
      { action: "answer", reason: "posterior", posterior: 0.96, align: 0.37, extra: 0 },
      { hasKey: true, forceRule: false }
    ).why === "low_align_commit"
  );
}

hostDraftSmoke()
  .then(() => phase3Smoke())
  .then(() => phase4Smoke())
  .then(() => phase5Smoke())
  .then(() => {
    phase6Smoke();
    phase7Smoke();
    console.log(`\nwave-r smoke: ${pass} pass, ${fail} fail`);
    process.exit(fail ? 1 : 0);
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
