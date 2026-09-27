/**
 * Desktop Kaiban — 大智 AI 会议顾问 v2
 * HH 旁听纠偏 / HH 总结抛题 / HA_ASK 咨询 / HA_TALK 探讨
 */
const { debugLog } = require("./debugLog.cjs");
const {
  DEFAULT_AGENDA,
  getSystemPrompt,
  retrieveKnowledge,
  matchFaqInstant,
  knowledgeStatus
} = require("./knowledge.cjs");
const { retrieveSemantic, semanticStatus } = require("./semanticRag.cjs");
const {
  rewriteQueryRuleBased,
  shouldFaqInstant,
  isBusinessIntent,
  isClosedFaqQuestion,
  isComplexQuestion,
  isResidualUtterance,
  classifyAnswerTier
} = require("./queryRewrite.cjs");
const { runBusinessAdvisor } = require("./businessAdvisor.cjs");
const { sinkAdvisorAnswer } = require("./knowledgeSink.cjs");
const { lookupAnswer, rememberAnswer, clearMeetingCache } = require("./answerCache.cjs");
const {
  stripIntroBoilerplate,
  questionFingerprint,
  looksLikeHostEcho,
  extractFloorLines,
  PHASE
} = require("./duplexPolicy.cjs");
const {
  AGENT_MODE,
  STEER_MAX_PER_SEGMENT,
  STEER_COOLDOWN_MS,
  HA_STICKY_MS,
  MEETING_LIFE,
  normalizeDazhiAliases,
  detectAgentCommand,
  peelWakePayload,
  isSilentMode,
  isConsultMode,
  classifyHaIntent,
  shouldSteerOffTopic,
  isLocalVisitIntent,
  isWhyInvestIntent,
  isTrustChallenge,
  setMode,
  newSegment,
  bumpObjectionLevel,
  setLifecycle,
  deriveMeetingLife
} = require("./agentMode.cjs");
const {
  readSession,
  formatSessionForPrompt,
  writeSummary,
  writeFaqCandidate
} = require("./sessionLog.cjs");

const OPENING_SCRIPT =
  "各位园长好，我是大智。本场围绕全园美语：四端联动、校园经营与家园共育。需要我时请呼叫「大智」；说「谢谢大智」我继续静默听会。";
const ENDING_SCRIPT =
  "好，本场会议先告一段落。转写与要点已记入本场记录，稍后可打开会话目录查看。再会。";
const CONTINUE_SCRIPT = "好，我听着。您接着说，或再说一遍问题，我马上接上。";
const INTERRUPT_ACK = ""; // 打断不播报，只停嘴

const CHAT_ASK_SYSTEM =
  "你是腾讯会议里的「大智」AI 顾问（咨询模式）。依据知识片段给出准确、可落地的短答。\n" +
  "规则：1) 先一句接住人话；2) 经营/招生/倒闭/重生/老师抵触等业务追问必须给一个可落地抓手，禁止「不在解答范围」「只能问定义/主题」类拒答；" +
  "3) 只给一个抓手（谁+做什么+多久）；4) 金句收尾；5) 1—3句口语约70字；6) 数字只能复述知识库；" +
  "7) 明显闲聊/纯闲扯才可简短婉拒并拉回议程；8) 禁止催促、抬杠、鸡血；9) 禁止「我已就位/随时叫我」。";

const CHAT_TALK_SYSTEM =
  "你是腾讯会议里的「大智」思考搭档（探讨模式）。亲和、智慧，陪园长一起想，不硬推单一方案。\n" +
  "结构：理解处境→点出关键张力→给两个可走方向→问对方更卡哪一点。约80字。依据知识但不念稿。禁止编造园名/电话/数据。禁止激进争辩。";

const THINKING_FILLER = "嗯，我想一下。";
const VISIT_HANDOFF =
  "公开信息里暂时没有您本地已落地的参观园名单。请对接大地项目负责人，他们能安排江苏周边示范园，并帮您联系园长看美语日常课和招生转化。";
const TRUST_LINES =
  "我信的不是空话，是这三句您可直接转老师：一、你不用会英语、不用备课；二、你只拍十秒、转发系统报告；三、样板班多出来的美语收入，愿意接的人拿小半补贴。若仍说忙，就先不摊给老师——您先顶一个班看数据。";

function isBillingOverdue(status, body) {
  const s = String(body || "");
  return status === 403 && (/AccountOverdueError/i.test(s) || /overdue|欠费|过期|余额不足/i.test(s));
}

function resolveChatModel(opts = {}) {
  if (opts.fast) {
    return (
      process.env.DOUBAO_CHAT_FAST_MODEL ||
      process.env.DOUBAO_CHAT_MODEL ||
      process.env.DOUBAO_MODEL_ENDPOINT ||
      "doubao-seed-2-1-turbo-260628"
    );
  }
  return (
    process.env.DOUBAO_CHAT_MODEL ||
    process.env.DOUBAO_MODEL_ENDPOINT ||
    "doubao-seed-2-1-turbo-260628"
  );
}

function firstSentence(text) {
  const t = String(text || "").trim();
  if (!t) return "";
  const m = t.match(/^[\s\S]{8,80}?[。！？!?]/);
  if (m) return m[0].trim();
  if (t.length >= 24) return t.slice(0, 36).trim();
  return "";
}

function clipSpeak(text, max = 160) {
  return String(text || "")
    .replace(/^["「]|["」]$/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

function newEvent(sender, target, action, payload = {}) {
  return {
    eventId: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    timestamp: Date.now(),
    sender,
    target,
    action,
    payload
  };
}

function objectionAnswer(level) {
  if (level >= 4) {
    return "核心不是靠加费赚快钱，是用三万九换三个结果：一靠开口成果和公办拉开，保住您现有高收费；二靠特色拉高续费，少花招生钱；三靠延时非教收两三百增量，给配合老师发补贴。金句：先护盘，再用增量养老师。";
  }
  if (level >= 3) {
    return "那就锁县城最小的一个整班做样板，不雇人、不跨班抽人。每天约五分钟：非教片段和开口数据一键进家长群，总部给配文。金句：一整班、五分钟、一键转。";
  }
  if (level >= 2) {
    return "先不要求全员老师参与。您先顶第一个样板班的发视频和转发；一个月若有美语加收，再从增量里拿小半给愿意接的老师。金句：用项目赚的钱养配合，不挤原工资包。";
  }
  return "不碰全员，先做一个月样板班：总部课件加非教，老师不备课，只拍十秒视频发群；您盯班攒开口实拍。金句：先出样板，再谈铺开。";
}

function baseResult(extra) {
  return {
    shouldIntervene: false,
    interventionText: "",
    reason: "OK",
    latestToDos: [],
    nextStageRecommendation: null,
    a2aTrace: [],
    arkConfigured: Boolean((process.env.DOUBAO_API_KEY || process.env.ARK_API_KEY || "").trim()),
    arkMode: "skip",
    arkBillingOverdue: false,
    arkError: null,
    agentMode: AGENT_MODE.HH,
    modeChange: null,
    ...extra
  };
}

function playAnswer(text, reason, state, a2aTrace, kbStatus, qFp, arkMode, meta = {}) {
  const answer = stripIntroBoilerplate(clipSpeak(text, 160));
  a2aTrace.push(newEvent("HostAgent", "AudioBridge", "PLAY_ANSWER", { ttsText: answer, reason }));
  if (meta.cacheQuestion && answer && state?.meetingId) {
    rememberAnswer(state.meetingId, {
      question: meta.cacheQuestion,
      tts: answer,
      arkMode: arkMode || "template"
    });
  }
  return {
    shouldIntervene: true,
    interventionText: answer,
    fullAnswer: answer,
    reason,
    latestToDos: [],
    nextStageRecommendation: "MainDiscussion",
    a2aTrace,
    arkConfigured: true,
    arkMode: arkMode || "template",
    arkBillingOverdue: false,
    arkError: null,
    agentMode: state.mode,
    kbStatus,
    questionFp: qFp || "",
    wake: { lastFloor: "" }
  };
}

async function arkChatStream(system, user, opts = {}) {
  const apiKey = (process.env.DOUBAO_API_KEY || process.env.ARK_API_KEY || "").trim();
  const model = opts.model || resolveChatModel(opts);
  if (!apiKey) return { ok: false, content: null, error: "no_api_key", billingOverdue: false };
  if (opts.signal?.aborted) return { ok: false, content: null, error: "aborted", billingOverdue: false };
  debugLog.info("Kaiban", "arkChat stream request", { model, systemLen: system.length, userLen: user.length });
  let response;
  try {
    response = await fetch("https://ark.cn-beijing.volces.com/api/v3/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user }
        ],
        temperature: opts.temperature != null ? opts.temperature : 0.3,
        stream: true
      }),
      signal: opts.signal
    });
  } catch (err) {
    if (opts.signal?.aborted || err?.name === "AbortError") {
      return { ok: false, content: null, error: "aborted", billingOverdue: false };
    }
    throw err;
  }
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    return {
      ok: false,
      content: null,
      error: `Ark HTTP ${response.status}`,
      status: response.status,
      billingOverdue: isBillingOverdue(response.status, body)
    };
  }
  let content = "";
  const reader = response.body?.getReader?.();
  if (!reader) {
    const raw = await response.text();
    for (const line of raw.split(/\n/)) {
      if (!line.startsWith("data:")) continue;
      const payload = line.slice(5).trim();
      if (!payload || payload === "[DONE]") continue;
      try {
        const j = JSON.parse(payload);
        content += j.choices?.[0]?.delta?.content || "";
      } catch (_) {}
    }
  } else {
    const decoder = new TextDecoder();
    let buf = "";
    while (true) {
      if (opts.signal?.aborted) {
        try {
          await reader.cancel();
        } catch (_) {}
        return { ok: false, content: null, error: "aborted", billingOverdue: false };
      }
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      const parts = buf.split("\n");
      buf = parts.pop() || "";
      for (const line of parts) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data:")) continue;
        const payload = trimmed.slice(5).trim();
        if (!payload || payload === "[DONE]") continue;
        try {
          const j = JSON.parse(payload);
          const delta = j.choices?.[0]?.delta?.content || "";
          if (!delta) continue;
          content += delta;
        } catch (_) {}
      }
    }
  }
  if (!content) return { ok: false, content: null, error: "empty_stream", billingOverdue: false };
  debugLog.info("Kaiban", "arkChat stream ok", { preview: content.slice(0, 120) });
  return { ok: true, content, error: null, billingOverdue: false };
}

async function arkChat(system, user, opts = {}) {
  const apiKey = (process.env.DOUBAO_API_KEY || process.env.ARK_API_KEY || "").trim();
  const model = resolveChatModel(opts);
  if (!apiKey) return { ok: false, content: null, error: "no_api_key", billingOverdue: false };
  if (opts.signal?.aborted) return { ok: false, content: null, error: "aborted", billingOverdue: false };
  if (opts.stream) return arkChatStream(system, user, { ...opts, model });
  debugLog.info("Kaiban", "arkChat request", {
    model,
    systemLen: system.length,
    userLen: user.length,
    userPreview: user.slice(0, 160)
  });
  let response;
  try {
    response = await fetch("https://ark.cn-beijing.volces.com/api/v3/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user }
        ],
        temperature: opts.temperature != null ? opts.temperature : 0.3
      }),
      signal: opts.signal
    });
  } catch (err) {
    if (opts.signal?.aborted || err?.name === "AbortError") {
      return { ok: false, content: null, error: "aborted", billingOverdue: false };
    }
    throw err;
  }
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    return {
      ok: false,
      content: null,
      error: `Ark HTTP ${response.status}`,
      status: response.status,
      billingOverdue: isBillingOverdue(response.status, body)
    };
  }
  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || null;
  debugLog.info("Kaiban", "arkChat ok", { preview: String(content || "").slice(0, 160) });
  return { ok: true, content, error: null, billingOverdue: false };
}

/**
 * P0：思考占位仅 UI；正式答整段一次 TTS（不再 early+queue 拆播）。
 */
async function speakViaChat(system, userTask, opts, a2aTrace) {
  let thinkingTimer = null;
  const armThinking = () => {
    thinkingTimer = setTimeout(() => {
      a2aTrace.push(newEvent("HostAgent", "AudioBridge", "THINKING_FILLER", { text: THINKING_FILLER, uiOnly: true }));
      Promise.resolve(opts.onThinking?.(THINKING_FILLER)).catch(() => {});
    }, 650);
  };
  const clearThinking = () => {
    if (thinkingTimer) clearTimeout(thinkingTimer);
    thinkingTimer = null;
  };
  let answer = "";
  let arkBillingOverdue = false;
  let arkError = null;
  let arkMode = "llm";
  try {
    if (opts.signal?.aborted) throw new Error("aborted");
    armThinking();
    let res = await arkChat(system, userTask, {
      fast: true,
      stream: true,
      temperature: opts.temperature,
      signal: opts.signal
    });
    if (opts.signal?.aborted || res.error === "aborted") {
      clearThinking();
      return {
        answer: "",
        speakTail: "",
        spokenPrefix: "",
        earlyCovered: false,
        arkMode: "aborted",
        arkBillingOverdue: false,
        arkError: "aborted",
        aborted: true
      };
    }
    if (!res.ok || !res.content) {
      res = await arkChat(system, userTask, {
        fast: true,
        stream: false,
        temperature: opts.temperature,
        signal: opts.signal
      });
    }
    clearThinking();
    if (opts.signal?.aborted || res.error === "aborted") {
      return {
        answer: "",
        speakTail: "",
        spokenPrefix: "",
        earlyCovered: false,
        arkMode: "aborted",
        arkBillingOverdue: false,
        arkError: "aborted",
        aborted: true
      };
    }
    if (res.billingOverdue) {
      arkBillingOverdue = true;
      arkError = res.error;
    }
    if (res.ok && res.content) answer = stripIntroBoilerplate(clipSpeak(res.content, opts.maxLen || 100));
    else throw new Error(res.error || "empty");
  } catch (err) {
    clearThinking();
    if (opts.signal?.aborted || err?.message === "aborted" || err?.name === "AbortError") {
      return {
        answer: "",
        speakTail: "",
        spokenPrefix: "",
        earlyCovered: false,
        arkMode: "aborted",
        arkBillingOverdue: false,
        arkError: "aborted",
        aborted: true
      };
    }
    arkMode = "heuristic";
    debugLog.warn("Kaiban", "对话回退", { error: String(err?.message || err) });
    answer = opts.fallback || "我在。请再说具体一点，我结合资料答您。";
  }
  // 整段一次播报：speakTail = 全文，无 early 前缀
  return {
    answer,
    speakTail: answer,
    spokenPrefix: "",
    earlyCovered: false,
    arkMode,
    arkBillingOverdue,
    arkError,
    aborted: false
  };
}

async function runSummaryPath(state, agenda, opts, a2aTrace, kbStatus, withTopic) {
  setMode(state, AGENT_MODE.HH_SUM);
  setLifecycle(state, MEETING_LIFE.SUMMARY);
  const rows = readSession(state.meetingId, { segmentId: state.segmentId, limit: 40 });
  const fallbackRows = rows.length ? rows : readSession(state.meetingId, { limit: 30 });
  const body = formatSessionForPrompt(fallbackRows, 2800) || "（本段暂无足够转写）";
  let summaryText = "";
  let topicText = "";
  try {
    const res = await arkChat(
      "你是大智会议秘书。根据转写输出：1) 口播用极短总结（≤40字，一两句）；2) 一行「下一议题：…」必须可执行（谁/哪班/做什么）。不要套话。",
      `议程：${agenda}\n转写：\n${body}\n\n按格式：\n总结：...\n下一议题：...`,
      { fast: true, temperature: 0.3 }
    );
    if (res.ok && res.content) {
      const raw = res.content;
      const sm = raw.match(/总结[:：]\s*([\s\S]+?)(?=下一议题|$)/);
      const tm = raw.match(/下一议题[:：]\s*([\s\S]+)/);
      summaryText = clipSpeak((sm ? sm[1] : raw).trim(), 80);
      topicText = clipSpeak((tm ? tm[1] : "").trim(), 60);
    }
  } catch (_) {}
  if (!summaryText) summaryText = "这段已记录。建议下一步把可执行动作落到具体班级和负责人。";
  if (withTopic && !topicText) topicText = "下一议题：确定样板班班级与每日五分钟转发谁来盯。";
  const md =
    `【大智会议纪要】\n时段：${new Date().toISOString()}\n议程：${agenda}\n\n` +
    `核心结论：\n${summaryText}\n\n` +
    (topicText ? `建议下一议题：\n${topicText}\n\n` : "") +
    `转写摘录：\n${body.slice(0, 1500)}\n`;
  writeSummary(state.meetingId, md);
  writeFaqCandidate(state.meetingId, `候选：${summaryText}`);
  const speak = withTopic && topicText ? `${summaryText} ${topicText}` : summaryText;
  a2aTrace.push(newEvent("SecretaryAgent", "HostAgent", "SEGMENT_SUMMARY", { summaryText, topicText }));
  newSegment(state);
  setMode(state, AGENT_MODE.IDLE_LISTEN);
  setLifecycle(state, state.meetingOpen ? MEETING_LIFE.SILENT : MEETING_LIFE.OFF);
  return {
    shouldIntervene: true,
    interventionText: stripIntroBoilerplate(clipSpeak(speak, 140)),
    fullAnswer: speak,
    displayText: speak,
    reason: "SUMMARY",
    latestToDos: topicText ? [topicText] : ["继续围绕议程讨论"],
    nextStageRecommendation: "MainDiscussion",
    a2aTrace,
    arkConfigured: true,
    arkMode: "llm",
    arkBillingOverdue: false,
    arkError: null,
    agentMode: state.mode,
    modeChange: AGENT_MODE.IDLE_LISTEN,
    kbStatus,
    summaryMarkdown: md,
    meetingLifecycle: deriveMeetingLife(state)
  };
}

/** P2：会末总结 — 结论 / 分歧 / 待办 / 下一步 */
async function runClosingPath(state, agenda, opts, a2aTrace, kbStatus) {
  setLifecycle(state, MEETING_LIFE.CLOSING);
  setMode(state, AGENT_MODE.HH_SUM);
  const rows = readSession(state.meetingId, { limit: 60 });
  const body = formatSessionForPrompt(rows, 3200) || "（本场暂无足够转写）";
  let conclusions = "";
  let disputes = "";
  let todos = "";
  let nextStep = "";
  try {
    const res = await arkChat(
      "你是大智会议秘书。根据整场转写写会末纪要，口语可播。禁止空话、禁止编造未出现的人名/数字。",
      `议程：${agenda}\n转写：\n${body}\n\n严格按四行输出：\n结论：...\n分歧：...\n待办：...\n下一步：...`,
      { fast: true, temperature: 0.25 }
    );
    if (res.ok && res.content) {
      const raw = res.content;
      conclusions = clipSpeak((raw.match(/结论[:：]\s*([\s\S]+?)(?=分歧|$)/) || [])[1] || "", 100);
      disputes = clipSpeak((raw.match(/分歧[:：]\s*([\s\S]+?)(?=待办|$)/) || [])[1] || "", 80);
      todos = clipSpeak((raw.match(/待办[:：]\s*([\s\S]+?)(?=下一步|$)/) || [])[1] || "", 100);
      nextStep = clipSpeak((raw.match(/下一步[:：]\s*([\s\S]+)/) || [])[1] || "", 80);
    }
  } catch (_) {}
  if (!conclusions) conclusions = "本场已记录关键讨论，请主持人核对转写确认要点。";
  if (!disputes) disputes = "暂无明确分歧记录。";
  if (!todos) todos = "请主持人指定跟进人与截止时间。";
  if (!nextStep) nextStep = "会后打开本场会话目录核对纪要，需要沉淀再说「知识升格」。";

  const md =
    `【大智会末纪要】\n时间：${new Date().toISOString()}\n会议：${state.meetingId}\n议程：${agenda}\n\n` +
    `## 结论\n${conclusions}\n\n` +
    `## 分歧\n${disputes}\n\n` +
    `## 待办\n${todos}\n\n` +
    `## 下一步\n${nextStep}\n\n` +
    `## 转写摘录\n${body.slice(0, 2000)}\n`;
  writeSummary(state.meetingId, md);
  writeFaqCandidate(state.meetingId, `会末：${conclusions}`);

  const speak = clipSpeak(
    `好，本场先到这里。结论：${conclusions} 待办：${todos} 下一步：${nextStep} 纪要已写入本场记录。`,
    160
  );
  a2aTrace.push(
    newEvent("SecretaryAgent", "HostAgent", "MEETING_CLOSE_SUMMARY", {
      conclusions: conclusions.slice(0, 60),
      todos: todos.slice(0, 60)
    })
  );

  state.meetingOpen = false;
  state.holdToEnd = false;
  state.interrupted = false;
  state.interruptBuffer = null;
  state.holdFloorLines = [];
  setMode(state, AGENT_MODE.IDLE_LISTEN, { newSegment: true });
  setLifecycle(state, MEETING_LIFE.CLOSING);

  return {
    shouldIntervene: true,
    interventionText: stripIntroBoilerplate(speak),
    fullAnswer: speak,
    displayText: speak,
    reason: "MEETING_END",
    interruptTts: true,
    latestToDos: [todos, nextStep].filter(Boolean),
    a2aTrace,
    arkConfigured: true,
    arkMode: conclusions.includes("请主持人核对") ? "heuristic" : "llm",
    arkBillingOverdue: false,
    arkError: null,
    agentMode: state.mode,
    modeChange: AGENT_MODE.IDLE_LISTEN,
    kbStatus,
    summaryMarkdown: md,
    requestSessionPromote: true,
    requestListenStop: true,
    meetingId: state.meetingId,
    meetingLifecycle: MEETING_LIFE.CLOSING,
    closing: { conclusions, disputes, todos, nextStep }
  };
}

function recentFloorsSafe(floors) {
  return (floors || []).slice(-4).join("；");
}

async function runMeetingAnalysis(recentTranscript, currentAgenda, opts = {}) {
  const a2aTrace = [];
  const transcript = (recentTranscript || "").trim();
  const agenda = currentAgenda || DEFAULT_AGENDA;
  const kbStatus = knowledgeStatus();
  const state = opts.agentState;
  if (!state) {
    debugLog.error("Kaiban", "缺少 agentState");
    return baseResult({ reason: "NO_STATE", a2aTrace, kbStatus });
  }

  const floors = extractFloorLines(transcript, 4).map((l) => normalizeDazhiAliases(l));
  let lastFloor =
    floors[floors.length - 1] || normalizeDazhiAliases(transcript.split("\n").pop() || "");
  const sinceHostMs = opts.lastHostSpeakAt ? Date.now() - opts.lastHostSpeakAt : null;
  const lastHostText = String(opts.lastHostSpeakText || "").trim();
  const echoHit = looksLikeHostEcho(lastFloor, [lastHostText].filter(Boolean), { sinceHostMs });
  if (echoHit.echo) {
    a2aTrace.push(newEvent("HostAgent", "AudioBridge", "ECHO_SKIP", { floor: lastFloor, echo: echoHit }));
    return baseResult({
      reason: "ECHO_SKIP",
      a2aTrace,
      agentMode: state.mode,
      kbStatus,
      wake: { lastFloor, echoSkipped: true }
    });
  }

  const cmd = detectAgentCommand(lastFloor);
  const qFp = questionFingerprint(lastFloor);
  /** 「请继续」后若夹了新内容，改写进本轮问句 */
  let continuePayload = "";
  debugLog.info("Kaiban", "策略快照", {
    mode: state.mode,
    command: cmd.command,
    lastFloor: lastFloor.slice(0, 80),
    segmentId: state.segmentId,
    objectionLevel: state.objectionLevel,
    trigger: opts.trigger
  });
  a2aTrace.push(
    newEvent("DirectorAgent", "HostAgent", "MODE_SNAPSHOT", {
      mode: state.mode,
      command: cmd.command,
      segmentId: state.segmentId
    })
  );

  if (cmd.command === "PAUSE_LOG") {
    setMode(state, AGENT_MODE.PAUSED);
    return baseResult({
      shouldIntervene: true,
      interventionText: "好，记录已暂停。",
      reason: "MODE_PAUSE",
      a2aTrace,
      agentMode: state.mode,
      modeChange: AGENT_MODE.PAUSED,
      kbStatus
    });
  }
  if (cmd.command === "RESUME_LOG") {
    setMode(state, AGENT_MODE.HH);
    return baseResult({
      shouldIntervene: true,
      interventionText: "好，继续旁听记录。",
      reason: "MODE_RESUME",
      a2aTrace,
      agentMode: state.mode,
      modeChange: AGENT_MODE.HH,
      kbStatus
    });
  }
  if (cmd.command === "STOP") {
    setMode(state, AGENT_MODE.IDLE_LISTEN, { newSegment: true });
    state.holdToEnd = false;
    state.interrupted = false;
    state.interruptBuffer = null;
    state.holdFloorLines = [];
    setLifecycle(state, state.meetingOpen ? MEETING_LIFE.SILENT : MEETING_LIFE.OFF);
    return baseResult({
      shouldIntervene: true,
      interventionText: "好，我继续静默旁听。需要时请再呼叫大智。",
      reason: "STOP",
      interruptTts: true,
      a2aTrace,
      agentMode: state.mode,
      modeChange: AGENT_MODE.IDLE_LISTEN,
      kbStatus,
      meetingLifecycle: deriveMeetingLife(state)
    });
  }

  if (cmd.command === "MEETING_START") {
    const prevId = state.meetingId;
    const newId = `mtg_${Date.now()}`;
    state.meetingId = newId;
    newSegment(state);
    state.meetingOpen = true;
    state.agenda = agenda;
    state.holdToEnd = false;
    state.interrupted = false;
    state.lastInterruptedText = "";
    state.interruptBuffer = null;
    state.holdFloorLines = [];
    state.bizFollowUps = 0;
    state.summaryPendingConfirm = false;
    state.objectionLevel = 1;
    try {
      if (prevId) clearMeetingCache(prevId);
      clearMeetingCache(newId);
    } catch (_) {}
    setMode(state, AGENT_MODE.IDLE_LISTEN);
    setLifecycle(state, MEETING_LIFE.OPENING);
    const openLine = `各位园长好，我是大智。本场围绕${clipSpeak(agenda, 36)}。需要我时请呼叫「大智」；说「谢谢大智」我继续静默听会。`;
    debugLog.info("Kaiban", "会议开始", { meetingId: newId, agenda: agenda.slice(0, 40), prevId });
    a2aTrace.push(
      newEvent("DirectorAgent", "HostAgent", "MEETING_START", { meetingId: newId, agenda: agenda.slice(0, 40) })
    );
    return baseResult({
      shouldIntervene: true,
      interventionText: openLine,
      fullAnswer: openLine,
      reason: "MEETING_START",
      a2aTrace,
      agentMode: state.mode,
      modeChange: AGENT_MODE.IDLE_LISTEN,
      kbStatus,
      meetingId: newId,
      agenda,
      meetingLifecycle: MEETING_LIFE.OPENING,
      clearMainContext: true,
      warmKnowledge: true
    });
  }

  if (cmd.command === "MEETING_END") {
    debugLog.info("Kaiban", "会议结束 → 会末总结", { meetingId: state.meetingId });
    return await runClosingPath(state, agenda, opts, a2aTrace, kbStatus);
  }

  if (cmd.command === "INTERRUPT" || (cmd.interrupt && cmd.holdToEnd)) {
    state.holdToEnd = true;
    state.interrupted = true;
    state.interruptAt = Date.now();
    const full = String(
      state.interruptBuffer?.fullText || opts.lastHostSpeakText || state.lastInterruptedText || ""
    ).slice(0, 800);
    state.lastInterruptedText = full;
    state.interruptBuffer = {
      fullText: full,
      interruptedAt: state.interruptAt,
      chunks: Number(state.interruptBuffer?.chunks || opts.interruptChunks || 0)
    };
    state.holdFloorLines = [];
    setLifecycle(state, MEETING_LIFE.HOLD);
    debugLog.info("Kaiban", "打断，请听", {
      floor: lastFloor.slice(0, 40),
      lastHost: full.slice(0, 40)
    });
    return baseResult({
      shouldIntervene: false,
      reason: "INTERRUPT",
      interruptTts: true,
      a2aTrace,
      agentMode: state.mode,
      kbStatus,
      holdToEnd: true,
      meetingLifecycle: MEETING_LIFE.HOLD
    });
  }

  if (cmd.command === "CONTINUE" || cmd.continueSpeak) {
    state.holdToEnd = false;
    const wasHold = state.interrupted;
    state.interrupted = false;
    const holdNote = (state.holdFloorLines || []).join("").trim();
    state.holdFloorLines = [];
    const leftover = String(
      state.interruptBuffer?.fullText || state.lastInterruptedText || opts.lastHostSpeakText || ""
    ).trim();
    state.interruptBuffer = null;
    let floorNote = peelWakePayload(lastFloor)
      .replace(/^(请继续|你继续|接着说|继续说|继续答|继续讲)[，,。.\s]*/g, "")
      .trim();
    if (/^(请继续|你继续|接着说|继续)[。.!！？?\s]*$/.test(floorNote)) floorNote = "";

    // 打断后用户已补充实质内容 → 按新问题重答
    const reask = (holdNote.length >= 8 ? holdNote : "") || (floorNote.length >= 8 ? floorNote : "");
    if (reask) {
      setMode(state, AGENT_MODE.HA_ASK);
      setLifecycle(state, MEETING_LIFE.CONSULT);
      lastFloor = reask;
      continuePayload = reask;
      debugLog.info("Kaiban", "请继续：按打断后补充重答", {
        sticky: true,
        until: state.haLockedUntil,
        payload: reask.slice(0, 40)
      });
    } else if (wasHold && leftover) {
      setMode(state, isConsultMode(state.mode) ? state.mode : AGENT_MODE.HA_ASK);
      setLifecycle(state, MEETING_LIFE.CONSULT);
      debugLog.info("Kaiban", "请继续：续播上一答", { leftover: leftover.slice(0, 40) });
      return playAnswer(leftover, "CONTINUE", state, a2aTrace, kbStatus, qFp, "cache", {
        cacheQuestion: leftover.slice(0, 40)
      });
    } else {
      setMode(state, AGENT_MODE.HA_ASK);
      setLifecycle(state, MEETING_LIFE.CONSULT);
      debugLog.info("Kaiban", "请继续：无缓冲，短确认", { sticky: true });
      return baseResult({
        shouldIntervene: true,
        interventionText: CONTINUE_SCRIPT,
        reason: "CONTINUE",
        a2aTrace,
        agentMode: state.mode,
        kbStatus,
        meetingLifecycle: MEETING_LIFE.CONSULT
      });
    }
  }

  if (cmd.command === "CONTINUE_HH") {
    setMode(state, AGENT_MODE.HH);
    return baseResult({
      shouldIntervene: true,
      interventionText: "好，你们继续，我旁听。",
      reason: "CONTINUE_HH",
      a2aTrace,
      agentMode: state.mode,
      modeChange: AGENT_MODE.HH,
      kbStatus
    });
  }

  // P1：打断占麦期间积累会场补充，不插话（含像提问的 WAKE_ASK，等「请继续」）
  if (state.holdToEnd && !cmd.sayDone) {
    const note = String(peelWakePayload(lastFloor) || lastFloor || "").trim();
    if (note.length >= 2 && note.length < 160) {
      if (!Array.isArray(state.holdFloorLines)) state.holdFloorLines = [];
      const prev = state.holdFloorLines[state.holdFloorLines.length - 1] || "";
      if (note !== prev) {
        state.holdFloorLines.push(note.slice(0, 120));
        if (state.holdFloorLines.length > 8) state.holdFloorLines.shift();
      }
      debugLog.info("Kaiban", "打断中收听补充", { note: note.slice(0, 40), n: state.holdFloorLines.length });
    }
    return baseResult({ reason: "HOLDING", a2aTrace, agentMode: state.mode, kbStatus, holdToEnd: true });
  }
  if (cmd.sayDone && state.holdToEnd) {
    // 「我说完了」→ 若有补充则当提问；否则等同请继续续播
    state.holdToEnd = false;
    const holdNote = (state.holdFloorLines || []).join("").trim();
    state.holdFloorLines = [];
    if (holdNote.length >= 8) {
      state.interrupted = false;
      lastFloor = holdNote;
      setMode(state, AGENT_MODE.HA_ASK);
      debugLog.info("Kaiban", "我说完了：按补充作答", { payload: holdNote.slice(0, 40) });
    } else {
      const leftover = String(
        state.interruptBuffer?.fullText || state.lastInterruptedText || opts.lastHostSpeakText || ""
      ).trim();
      state.interrupted = false;
      state.interruptBuffer = null;
      if (leftover) {
        setMode(state, isConsultMode(state.mode) ? state.mode : AGENT_MODE.HA_ASK);
        return playAnswer(leftover, "CONTINUE", state, a2aTrace, kbStatus, qFp, "cache", {
          cacheQuestion: leftover.slice(0, 40)
        });
      }
    }
  } else if (cmd.sayDone) {
    state.holdToEnd = false;
  }

  if (
    cmd.command === "WAKE" ||
    cmd.command === "WAKE_ASK" ||
    cmd.command === "WAKE_TALK" ||
    (cmd.named && (state.mode === AGENT_MODE.HH || state.mode === AGENT_MODE.IDLE_LISTEN))
  ) {
    const ha = classifyHaIntent(lastFloor, state.mode);
    const onlyGreeting =
      /^(大智|大致)?\s*(你好|在吗|您好)?[。.!！？?\s]*$/.test(lastFloor.replace(/\s/g, "")) ||
      cmd.presence ||
      (cmd.command === "WAKE" && !/吗|呢|什么|怎么|为何|多少/.test(lastFloor) && lastFloor.length < 14);
    setMode(state, ha === "HA_TALK" ? AGENT_MODE.HA_TALK : AGENT_MODE.HA_ASK);
    if (onlyGreeting) {
      return baseResult({
        shouldIntervene: true,
        interventionText: "我是大智，请讲。全园美语或园所经营招生，都可以直接说。",
        reason: "WAKE_ACK",
        a2aTrace,
        agentMode: state.mode,
        modeChange: state.mode,
        kbStatus,
        questionFp: qFp
      });
    }
  }

  if (cmd.command === "SUMMARY") {
    return await runSummaryPath(state, agenda, opts, a2aTrace, kbStatus, true);
  }
  // P0：静默默认不主动问「要不要总结」，避免像豆包插话
  if (
    cmd.command === "CONFIRM_SUMMARY" ||
    (state.summaryPendingConfirm && /要总结|需要|总结吧|可以/.test(cmd.text))
  ) {
    state.summaryPendingConfirm = false;
    return await runSummaryPath(state, agenda, opts, a2aTrace, kbStatus, true);
  }

  if (state.mode === AGENT_MODE.HA_ASK || state.mode === AGENT_MODE.HA_TALK || state.mode === AGENT_MODE.HA_BIZ) {
    if (
      !cmd.named &&
      cmd.command !== "CONTINUE" &&
      cmd.command !== "WAKE_ASK" &&
      Date.now() > (state.haLockedUntil || 0)
    ) {
      setMode(state, AGENT_MODE.IDLE_LISTEN);
      debugLog.info("Kaiban", "咨询粘滞到期，回静默", { stickyMs: HA_STICKY_MS });
      return baseResult({
        reason: "HA_TIMEOUT_SILENT",
        a2aTrace,
        agentMode: state.mode,
        modeChange: AGENT_MODE.IDLE_LISTEN,
        kbStatus
      });
    }
    if (
      qFp &&
      opts.lastQuestionFp === qFp &&
      opts.lastQuestionAt &&
      Date.now() - opts.lastQuestionAt < 45000
    ) {
      return baseResult({ reason: "DEDUP_SKIP", a2aTrace, agentMode: state.mode, kbStatus, questionFp: qFp });
    }
    if (isLocalVisitIntent(lastFloor)) {
      setMode(state, AGENT_MODE.HA_ASK);
      return playAnswer(VISIT_HANDOFF, "WAKE_ANSWER", state, a2aTrace, kbStatus, qFp, "faq");
    }
    if (isTrustChallenge(lastFloor)) {
      bumpObjectionLevel(state, lastFloor);
      return playAnswer(TRUST_LINES, "WAKE_ANSWER", state, a2aTrace, kbStatus, qFp, "template");
    }
    if (isWhyInvestIntent(lastFloor)) {
      state.objectionLevel = Math.max(state.objectionLevel || 1, 4);
      return playAnswer(objectionAnswer(4), "WAKE_ANSWER", state, a2aTrace, kbStatus, qFp, "template");
    }
    const lvl = bumpObjectionLevel(state, lastFloor);
    if (/(抵触|不愿意做|执行不下去|加负担|崩溃)/.test(lastFloor)) {
      const talk = classifyHaIntent(lastFloor, state.mode) === "HA_TALK";
      setMode(state, talk ? AGENT_MODE.HA_TALK : AGENT_MODE.HA_ASK);
      return playAnswer(objectionAnswer(lvl), "WAKE_ANSWER", state, a2aTrace, kbStatus, qFp, "template");
    }

    // —— 步骤1：问句改写 ——
    const rw = rewriteQueryRuleBased({
      lastFloor:
        cmd.named && cmd.payload && cmd.payload.length >= 2 ? cmd.payload : lastFloor,
      recentFloors: floors,
      lastHostAnswer: String(opts.lastHostSpeakText || "")
    });
    const askText = rw.rewritten || lastFloor;
    a2aTrace.push(
      newEvent("DirectorAgent", "HostAgent", "QUERY_REWRITE", {
        original: lastFloor.slice(0, 80),
        rewritten: askText.slice(0, 100),
        complex: rw.complex,
        closed: rw.closed,
        business: rw.business,
        residual: rw.residual,
        followUp: rw.followUp
      })
    );
    debugLog.info("Kaiban", "问句改写", {
      original: lastFloor.slice(0, 60),
      rewritten: askText.slice(0, 80),
      complex: rw.complex,
      business: rw.business,
      residual: rw.residual,
      closed: rw.closed
    });

    // 残句「一是」「美语是。」：旁听，禁止 LLM（避免拖 15–25s）
    if (
      (rw.residual || isResidualUtterance(askText) || isResidualUtterance(lastFloor)) &&
      !cmd.named &&
      !cmd.command
    ) {
      debugLog.info("Kaiban", "残句跳过", { text: askText.slice(0, 40) });
      return baseResult({
        reason: "RESIDUAL_SKIP",
        a2aTrace,
        agentMode: state.mode,
        kbStatus,
        wake: { lastFloor, residual: true }
      });
    }

    const haMode = classifyHaIntent(lastFloor, state.mode);
    // 闭题禁止经营顾问（即使 ASR 粘了「招生引擎」等词）
    const useBiz =
      !rw.closed &&
      !isClosedFaqQuestion(askText) &&
      (rw.business || isBusinessIntent(askText));
    if (useBiz) {
      setMode(state, AGENT_MODE.HA_BIZ);
    } else {
      setMode(state, haMode === "HA_TALK" ? AGENT_MODE.HA_TALK : AGENT_MODE.HA_ASK);
    }
    state.haLockedUntil = Date.now() + 90000;

    // —— 会中答后缓存：同场重复问秒答 ——
    const cached = lookupAnswer(state.meetingId, askText) || lookupAnswer(state.meetingId, lastFloor);
    if (cached?.tts && !useBiz) {
      a2aTrace.push(
        newEvent("DirectorAgent", "HostAgent", "ANSWER_CACHE_HIT", {
          q: askText.slice(0, 60),
          hits: cached.hits
        })
      );
      return playAnswer(cached.tts, "WAKE_ANSWER", state, a2aTrace, kbStatus, qFp, "cache", {
        cacheQuestion: askText
      });
    }

    // —— 闭题优先 FAQ 秒答（句尾抠核后匹配，禁止再走慢 Chat）——
    const faqHit = matchFaqInstant(askText);
    if (
      !useBiz &&
      (rw.closed || isClosedFaqQuestion(askText) || state.mode === AGENT_MODE.HA_ASK) &&
      shouldFaqInstant(askText, faqHit, {
        minScore: rw.closed || isClosedFaqQuestion(askText) ? 22 : 45
      })
    ) {
      const answer = stripIntroBoilerplate(clipSpeak(faqHit.answer, 120));
      return playAnswer(answer, "WAKE_ANSWER", state, a2aTrace, kbStatus, qFp, "faq", {
        cacheQuestion: askText
      });
    }

    // —— 经营顾问 L2 / L3 ——
    if (useBiz) {
      const tier = classifyAnswerTier(askText, {
        bizFollowUps: state.bizFollowUps || 0
      });
      const deep = tier === "L3";
      opts.onStatus?.({
        phase: "thinking",
        reason: deep ? "HA_BIZ_DEEP" : "HA_BIZ",
        tier
      });
      const biz = await runBusinessAdvisor({
        question: askText,
        recentFloors: floors,
        lastHostAnswer: String(opts.lastHostSpeakText || ""),
        agenda,
        signal: opts.signal,
        onStatus: opts.onStatus,
        tier,
        meetingId: state.meetingId,
        bizFollowUps: state.bizFollowUps || 0
      });
      if (biz.usedLlm) {
        state.bizFollowUps = (state.bizFollowUps || 0) + 1;
      } else {
        state.bizFollowUps = 0;
      }
      a2aTrace.push(
        newEvent("BusinessAdvisorAgent", "HostAgent", "BIZ_PLAN", {
          tier: biz.tier || tier,
          stage: biz.diagnose?.stage,
          gardenCount: biz.diagnose?.gardenCount,
          tts: biz.plan?.tts?.slice?.(0, 60),
          steps: biz.plan?.steps?.length,
          ragMode: biz.retrieval?.mode,
          usedLlm: biz.usedLlm,
          arkMode: biz.arkMode
        })
      );
      a2aTrace.push(
        newEvent("ResearcherAgent", "HostAgent", "RAG_HIT", {
          hits: (biz.retrieval?.hits || []).map((h) => ({
            title: h.title,
            score: h.score,
            source: h.source
          })),
          mode: "HA_BIZ",
          tier: biz.tier || tier
        })
      );
      const tts = stripIntroBoilerplate(clipSpeak(biz.plan?.tts || "", 100));
      rememberAnswer(state.meetingId, {
        question: askText,
        tts,
        arkMode: biz.arkMode || "biz-agent"
      });
      const result = playAnswer(tts, "BIZ_ANSWER", state, a2aTrace, kbStatus, qFp, biz.arkMode || "biz-agent", {
        cacheQuestion: askText
      });
      result.displayText = tts;
      result.bizPlan = biz.plan;
      result.bizTier = biz.tier || tier;
      const fullParts = [tts];
      if (biz.plan?.analysis) fullParts.push(biz.plan.analysis);
      fullParts.push(...(biz.plan?.steps || []).map((s, i) => `${i + 1}. ${s}`));
      result.fullAnswer = fullParts.join("\n");
      result.latestToDos = (biz.plan?.steps || []).slice(0, 4).map((s, i) => `${i + 1}. ${s}`);
      result.wake = { lastFloor, chatReply: true, rewritten: askText, tier: biz.tier || tier };
      return result;
    }

    // —— HA_ASK / HA_TALK：语义 RAG + LLM ——
    opts.onStatus?.({ phase: "thinking", reason: state.mode });
    let retrieval = await retrieveSemantic(askText || agenda, 3, { signal: opts.signal });
    if (!retrieval?.hits?.length) {
      retrieval = retrieveKnowledge(askText || agenda, 2);
      retrieval.mode = retrieval.mode || "keyword";
    }
    a2aTrace.push(
      newEvent("ResearcherAgent", "HostAgent", "RAG_HIT", {
        hits: (retrieval.hits || []).map((h) => ({ title: h.title, score: h.score, source: h.source })),
        mode: state.mode,
        ragMode: retrieval.mode
      })
    );

    // 语义极高分闭题仍可 FAQ（防复杂问已在 shouldFaqInstant）
    if (
      state.mode === AGENT_MODE.HA_ASK &&
      !isComplexQuestion(askText) &&
      retrieval.instantAnswer &&
      retrieval.fromFaq &&
      (retrieval.hits?.[0]?.score || 0) >= 0.82
    ) {
      const answer = stripIntroBoilerplate(clipSpeak(retrieval.instantAnswer, 120));
      return playAnswer(answer, "WAKE_ANSWER", state, a2aTrace, kbStatus, qFp, "faq-semantic", {
        cacheQuestion: askText
      });
    }

    const kbBite = String(retrieval.preview || "").slice(0, 1600);
    const system =
      state.mode === AGENT_MODE.HA_TALK
        ? `${CHAT_TALK_SYSTEM}\n【议程】${agenda}\n【知识片段】\n${kbBite || "（暂无强相关，谨慎简答）"}`
        : `${CHAT_ASK_SYSTEM}\n【议程】${agenda}\n【知识片段】\n${kbBite || "（暂无强相关，谨慎简答）"}`;
    const userTask =
      state.mode === AGENT_MODE.HA_TALK
        ? `园长说：${askText}\n请按探讨结构短复（勿前缀「大智：」）。`
        : `请对下面问题做咨询短答（抓手+金句，勿前缀）。若是追问「还有其他方案」，禁止复读上一答：\n${askText}`;
    const chat = await speakViaChat(
      system,
      userTask,
      {
        ...opts,
        temperature: state.mode === AGENT_MODE.HA_TALK ? 0.55 : 0.35,
        maxLen: state.mode === AGENT_MODE.HA_TALK ? 110 : 110,
        fallback: matchFaqInstant(askText)?.answer || objectionAnswer(state.objectionLevel || 1)
      },
      a2aTrace
    );
    if (chat.aborted) {
      return baseResult({
        reason: "ABORTED",
        a2aTrace,
        agentMode: state.mode,
        kbStatus,
        wake: { lastFloor }
      });
    }
    a2aTrace.push(
      newEvent("DirectorAgent", "HostAgent", state.mode === AGENT_MODE.HA_TALK ? "TALK_REPLY" : "ASK_REPLY", {
        preview: chat.answer.slice(0, 80),
        ragMode: retrieval.mode
      })
    );
    if (chat.answer && !chat.arkBillingOverdue) {
      rememberAnswer(state.meetingId, {
        question: askText,
        tts: chat.answer,
        arkMode: chat.arkBillingOverdue ? "heuristic" : chat.arkMode || "llm"
      });
      // HA_ASK 成功也写 inbox，供会后升格 FAQ
      if (state.mode === AGENT_MODE.HA_ASK && chat.arkMode === "llm") {
        sinkAdvisorAnswer({
          level: "L2",
          question: askText,
          rewritten: askText,
          tts: chat.answer,
          steps: [],
          cite: (retrieval.hits || []).slice(0, 3).map((h) => h.title),
          ragHits: retrieval.hits || [],
          meetingId: state.meetingId,
          arkMode: "llm"
        });
      }
    }
    return {
      shouldIntervene: Boolean(chat.answer),
      interventionText: chat.answer,
      fullAnswer: chat.answer,
      spokenPrefix: "",
      earlyCovered: false,
      reason: "WAKE_ANSWER",
      latestToDos: ["1. 对照全园美语落地抓手", "2. 需要时再呼叫大智", "3. 口径以知识库为准"],
      nextStageRecommendation: "MainDiscussion",
      a2aTrace,
      arkConfigured: true,
      arkMode: chat.arkBillingOverdue ? "heuristic" : chat.arkMode,
      arkBillingOverdue: chat.arkBillingOverdue,
      arkError: chat.arkError,
      agentMode: state.mode,
      kbStatus,
      questionFp: qFp,
      wake: { lastFloor, chatReply: true, rewritten: askText }
    };
  }

  if (isSilentMode(state.mode)) {
    debugLog.info("Kaiban", "静默只收听", {
      mode: state.mode,
      floor: lastFloor.slice(0, 40)
    });
    return baseResult({
      reason: "SILENT_LISTEN",
      a2aTrace,
      agentMode: state.mode,
      kbStatus,
      wake: { lastFloor, silent: true }
    });
  }

  return baseResult({ reason: "OK", a2aTrace, agentMode: state.mode, kbStatus });
}

function hasArkKey() {
  return Boolean((process.env.DOUBAO_API_KEY || process.env.ARK_API_KEY || "").trim());
}

module.exports = {
  runMeetingAnalysis,
  hasArkKey,
  arkChat,
  DEFAULT_AGENDA,
  knowledgeStatus,
  THINKING_FILLER,
  AGENT_MODE,
  semanticStatus
};

