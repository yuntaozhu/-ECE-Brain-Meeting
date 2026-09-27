/**
 * 半双工控场策略：状态机、回灌判定、静音窗、话术清洗。
 * main / preload / kaiban / knowledge 共用，便于统一调参与日志。
 */

const PHASE = {
  IDLE: "IDLE",
  SPEAKING: "SPEAKING",
  COOLDOWN: "COOLDOWN"
};

/** Host 播完后禁止唤起/冷场的冷却（ms） */
const COOLDOWN_MS = 2500;
/** 冷场巡检静音阈值（ms） */
const SILENCE_PATROL_MS = 22000;
/** 开场后禁止 SILENCE 的保护期（不阻挡唤起/主题问答） */
const GREETING_SILENCE_GUARD_MS = 20000;
/** 同类唤起最短间隔 */
const WAKE_COOLDOWN_MS = 12000;
/** 同一问句指纹去重窗口 */
const QUESTION_DEDUP_MS = 60000;
/** Host 播完后，主题碎片/「好的+主题」视为回灌的窗口 */
const POST_HOST_ECHO_MS = 4500;

/** 与议程/知识库相关（辅助，非开口唯一条件） */
const TOPIC_HINT_RE =
  /美语|美蚁|梅雨|全[园员]|四端|家园|共育|招生|3900|三千九|教研|英语|经营|课程|教师|家长|一园两制|一元两制|一圆两制|自然拼读|绘本|TPR|启蒙|园所|试点|落地|主题|议程|元是什么|成功|做成|两制|菲教|非教|Teacher|Family|ABCmouse/;
/** 纯会务闲聊，不抢答 */
const LOGISTICS_RE =
  /几点|三点|3\s*点|办公室|会议室|下午|挤出来|下次再|喂喂|好喂|行行|不好意思|电瓶|电平|扬声器|CABLE|cable/i;

const INTRO_BOILERPLATE_RE =
  /(我已就位|全程(在线)?收听|收听记录|随时叫[「「"']?李老师|随时呼叫[「「"']?李老师|随时叫我就|随时呼叫我就可以|需要我时叫李老师)/g;

function normText(s) {
  return String(s || "")
    .replace(/\s+/g, "")
    .replace(/[，。！？、；：""''「」（）()【】\[\]…·]/g, "");
}

/**
 * ASR 变体归一：金额、美语错听、一园两制错听等。
 * @param {string} s
 */
function normalizeForMatch(s) {
  let t = String(s || "");
  t = t.replace(/美蚁/g, "美语");
  t = t.replace(/梅雨/g, "美语");
  t = t.replace(/全员美语/g, "全园美语");
  t = t.replace(/全员美育/g, "全园美语");
  t = t.replace(/签约美语/g, "全园美语");
  t = t.replace(/田园美语/g, "全园美语");
  t = t.replace(/一元两制|一圆两制|一园两治/g, "一园两制");
  t = t.replace(/大致|大志|大制|达智/g, "大智");
  t = t.replace(/原所|我的原(?=要|所|园)/g, "园所");
  t = t.replace(/原要倒闭/g, "园要倒闭");
  t = t.replace(/全员美女|全园美女/g, "全园美语");
  t = t.replace(/公办员/g, "公办园");
  t = t.replace(/样板单/g, "样板班");
  t = t.replace(/盐云港/g, "盐城连云港");
  t = t.replace(/非叫/g, "非教");
  t = t.replace(/色显优势|特色显优势/g, "特色优势");
  t = t.replace(/家园共浴/g, "家园共育");
  t = t.replace(/离院后/g, "离园后");
  t = t.replace(/三千九百\s*元?/g, "3900元");
  t = t.replace(/3\s*[,，]\s*900/g, "3900");
  t = t.replace(/3\s*900/g, "3900");
  return t;
}

function extractFloorLines(transcript, max = 2) {
  return String(transcript || "")
    .split(/\n+/)
    .map((l) => l.trim())
    .filter((l) => /^会场/.test(l))
    .map((l) => l.replace(/^会场(\(识别中\))?[：:]\s*/, ""))
    .filter(Boolean)
    .slice(-Math.max(1, max));
}

function questionFingerprint(text) {
  const t = normText(text).slice(0, 48);
  if (t.length < 4) return "";
  return t;
}

/**
 * 估算播报后回灌防护时长。
 * 有 chunks 时跟真实 TTS；开播前仅短预测，避免 19s 锁死上行。
 * @param {string} text
 * @param {{ chunks?: number }} [opts]
 */
function estimateHoldMs(text, opts = {}) {
  const chunks = Number(opts.chunks) || 0;
  if (chunks > 0) {
    return Math.min(8000, Math.max(1200, chunks * 90 + 800));
  }
  const len = String(text || "").length;
  return Math.min(6000, Math.max(2200, Math.round(len * 70) + 1200));
}

function stripIntroBoilerplate(text) {
  let t = String(text || "").trim();
  if (!t) return t;
  // 去掉自介套话句
  const parts = t.split(/(?<=[。！？])/);
  const kept = parts.filter((p) => {
    const n = normText(p);
    if (!n) return false;
    if (/我已就位|全程(在线)?收听|收听记录/.test(p) && /四端|美语|家园|园所/.test(p)) return false;
    if (/随时叫|随时呼叫/.test(p) && /李老师|叫我/.test(p)) return false;
    return true;
  });
  t = (kept.length ? kept.join("") : t).replace(INTRO_BOILERPLATE_RE, "").trim();
  t = t.replace(/^[，,。.\s]+/, "").replace(/[，,]\s*$/, "");
  // 主题问兜底：若清洗后过短且原串含主题，保留简洁模板由调用方处理
  return t;
}

function isIntroSelfTalk(text) {
  const t = normText(text);
  if (t.length < 10) return false;
  const hasListen =
    /全程(在线)?收听|我已就位|随时呼叫我|随时叫我就|收听记录|需要我时叫李老师/.test(t);
  const hasTheme = /四端联动|全园美语|全员美语|家园共育|家园公寓|园所经营|美语教育/.test(t);
  return hasListen && hasTheme;
}

function longestCommonSubstringLen(a, b) {
  const s = normText(a);
  const t = normText(b);
  if (!s || !t) return 0;
  const m = Math.min(s.length, 80);
  const n = Math.min(t.length, 120);
  let best = 0;
  const dp = new Array(n + 1).fill(0);
  for (let i = 1; i <= m; i++) {
    let prev = 0;
    for (let j = 1; j <= n; j++) {
      const tmp = dp[j];
      if (s[i - 1] === t[j - 1]) {
        dp[j] = prev + 1;
        if (dp[j] > best) best = dp[j];
      } else {
        dp[j] = 0;
      }
      prev = tmp;
    }
  }
  return best;
}

function bigramOverlapRatio(a, b) {
  const s = normText(a);
  const t = normText(b);
  if (s.length < 4 || t.length < 4) return 0;
  const grams = new Set();
  for (let i = 0; i < s.length - 1; i++) grams.add(s.slice(i, i + 2));
  let hit = 0;
  for (let i = 0; i < t.length - 1; i++) {
    if (grams.has(t.slice(i, i + 2))) hit += 1;
  }
  return hit / Math.max(1, t.length - 1);
}

/**
 * Host 刚说完后的「好的/嗯 + 主题词」或高度重合碎片 → 回灌假对话。
 * @param {string} text
 * @param {string[]} recentHostUtterances
 * @param {number|null} sinceHostMs
 */
function isPostHostEchoFragment(text, recentHostUtterances = [], sinceHostMs = null) {
  if (sinceHostMs == null || sinceHostMs > POST_HOST_ECHO_MS) return null;
  const t = String(text || "").trim();
  if (!t || t.length < 4) return null;
  const hosts = (recentHostUtterances || []).filter(Boolean);
  if (!hosts.length) return null;

  const affirm = /^(好的|好|嗯|对|行|是|哦|可以)[，,。！!？?\s]/.test(t);
  const hasTheme = TOPIC_HINT_RE.test(t);
  let bestRatio = 0;
  for (const h of hosts) {
    bestRatio = Math.max(bestRatio, bigramOverlapRatio(h, t));
    const lcs = longestCommonSubstringLen(h, t);
    if (lcs >= 10) bestRatio = Math.max(bestRatio, 0.65);
  }
  const hostHasTheme = hosts.some((h) => TOPIC_HINT_RE.test(h));

  if (affirm && hasTheme && hostHasTheme && bestRatio >= 0.22) {
    return { echo: true, score: 0.82, reason: "post-hold-affirm+theme" };
  }
  if (hasTheme && hostHasTheme && bestRatio >= 0.38 && t.length >= 8) {
    return { echo: true, score: Math.max(0.7, bestRatio), reason: "post-hold-theme" };
  }
  if (bestRatio >= 0.5 && t.length >= 8) {
    return { echo: true, score: bestRatio, reason: "post-hold-overlap" };
  }
  return null;
}

function isQuestionForm(text) {
  const s = String(text || "").trim();
  if (!s) return false;
  if (/[？?]/.test(s)) return true;
  if (/(什么意思|是什么|怎么[样办]|为什么|为何|能不能|可不可以|是否|咋办|真的吗|真的能|行不行)/.test(s))
    return true;
  if (/(吗|呢|吧)\s*[。.!！]?$/.test(s) && s.length >= 4) return true;
  return false;
}

/**
 * 真追问：带疑问/求证，即使与 Host 部分重合也不当回灌。
 */
function isFollowUpNotEcho(text) {
  const t = String(text || "").trim();
  if (!t) return false;
  if (isQuestionForm(t)) return true;
  if (/(真的|能不能|可不可以|怎么办|为啥|为何|是不是|有没有)/.test(t)) return true;
  return false;
}

/**
 * @param {string} text
 * @param {string[]} recentHostUtterances
 * @param {{ sinceHostMs?: number|null, postHoldMs?: number }} [opts]
 */
function looksLikeHostEcho(text, recentHostUtterances = [], opts = {}) {
  const t = String(text || "").trim();
  if (!t || t.length < 6) return { echo: false, score: 0, reason: "" };
  // P0：问句/求证追问豁免，避免「真的能重生吗」被 Host 尾句误杀
  if (isFollowUpNotEcho(t)) {
    return { echo: false, score: 0, reason: "follow-up-question" };
  }
  if (isIntroSelfTalk(t)) {
    return { echo: true, score: 0.95, reason: "intro-template" };
  }

  const since =
    opts.sinceHostMs != null
      ? opts.sinceHostMs
      : opts.lastHostSpeakAt
        ? Date.now() - opts.lastHostSpeakAt
        : null;
  const post = isPostHostEchoFragment(t, recentHostUtterances, since);
  if (post) return post;

  const themeFrag =
    /(四端联动|学生端|教师端|家庭端|运营端|ABCmouse|Teacher说|Family说|全园美语|全员美语|三万九|39000|招生引擎|阅读模块|四端模块)/.test(
      t
    );
  if (
    themeFrag &&
    (recentHostUtterances || []).some((h) => {
      const hub = normText(h);
      return (
        hub.includes("四端") ||
        hub.includes("全园美语") ||
        hub.includes("ABCmouse") ||
        hub.includes("阅读") ||
        hub.includes("模块")
      );
    })
  ) {
    if (normText(t).length >= 8) {
      return { echo: true, score: 0.75, reason: "faq-theme" };
    }
  }

  let best = 0;
  let reason = "";
  for (const h of recentHostUtterances || []) {
    if (!h) continue;
    const lcs = longestCommonSubstringLen(h, t);
    const ratio = bigramOverlapRatio(h, t);
    const score = Math.max(lcs / 20, ratio);
    if (lcs >= 12 && score > best) {
      best = Math.max(score, 0.6);
      reason = `lcs=${lcs}`;
    }
    if (ratio >= 0.55 && score > best) {
      best = ratio;
      reason = `bigram=${ratio.toFixed(2)}`;
    }
    const hub = normText(h);
    const tt = normText(t);
    const needle = hub.slice(0, Math.min(16, hub.length));
    if (needle.length >= 10 && tt.includes(needle.slice(0, 12))) {
      best = Math.max(best, 0.7);
      reason = "substr";
    }
  }
  // 几乎整句拷贝才判回灌；阈值略提高，减少误杀
  if (best >= 0.62) return { echo: true, score: best, reason };
  return { echo: false, score: best, reason };
}

/**
 * 是否应进入「自由对话」回复（参会者直接聊，不要求叫名）。
 * 会务闲聊 / 语气词不接；问句与主题相关发言要接。
 * @param {string} text
 */
function shouldChatReply(text) {
  const last = normalizeForMatch(String(text || "").trim());
  if (!last || last.length < 2) return false;
  if (/谢谢大智|谢谢李老师|停止大智/.test(last)) return false;
  if (isIntroSelfTalk(last)) return false;
  if (/^(喂+|好+|嗯+|啊+|哦+|行+|对+|是+|没+|不是)[。.!！？]?$/i.test(last)) return false;

  const logisticsOnly = LOGISTICS_RE.test(last) && !TOPIC_HINT_RE.test(last);

  // v2：仅点名大智/李老师或明确请教时才算「要 AI 答」；普通主题句留给 HH 旁听
  if (/大智|大致|李老师|你觉得|你怎么看|帮(我|忙)|请问/.test(last)) return true;
  if (isQuestionForm(last) && /大智|大致|李老师/.test(last)) {
    if (logisticsOnly && last.length < 16) return false;
    return true;
  }
  return false;
}

/**
 * 单句是否立刻巡检。v2 默认旁听，口令/点名才立刻巡检。
 * @param {string} text
 */
function shouldImmediatePatrol(text) {
  const last = normalizeForMatch(String(text || "").trim());
  if (/大智|大致|李老师|总结|暂停记录|继续记录|要总结|听我说完|我说完了/.test(last)) {
    return true;
  }
  return shouldChatReply(text);
}

/**
 * 唤醒/对话意图检测：只看最近会场句。
 * chatReply=true 表示应按 Chat 主播接话（不要求叫「李老师」）。
 * @param {string} transcript
 */
function detectWake(transcript) {
  const floorArr = extractFloorLines(transcript, 3).map((l) => normalizeForMatch(l));
  const t = floorArr.join("\n");
  const last = floorArr[floorArr.length - 1] || "";

  if (isIntroSelfTalk(t) || isIntroSelfTalk(last)) {
    return {
      wake: false,
      thanks: false,
      summary: false,
      openQuestion: false,
      directQuestion: false,
      presenceCheck: false,
      chatReply: false,
      echoSkipped: true,
      floorText: t,
      lastFloor: last
    };
  }

  const thanks = /谢谢李老师/.test(t);
  const summary = /李老师\s*(总结|小结|归纳)/.test(t);
  const presenceCheck =
    !thanks &&
    /(李老师在吗|有人(在)?听吗|AI\s*没响应|听得到吗|李老师[，,]\s*你在吗)/.test(last || t);

  const wakeNamed =
    /李老师/.test(t) &&
    !thanks &&
    (/李老师[，,：:\s]*(你|您|请|帮|讲|说|介绍|回答|怎么|什么|为何|为什么|能否|可以)/.test(t) ||
      /(叫|请问|问一下|听听|请教).{0,8}李老师|李老师.{0,8}(叫|请问|问一下)/.test(t) ||
      /李老师[？?]/.test(t) ||
      summary ||
      /李老师.{0,16}(吗|呢|吧|啊)/.test(t) ||
      /(?:^|[。！？\n])\s*李老师\s*[。！？]?$/.test(last) ||
      presenceCheck);

  const openQuestion =
    !thanks &&
    /(今天(的)?会议主题是什么|会议主题是什么|今天主题是什么|本次会议主题是什么|全[园员]美语是什么|什么是全[园员]美语|全[园员]美语是什么项目|今天开什么会)/.test(
      last || t
    );

  const askTheme = /李老师/.test(t) && /(主题是什么|议程是什么)/.test(t);
  const chatReply = !thanks && shouldChatReply(last);
  const directQuestion = chatReply && isQuestionForm(last);
  const wake = wakeNamed || askTheme || openQuestion || directQuestion || presenceCheck || chatReply;

  return {
    wake,
    thanks,
    summary,
    openQuestion,
    directQuestion,
    presenceCheck,
    chatReply,
    echoSkipped: false,
    floorText: t,
    lastFloor: last
  };
}

function themeShortAnswer(agenda) {
  const a = agenda || "全园美语系统教研会：四端联动、校园经营与家园共育";
  return `今天主题是：${a}。想先听哪一块？`;
}

/**
 * 是否允许 SILENCE 干预
 */
function canSilenceIntervene(opts = {}) {
  const now = Date.now();
  if (opts.phase && opts.phase !== PHASE.IDLE) return { ok: false, reason: "phase-" + opts.phase };
  if (opts.listenStartedAt && now - opts.listenStartedAt < GREETING_SILENCE_GUARD_MS) {
    return { ok: false, reason: "greeting-guard" };
  }
  if (opts.lastHostSpeakAt && now - opts.lastHostSpeakAt < WAKE_COOLDOWN_MS) {
    return { ok: false, reason: "post-speak-cooldown" };
  }
  if (opts.quietMs != null && opts.quietMs < SILENCE_PATROL_MS) {
    return { ok: false, reason: "quiet-too-short", quietMs: opts.quietMs };
  }
  return { ok: true, reason: "ok" };
}

module.exports = {
  PHASE,
  COOLDOWN_MS,
  SILENCE_PATROL_MS,
  GREETING_SILENCE_GUARD_MS,
  WAKE_COOLDOWN_MS,
  QUESTION_DEDUP_MS,
  POST_HOST_ECHO_MS,
  TOPIC_HINT_RE,
  LOGISTICS_RE,
  normText,
  normalizeForMatch,
  extractFloorLines,
  questionFingerprint,
  estimateHoldMs,
  stripIntroBoilerplate,
  isIntroSelfTalk,
  isPostHostEchoFragment,
  looksLikeHostEcho,
  isQuestionForm,
  isFollowUpNotEcho,
  shouldChatReply,
  shouldImmediatePatrol,
  detectWake,
  themeShortAnswer,
  canSilenceIntervene,
  longestCommonSubstringLen,
  bigramOverlapRatio
};
