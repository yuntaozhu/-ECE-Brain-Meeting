/**
 * 会议会话 — 业务侧巡检门控（是否立刻跑策略引擎）
 * 与 duplex/patrolHints（麦控启发式）分工；UI 与主进程共用本文件。
 */
const { looksLikeHostEcho, PHASE } = require("../duplex");
const { AGENT_MODE } = require("./constants.cjs");
const { detectAgentCommand } = require("./commands/detectCommand.cjs");
const { normalizeDazhiAliases } = require("./commands/normalize.cjs");
const { isSilentMode, isConsultMode } = require("./SessionState.cjs");
const { rx } = require("../knowledge/schemaStore.cjs");

const re = (name) => rx("commands", name);

/** 回灌长句时只扫尾部，避免「…招生引擎。谢谢大智」整句超长过不了 hint */
function bargeTail(text, maxLen = 28) {
  const n = normalizeDazhiAliases(String(text || "").trim()).replace(/\s+/g, "");
  if (!n) return "";
  return n.length <= maxLen ? n : n.slice(-maxLen);
}

/** SPEAKING 短 partial / 长句尾：谢谢大 / 停止大 等，正式 STOP 前即可打断 */
function looksLikeStopBargeHint(text) {
  const tail = bargeTail(text, 24);
  if (tail.length < 3) return false;
  try {
    return re("stopBargePartial").test(tail);
  } catch (_) {
    return /谢+大|停止大|大智休息|大智闭嘴/.test(tail);
  }
}

/** 从粘连回灌句抽出打断口令正文（供转写/巡检） */
function extractBargeCommandText(text) {
  const raw = String(text || "").trim();
  if (!raw) return "";
  const n = normalizeDazhiAliases(raw).replace(/\s+/g, "");
  const m = n.match(
    /((?:嗯+|啊+|哦+|好+)?谢{1,3}大(?:智|致|志|制)?|停止大(?:智|致|志|制)?|大智听我说|听我说|大智休息|大智闭嘴|大智先听着?)[。.!！？?]*$/
  );
  if (m) {
    let out = m[1].replace(/(大致|大志|大制)$/, "大智");
    // partial「谢谢大」升格为完整 STOP，避免 RESIDUAL_SKIP
    if (/^((?:嗯+|啊+|哦+|好+)?谢{1,3}大)$/.test(out)) out = "谢谢大智";
    if (/^停止大$/.test(out)) out = "停止大智";
    return out;
  }
  const tail = bargeTail(raw, 24);
  if (looksLikeStopBargeHint(tail) || looksLikeBargeInCommand(tail)) {
    if (/谢{1,3}大(?!智|致|志|制|家)/.test(tail)) return "谢谢大智";
    return tail;
  }
  return raw;
}

/** SPEAKING 期间仅放行打断/续说/静默口令（防 TTS 回灌误触发） */
function looksLikeBargeInCommand(text) {
  if (looksLikeStopBargeHint(text)) return true;
  const cmd = detectAgentCommand(text);
  if (
    cmd.command === "INTERRUPT" ||
      cmd.command === "CONTINUE" ||
      cmd.command === "STOP" ||
      cmd.interrupt ||
      cmd.continueSpeak ||
      cmd.stop ||
      cmd.sayDone
  ) {
    return true;
  }
  // 长回灌+句尾口令：整句 detect 有时被其它优先级盖住，再扫尾
  const tail = bargeTail(text, 28);
  if (tail && tail !== normalizeDazhiAliases(String(text || "")).replace(/\s+/g, "")) {
    if (looksLikeStopBargeHint(tail)) return true;
    const c2 = detectAgentCommand(tail);
    return Boolean(
      c2.command === "INTERRUPT" ||
        c2.command === "CONTINUE" ||
        c2.command === "STOP" ||
        c2.interrupt ||
        c2.continueSpeak ||
        c2.stop
    );
  }
  return false;
}

/** 播报/回灌窗内叫名唤醒（大智 / 大智+问句），可打断并立刻巡检 */
function looksLikeWakeCommand(text) {
  const cmd = detectAgentCommand(text);
  return Boolean(
    cmd.command === "WAKE" ||
      cmd.command === "WAKE_ASK" ||
      cmd.command === "WAKE_TALK" ||
      (cmd.named && (cmd.askMode || cmd.talkMode || cmd.presence))
  );
}

/** 回灌比对去标点（ASR「我是大智。」须对上口播「我是大智，…」） */
function stripEchoPunct(text) {
  return String(text || "").replace(/[，,。．.!！？?\s、；;：:"""''「」『』（）()【】\[\]…·\-—]/g, "");
}

/**
 * 播窗内干净唤醒：必须以「大智」起首。
 * 挡「整合 a 区大智」这类句中夹名的线缆回灌误唤醒。
 */
function looksLikeCleanWakeBarge(text) {
  const n = normalizeDazhiAliases(String(text || "").trim()).replace(/\s+/g, "");
  const bare = stripEchoPunct(n);
  if (!bare) return false;
  if (!/^大智/.test(bare)) return false;
  if (bare === "大智" || /^大智(你好|您好|在吗|在不在)$/.test(bare)) return true;
  if (!looksLikeWakeCommand(text)) return false;
  // 过长且无疑问尾：更像口播粘连，不当短唤醒
  if (bare.length > 24 && !/[吗麼么呢]$/.test(bare) && !/[？?]/.test(n)) return false;
  return true;
}

/** 二元组重叠数（听花回灌与口播仍可能共字） */
function echoBigramHits(a, s) {
  if (!a || !s || a.length < 2 || s.length < 2) return 0;
  const set = new Set();
  for (let i = 0; i < s.length - 1; i++) set.add(s.slice(i, i + 1 + 1));
  let hit = 0;
  for (let i = 0; i < a.length - 1; i++) {
    if (set.has(a.slice(i, i + 2))) hit += 1;
  }
  return hit;
}

/**
 * ASR 文本是否像当前口播回灌（含「我是大智」问候前缀）。
 * @param {string} asrText
 * @param {string} [speakText]
 */
function looksLikeSpeakEcho(asrText, speakText) {
  const aRaw = normalizeDazhiAliases(String(asrText || "").trim()).replace(/\s+/g, "");
  const sRaw = normalizeDazhiAliases(String(speakText || "").trim()).replace(/\s+/g, "");
  const a = stripEchoPunct(aRaw);
  const s = stripEchoPunct(sRaw);
  if (!a || a.length < 2) return false;
  // 句尾已是打断口令：粘连回灌不当纯回灌（各分支统一例外）
  if (looksLikeStopBargeHint(aRaw) || looksLikeBargeInCommand(aRaw)) return false;
  // 自我介绍短回灌（「我是大智。」「我是大致」），避免问候误唤醒
  if (/^我是大智/.test(a) && a.length <= 14) return true;
  // 句中夹「大智」且非干净起首叫名 → 更像回灌碎片
  if (/大智/.test(a) && !looksLikeCleanWakeBarge(aRaw) && a.length >= 5) return true;
  if (s && a.length >= 4 && (s.includes(a) || s.startsWith(a.slice(0, Math.min(a.length, 24))))) {
    return true;
  }
  if (s && a.length >= 8 && a.startsWith(s.slice(0, Math.min(20, s.length)))) {
    return true;
  }
  // 听花：与口播二元组重叠够多
  if (s && a.length >= 6) {
    const hits = echoBigramHits(a, s);
    if (hits >= Math.max(2, Math.floor((a.length - 1) * 0.35))) return true;
  }
  try {
    const echo = looksLikeHostEcho(asrText, speakText ? [speakText] : [], {});
    if (echo.echo && !looksLikeBargeInCommand(asrText)) return true;
  } catch (_) {}
  return false;
}

/**
 * 界面显示用 ASR 纠错（保留标点）。
 * @param {string} text
 */
function displayCorrectAsr(text) {
  let t = String(text || "").trim();
  if (!t) return "";
  t = normalizeDazhiAliases(t);
  try {
    const { glossaryCorrect } = require("../asr/glossaryCorrect.cjs");
    t = glossaryCorrect(t);
  } catch (_) {}
  const { load } = require("../knowledge/schemaStore.cjs");
  for (const pair of load().operators.asrDisplay || []) {
    t = t.replace(new RegExp(pair[0], "g"), pair[1]);
  }
  return t;
}

/**
 * 上一答在让选题时，短句命中候选项（与 query/rewrite.matchOfferedChoice 对齐）。
 * @param {string} text
 * @param {string} [lastHostAnswer]
 */
function looksLikeOfferedChoicePick(text, lastHostAnswer) {
  const bare = normalizeDazhiAliases(String(text || "").trim()).replace(/[，,。．.!！？?\s]/g, "");
  if (!bare || bare.length < 2 || bare.length > 14) return false;
  if (re("patrolChoiceSkip").test(bare)) return false;
  const host = String(lastHostAnswer || "").trim();
  if (!host || !re("choiceInvite").test(host)) return false;
  let chunk = "";
  const colon = host.match(/[：:]([^。！？?\n]{4,80})/);
  if (colon) chunk = colon[1];
  else {
    const idx = host.search(re("choiceInvite"));
    if (idx > 4) chunk = host.slice(Math.max(0, idx - 48), idx);
  }
  chunk = chunk.replace(/与/g, "、");
  const parts = chunk
    .split(/[、，,/／]/)
    .map((s) => String(s || "").replace(/[的呢啊哦呀\s]/g, "").trim())
    .filter((s) => s.length >= 2 && s.length <= 12);
  return parts.some((c) => bare === c || bare.includes(c) || c.includes(bare));
}

/**
 * 残句：不立刻巡检，避免拖 LLM。
 * @param {string} last 已 normalize
 * @param {string} raw
 */
function isResidualForPatrol(last, raw) {
  if (re("residualFiller").test(last)) return true;
  const bare = last.replace(/[，,。．.!！？?\s]/g, "");
  if (re("residualOpener").test(bare)) return true;
  if (bare.length <= 12 && re("residualIsEnd").test(bare) && !re("residualIsEndAllow").test(last)) {
    return true;
  }
  if (bare.length <= 4 && !re("residualShortAllow").test(last) && !re("questionMark").test(raw || last)) {
    return true;
  }
  return false;
}

/**
 * 是否立刻巡检（UI / ASR 热路径）。含选题、残句、回声、半双工口令门控。
 * @param {string} text
 * @param {{
 *   mode?: string,
 *   duplexPhase?: string,
 *   recentHostUtterances?: string[],
 *   lastWakeSpeakAt?: number
 * }} [opts]
 */
function shouldImmediatePatrolForUi(text, opts = {}) {
  const mode = opts.mode || AGENT_MODE.IDLE_LISTEN;
  const duplexPhase = opts.duplexPhase || PHASE.IDLE;
  const recent = opts.recentHostUtterances || [];
  const lastHost = recent[0] || "";
  const last = normalizeDazhiAliases(String(text || "").trim());
  if (!last || last.length < 2) return false;

  if (re("patrolForce").test(last)) return true;
  if (re("correctReask").test(last)) return true;

  if (isConsultMode(mode) && re("commitAct").test(last)) return true;

  if (isConsultMode(mode) && looksLikeOfferedChoicePick(text, lastHost)) {
    return true;
  }

  if (isResidualForPatrol(last, text)) return false;

  const sinceHostMs = opts.lastWakeSpeakAt ? Date.now() - opts.lastWakeSpeakAt : null;
  const echo = looksLikeHostEcho(last, recent, { sinceHostMs });
  if (echo.echo && !looksLikeOfferedChoicePick(text, lastHost)) return false;

  if (re("patrolNamed").test(last)) return true;

  if (isConsultMode(mode)) {
    try {
      const { isClosedFaqQuestion } = require("../meetingStrategy/query/classify.cjs");
      if (isClosedFaqQuestion(last)) return true;
    } catch (_) {
      /* 闭题模块未就绪时仍走下面的问句形态 */
    }
    const isQ =
      re("questionMark").test(last) ||
      re("consultQuestionWords").test(last) ||
      re("consultParticleEnd").test(last);
    if (isQ) return true;
    if (re("consultExpand").test(last)) return true;
    const cmd = detectAgentCommand(text);
    const t = cmd.text || last;
    if (t.length >= 8 && re("consultTopic").test(t)) return true;
  }

  if (
    (duplexPhase === PHASE.SPEAKING || duplexPhase === PHASE.COOLDOWN) &&
    !looksLikeBargeInCommand(text) &&
    !re("patrolSpeakingNamed").test(last)
  ) {
    return false;
  }

  if (isSilentMode(mode) && !isConsultMode(mode)) return false;
  if (mode === AGENT_MODE.PAUSED || !mode) return false;
  return false;
}

/** @deprecated 兼容旧调用；请用 shouldImmediatePatrolForUi */
function shouldImmediatePatrolForMode(text, mode) {
  return shouldImmediatePatrolForUi(text, { mode });
}

module.exports = {
  looksLikeBargeInCommand,
  looksLikeWakeCommand,
  looksLikeCleanWakeBarge,
  looksLikeStopBargeHint,
  looksLikeSpeakEcho,
  extractBargeCommandText,
  bargeTail,
  displayCorrectAsr,
  looksLikeOfferedChoicePick,
  shouldImmediatePatrolForUi,
  shouldImmediatePatrolForMode
};
