/**
 * 大智 AI 会议顾问 — 业务模式状态机与口令/意图检测（v2）
 * 与半双工 PHASE（IDLE/SPEAKING/COOLDOWN）正交。
 *
 * P0 会议控制：
 * SILENT = IDLE_LISTEN（默认只收听）
 * CONSULT = HA_ASK / HA_TALK / HA_BIZ（点名后粘滞）
 */

const { normalizeForMatch, isQuestionForm, TOPIC_HINT_RE, LOGISTICS_RE, normText } =
  require("./duplexPolicy.cjs");

const AGENT_MODE = {
  HH: "HH",
  HH_SUM: "HH_SUM",
  HH_TOPIC: "HH_TOPIC",
  HA_ASK: "HA_ASK",
  HA_TALK: "HA_TALK",
  HA_BIZ: "HA_BIZ",
  PAUSED: "PAUSED",
  IDLE_LISTEN: "IDLE_LISTEN"
};

/** P2 会议生命周期（与 AGENT_MODE / 半双工 PHASE 正交） */
const MEETING_LIFE = {
  OFF: "OFF",
  OPENING: "OPENING",
  SILENT: "SILENT",
  CONSULT: "CONSULT",
  HOLD: "HOLD",
  SUMMARY: "SUMMARY",
  CLOSING: "CLOSING"
};

const MODE_LABEL = {
  HH: "人—人旁听",
  HH_SUM: "总结中",
  HH_TOPIC: "抛题",
  HA_ASK: "咨询中",
  HA_TALK: "探讨中",
  HA_BIZ: "经营顾问",
  PAUSED: "暂停记录",
  IDLE_LISTEN: "静默监听"
};

const LIFE_LABEL = {
  OFF: "未开会",
  OPENING: "开场中",
  SILENT: "静默",
  CONSULT: "咨询中",
  HOLD: "占麦中",
  SUMMARY: "总结中",
  CLOSING: "收尾中"
};

/** 咨询粘滞默认 90s */
const HA_STICKY_MS = 90000;

const DAZHI_RE = /大智|大致|大志|大制|达智/;

const OFF_TOPIC_RE =
  /粽子|买菜|打牌|八卦|报销(?!.*美语)|晚饭|外卖|股票|短视频|追剧|游戏开黑/;

const STEER_MAX_PER_SEGMENT = 2;
const STEER_COOLDOWN_MS = 20000;

function emptyCommand(text = "") {
  return {
    command: null,
    named: false,
    summary: false,
    stop: false,
    pauseLog: false,
    resumeLog: false,
    askMode: false,
    talkMode: false,
    continueHH: false,
    holdToEnd: false,
    sayDone: false,
    presence: false,
    confirmSummary: false,
    meetingStart: false,
    meetingEnd: false,
    interrupt: false,
    continueSpeak: false,
    payload: "",
    text: text
  };
}

function normalizeDazhiAliases(text) {
  let t = normalizeForMatch(text);
  t = t.replace(/大致|大志|大制|达智/g, "大智");
  t = t.replace(/原所|我的原(?=要|所|园)/g, "园所");
  t = t.replace(/原要倒闭/g, "园要倒闭");
  t = t.replace(/全员美女|全园美女/g, "全园美语");
  t = t.replace(/公办员/g, "公办园");
  t = t.replace(/样板单/g, "样板班");
  t = t.replace(/盐云港/g, "盐城连云港");
  t = t.replace(/非叫/g, "菲教");
  t = t.replace(/色显优势|特色显优势/g, "特色优势");
  t = t.replace(/家园共浴/g, "家园共育");
  t = t.replace(/离院后/g, "离园后");
  // ASR 把「四端联动」听成近音；只替换整词，避免误伤其它「四端」
  t = t.replace(/四元流动|四端灵动|四段联动|四段流动/g, "四端联动");
  return t;
}

/**
 * 去掉唤醒词，抽出「大智，XXXX」后的正文。
 * @param {string} text
 */
function peelWakePayload(text) {
  let t = normalizeDazhiAliases(String(text || "").trim());
  if (!t) return "";
  t = t
    .replace(/^(大智|李老师)[，,。.\s]*/g, "")
    .replace(/^(大智|李老师)[，,。.\s]*/g, "")
    .trim();
  return t;
}

/** 静默态：只收听，非表内口令不插话 */
function isSilentMode(mode) {
  return mode === AGENT_MODE.IDLE_LISTEN || mode === AGENT_MODE.HH || mode === AGENT_MODE.PAUSED;
}

/** 咨询粘滞态 */
function isConsultMode(mode) {
  return mode === AGENT_MODE.HA_ASK || mode === AGENT_MODE.HA_TALK || mode === AGENT_MODE.HA_BIZ;
}

function detectAgentCommand(lastFloor) {
  const raw = String(lastFloor || "").trim();
  const t = normalizeDazhiAliases(raw);
  if (!t) return emptyCommand("");

  const named = DAZHI_RE.test(t) || /李老师/.test(t);
  const payload = peelWakePayload(t);

  const meetingEnd =
    /大智[，,\s]*(会议结束|散会了?|结束会议)|(?<!并)会议结束|开始散会/.test(t) ||
    (named && /^(会议结束|散会)[。.!！？?\s]*$/.test(payload));
  const meetingStart =
    /大智[，,\s]*(会议开始|开会了|开始会议|我们开会)|(?<!要)会议开始|现在开会/.test(t) ||
    (named && /^(会议开始|开会了|开始会议)[。.!！？?\s]*$/.test(payload));

  const clauses = t
    .split(/[。！？!?；;]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const scan = clauses.length ? clauses : [t];
  const clauseBare = (s) => String(s || "").replace(/\s/g, "");
  const stop =
    scan.some((s) => {
      const c = clauseBare(s);
      return (
        /^(谢+大智|谢谢李老师|停止大智|停止李老师)[，,。.!！？?]*$/.test(c) ||
        /^(大智休息|大智闭嘴|大智先听着)[。.!！？?]*$/.test(c)
      );
    }) ||
    /停止大智|大智休息|大智闭嘴|大智先听着|谢谢李老师|停止李老师|谢谢大智/.test(t);

  // 打断：点名或咨询中说「听我说」
  const interrupt =
    /大智[，,\s]*(听我说|先听我说|你先听|先别说)/.test(t) ||
    /你先听我说完|请听我说完|先听我说|听我说完|大智听我说/.test(t);

  // 请继续：整句几乎只有续说口令。混在感谢句里时不抢 STOP
  const continueSpeak =
    !stop &&
    scan.some((s) =>
      /^(大智[，,]?)?(请继续|接着说|你继续|继续(说|答|讲)?)[。.!！？?]*$/.test(clauseBare(s))
    );

  const summary =
    /大智\s*(总结|小结|归纳)|(?:请|帮)?\s*(总结|小结)\s*(一下|这段|这次)?|结束并总结|做个纪要/.test(t) &&
    !meetingEnd;
  const confirmSummary = /要总结|需要总结|总结吧|可以总结|开始总结/.test(t);
  const pauseLog = /暂停记录/.test(t);
  const resumeLog = /继续记录/.test(t) && !continueSpeak;
  const continueHH = /你们继续|继续讨论|大智旁听|回到讨论/.test(t);
  const holdToEnd = interrupt;
  const sayDone = /我说完了|讲完了|说完了/.test(t);
  const presence = named && /(在吗|听得到|有没有在听|你在吗)/.test(t);
  const askMode =
    /大智\s*(咨询|问答|请教)|请教大智|问你一下|给我个标准|标准答案|怎么收费|保底怎么算/.test(t) ||
    (named &&
      payload &&
      /(请问|请教|怎么[办算]|是多少|什么意思|如何|有没有|是不是)/.test(payload) &&
      !/聊聊|探讨|一起想|会议开始|会议结束|听我说|请继续/.test(payload));
  const talkMode =
    /大智\s*(探讨|聊聊|商量)|我们聊聊|一起探讨|帮我想想|别急着下结论/.test(t) ||
    (named && /(聊聊|探讨|商量|想想|两难)/.test(payload || t));

  let command = null;
  if (meetingEnd) command = "MEETING_END";
  else if (meetingStart) command = "MEETING_START";
  else if (stop) command = "STOP";
  else if (interrupt) command = "INTERRUPT";
  else if (continueSpeak) command = "CONTINUE";
  else if (pauseLog) command = "PAUSE_LOG";
  else if (resumeLog) command = "RESUME_LOG";
  else if (summary) command = "SUMMARY";
  else if (confirmSummary) command = "CONFIRM_SUMMARY";
  else if (continueHH) command = "CONTINUE_HH";
  else if (askMode) command = "WAKE_ASK";
  else if (talkMode) command = "WAKE_TALK";
  else if (
    named &&
    (presence || /大智\s*你好|你好\s*大智|呼叫大智|大智[，,。！!？?\s]*$/.test(t))
  ) {
    command = "WAKE";
  } else if (named && isQuestionForm(t)) {
    command = "WAKE_ASK";
  } else if (named && payload.length >= 2) {
    // 「大智，XXXX」有正文 → 当提问/要求
    command = "WAKE_ASK";
  } else if (named) {
    command = "WAKE";
  }

  return {
    command,
    named,
    summary,
    stop,
    pauseLog,
    resumeLog,
    askMode,
    talkMode,
    continueHH,
    holdToEnd,
    sayDone,
    presence,
    confirmSummary,
    meetingStart,
    meetingEnd,
    interrupt,
    continueSpeak,
    payload,
    text: t
  };
}

function isPolicyLikeQuestion(text) {
  const t = normalizeDazhiAliases(text);
  return (
    /(3900|三万九|50%|百分之五十|保底|分成|定价|加收|非教|四端|一园两制|样板班|参观|项目多少钱)/.test(
      t
    ) && isQuestionForm(t)
  );
}

function classifyHaIntent(lastFloor, currentHa) {
  const cmd = detectAgentCommand(lastFloor);
  if (cmd.talkMode || cmd.command === "WAKE_TALK") return "HA_TALK";
  if (cmd.askMode || cmd.command === "WAKE_ASK") return "HA_ASK";
  if (/(抵触|为难|为了啥|崩溃|不想干|两难|身兼数职|加负担)/.test(cmd.text)) return "HA_TALK";
  if (currentHa === AGENT_MODE.HA_TALK && !/标准答案|标准口径|准确数字/.test(cmd.text)) {
    if (isPolicyLikeQuestion(cmd.text)) return "HA_ASK";
    return "HA_TALK";
  }
  if (isPolicyLikeQuestion(cmd.text)) return "HA_ASK";
  if (isQuestionForm(cmd.text)) return "HA_ASK";
  return currentHa === AGENT_MODE.HA_TALK ? "HA_TALK" : "HA_ASK";
}

function shouldSteerOffTopic(lastFloor, agenda) {
  const t = normalizeDazhiAliases(lastFloor);
  if (!t || t.length < 6) return { steer: false, reason: "", weak: false };
  if (LOGISTICS_RE.test(t) && !TOPIC_HINT_RE.test(t)) {
    return { steer: false, reason: "logistics", weak: false };
  }
  if (OFF_TOPIC_RE.test(t) && !TOPIC_HINT_RE.test(t)) {
    return { steer: true, reason: "off-topic-dict", weak: false };
  }
  const agendaHit = agenda && normText(t).includes(normText(agenda).slice(0, 4));
  if (t.length >= 16 && !TOPIC_HINT_RE.test(t) && !agendaHit && !DAZHI_RE.test(t)) {
    return { steer: false, reason: "weak-no-topic", weak: true };
  }
  return { steer: false, reason: "on-topic", weak: false };
}

function isLocalVisitIntent(text) {
  const t = normalizeDazhiAliases(text);
  return /(参观|示范园|落地园|附近.*(园|所)|盐城|连云港|江苏.*(园|参观)|有没有.*(园|所).*参观)/.test(
    t
  );
}

function isWhyInvestIntent(text) {
  const t = normalizeDazhiAliases(text);
  return /(为了啥|图什么|我掏钱|没有营收|我交了钱|投入.*回报|我为了什么)/.test(t);
}

function isTrustChallenge(text) {
  const t = normalizeDazhiAliases(text);
  return /(你自己信吗|说得通吗|能跟老师讲吗|你相信吗|信服吗)/.test(t);
}

/** SPEAKING 期间仅放行打断/续说/静默口令（防 TTS 回灌误触发） */
function looksLikeBargeInCommand(text) {
  const cmd = detectAgentCommand(text);
  return Boolean(
    cmd.command === "INTERRUPT" ||
      cmd.command === "CONTINUE" ||
      cmd.command === "STOP" ||
      cmd.interrupt ||
      cmd.continueSpeak ||
      cmd.stop ||
      cmd.sayDone
  );
}

function shouldImmediatePatrolForMode(text, mode) {
  const cmd = detectAgentCommand(text);
  // 表内口令一律立刻巡检
  if (cmd.command) return true;
  if (cmd.holdToEnd || cmd.sayDone) return true;
  const m = mode || AGENT_MODE.IDLE_LISTEN;
  // 静默：无口令不巡检（不插话）
  if (isSilentMode(m) && !isConsultMode(m)) return false;
  if (isConsultMode(m)) {
    const t = cmd.text;
    if (isQuestionForm(t)) return true;
    if (t.length >= 8 && TOPIC_HINT_RE.test(t)) return true;
    if (/(抵触|为了啥|怎么办|崩溃|起死回生|招生)/.test(t)) return true;
    return false;
  }
  return false;
}

function createAgentState(meetingId) {
  return {
    mode: AGENT_MODE.IDLE_LISTEN,
    lifecycle: MEETING_LIFE.OFF,
    segmentId: `seg_${Date.now()}`,
    steerCount: 0,
    lastSteerAt: 0,
    weakOffTopicStreak: 0,
    haLockedUntil: 0,
    holdToEnd: false,
    interrupted: false,
    interruptAt: 0,
    lastInterruptedText: "",
    /** @type {{ fullText: string, interruptedAt: number, chunks: number } | null} */
    interruptBuffer: null,
    /** 打断后、说「请继续」前用户补充的会场句 */
    holdFloorLines: [],
    objectionLevel: 1,
    meetingId: meetingId || `mtg_${Date.now()}`,
    meetingOpen: false,
    agenda: "",
    summaryPendingConfirm: false,
    floorLinesSinceSummary: 0,
    bizFollowUps: 0
  };
}

/** 由 agentState + 半双工/占麦 推导生命周期展示 */
function deriveMeetingLife(state, opts = {}) {
  if (!state) return MEETING_LIFE.OFF;
  if (state.lifecycle === MEETING_LIFE.CLOSING) return MEETING_LIFE.CLOSING;
  if (state.lifecycle === MEETING_LIFE.OPENING) return MEETING_LIFE.OPENING;
  if (!state.meetingOpen) return MEETING_LIFE.OFF;
  if (state.holdToEnd || opts.holdListening) return MEETING_LIFE.HOLD;
  if (state.mode === AGENT_MODE.HH_SUM) return MEETING_LIFE.SUMMARY;
  if (isConsultMode(state.mode)) return MEETING_LIFE.CONSULT;
  return MEETING_LIFE.SILENT;
}

function setLifecycle(state, life) {
  if (!state) return;
  state.lifecycle = life;
  return life;
}

function newSegment(state) {
  state.segmentId = `seg_${Date.now()}`;
  state.steerCount = 0;
  state.weakOffTopicStreak = 0;
  state.objectionLevel = 1;
  state.summaryPendingConfirm = false;
  state.floorLinesSinceSummary = 0;
}

function setMode(state, mode, opts = {}) {
  const prev = state.mode;
  state.mode = mode;
  if (opts.newSegment) newSegment(state);
  if (mode === AGENT_MODE.HA_ASK || mode === AGENT_MODE.HA_TALK || mode === AGENT_MODE.HA_BIZ) {
    const lockMs = opts.lockMs != null ? opts.lockMs : HA_STICKY_MS;
    state.haLockedUntil = Date.now() + lockMs;
  }
  if (mode === AGENT_MODE.IDLE_LISTEN || mode === AGENT_MODE.HH) {
    state.haLockedUntil = 0;
  }
  if (prev === AGENT_MODE.HA_BIZ && mode !== AGENT_MODE.HA_BIZ) {
    state.bizFollowUps = 0;
  }
  return { prev, mode };
}

function bumpObjectionLevel(state, text) {
  const t = normalizeDazhiAliases(text);
  let lvl = state.objectionLevel || 1;
  if (/(崩溃|加负担|预算|不愿意|为了啥|你自己信|说得通|身兼数职|忙不过来)/.test(t)) {
    lvl = Math.min(5, lvl + 1);
  }
  state.objectionLevel = lvl;
  return lvl;
}

module.exports = {
  AGENT_MODE,
  MODE_LABEL,
  MEETING_LIFE,
  LIFE_LABEL,
  DAZHI_RE,
  HA_STICKY_MS,
  STEER_MAX_PER_SEGMENT,
  STEER_COOLDOWN_MS,
  normalizeDazhiAliases,
  detectAgentCommand,
  peelWakePayload,
  isSilentMode,
  isConsultMode,
  classifyHaIntent,
  isPolicyLikeQuestion,
  shouldSteerOffTopic,
  isLocalVisitIntent,
  isWhyInvestIntent,
  isTrustChallenge,
  shouldImmediatePatrolForMode,
  looksLikeBargeInCommand,
  createAgentState,
  deriveMeetingLife,
  setLifecycle,
  newSegment,
  setMode,
  bumpObjectionLevel
};
