/**
 * 会议会话 — 业务侧巡检门控（是否立刻跑策略引擎）
 * 与 duplex/patrolHints（麦控启发式）分工。
 */
const { isQuestionForm, TOPIC_HINT_RE } = require("../duplex");
const { AGENT_MODE } = require("./constants.cjs");
const { detectAgentCommand } = require("./commands/detectCommand.cjs");
const { isSilentMode, isConsultMode } = require("./SessionState.cjs");

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
  if (cmd.command) return true;
  if (cmd.holdToEnd || cmd.sayDone) return true;
  const m = mode || AGENT_MODE.IDLE_LISTEN;
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

module.exports = {
  looksLikeBargeInCommand,
  shouldImmediatePatrolForMode
};
