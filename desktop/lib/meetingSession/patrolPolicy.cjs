/**
 * 会议会话 — 业务侧巡检门控（是否立刻跑策略引擎）
 * 与 duplex/patrolHints（麦控启发式）分工；UI 与主进程共用本文件。
 */
const { looksLikeHostEcho, PHASE } = require("../duplex");
const { AGENT_MODE } = require("./constants.cjs");
const { detectAgentCommand } = require("./commands/detectCommand.cjs");
const { normalizeDazhiAliases } = require("./commands/normalize.cjs");
const { isSilentMode, isConsultMode } = require("./SessionState.cjs");

const CHOICE_INVITE_RE = /想先听|先听哪|听哪一块|哪一块|先说哪|选哪|听哪一/;

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

/**
 * 界面显示用 ASR 纠错（保留标点）。
 * @param {string} text
 */
function displayCorrectAsr(text) {
  let t = String(text || "").trim();
  if (!t) return "";
  t = normalizeDazhiAliases(t);
  t = t.replace(/全全园园/g, "全园").replace(/全全员员/g, "全员");
  t = t.replace(/美与/g, "美语");
  t = t.replace(/椭圆/g, "我园");
  t = t.replace(/营收以成本/g, "营收与成本");
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
  if (/(大智|谢谢|会议开始|会议结束|听我说|我说完了)/.test(bare)) return false;
  const host = String(lastHostAnswer || "").trim();
  if (!host || !CHOICE_INVITE_RE.test(host)) return false;
  let chunk = "";
  const colon = host.match(/[：:]([^。！？?\n]{4,80})/);
  if (colon) chunk = colon[1];
  else {
    const idx = host.search(CHOICE_INVITE_RE);
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
  if (/^(喂+|好+|嗯+|啊+|哦+|行+|对+|是+|没+|不是)[。.!！？]?$/i.test(last)) return true;
  const bare = last.replace(/[，,。．.!！？?\s]/g, "");
  if (/^(一是|二是|三是|然后|那个|这个|就是|还有|如)$/.test(bare)) return true;
  if (bare.length <= 12 && /是$/.test(bare) && !/(什么|谁|多少|哪些|吗|呢|在吗)/.test(last)) {
    return true;
  }
  if (bare.length <= 4 && !/(大智|李老师|总结|在吗)/.test(last) && !/[？?]/.test(raw || last)) {
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

  if (
    /谢谢大智|谢谢李老师|停止大智|大智.{0,8}(会议开始|会议结束)|请继续|听我说|我说完了/.test(last)
  ) {
    return true;
  }

  if (isConsultMode(mode) && looksLikeOfferedChoicePick(text, lastHost)) {
    return true;
  }

  if (isResidualForPatrol(last, text)) return false;

  const sinceHostMs = opts.lastWakeSpeakAt ? Date.now() - opts.lastWakeSpeakAt : null;
  const echo = looksLikeHostEcho(last, recent, { sinceHostMs });
  if (echo.echo && !looksLikeOfferedChoicePick(text, lastHost)) return false;

  if (
    /大智|大致|李老师|总结|暂停记录|继续记录|要总结|听我说完|我说完了|呼叫大智|大智咨询|大智探讨/.test(
      last
    )
  ) {
    return true;
  }

  if (isConsultMode(mode)) {
    try {
      const { isClosedFaqQuestion } = require("../meetingStrategy/query/classify.cjs");
      if (isClosedFaqQuestion(last)) return true;
    } catch (_) {
      /* 闭题模块未就绪时仍走下面的问句形态 */
    }
    const isQ =
      /[？?]/.test(last) ||
      /(什么意思|是什么|是谁|怎么[样办]|为什么|为何|能不能|可不可以|是否|真的吗|真的能|行不行|是不是|有没有|值得吗|划算吗)/.test(
        last
      ) ||
      /(吗|呢)\s*[。.!！]?$/.test(last);
    if (isQ) return true;
    // 追问展开：再具体 / 更多信息 — 立刻巡检，勿等冷场
    if (/(再具体|更具体|更多|详细|展开|多说一点|说细)/.test(last)) return true;
    const cmd = detectAgentCommand(text);
    const t = cmd.text || last;
    if (t.length >= 8 && /(抵触|为了啥|怎么办|崩溃|起死回生|招生|盈利|赚钱)/.test(t)) return true;
  }

  if (
    (duplexPhase === PHASE.SPEAKING || duplexPhase === PHASE.COOLDOWN) &&
    !looksLikeBargeInCommand(text) &&
    !/大智|李老师/.test(last)
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
  displayCorrectAsr,
  looksLikeOfferedChoicePick,
  shouldImmediatePatrolForUi,
  shouldImmediatePatrolForMode
};
