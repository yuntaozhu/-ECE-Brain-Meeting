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
  displayCorrectAsr,
  looksLikeOfferedChoicePick,
  shouldImmediatePatrolForUi,
  shouldImmediatePatrolForMode
};
