/**
 * 会议会话 — 口令检测（优先级决策表）
 */
const { isQuestionForm } = require("../../duplex");
const { DAZHI_RE } = require("../constants.cjs");
const { normalizeDazhiAliases, peelWakePayload } = require("./normalize.cjs");
const { rx, load } = require("../../knowledge/schemaStore.cjs");

const re = (name) => rx("commands", name);

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

/** 口令只扫尾句，避免长转写中间的「开会了」误触 */
function tailClausesForCommand(text) {
  const t = String(text || "").trim();
  const clauses = t
    .split(re("tailSplit"))
    .map((s) => s.trim())
    .filter(Boolean);
  if (!clauses.length) return [t];
  if (clauses.length === 1) return clauses;
  const last = clauses[clauses.length - 1];
  const prev = clauses[clauses.length - 2];
  if (last.length < load().commands.tailShortMax && prev) return [prev, last];
  return [last];
}

function detectAgentCommand(lastFloor) {
  const raw = String(lastFloor || "").trim();
  const full = normalizeDazhiAliases(raw);
  if (!full) return emptyCommand("");
  const tails = tailClausesForCommand(full);
  const t = tails.join("。");
  if (t.replace(/\s/g, "").length < load().commands.minChars) return emptyCommand(full);

  const named =
    tails.some((s) => DAZHI_RE.test(s) || re("alsoNamed").test(s)) ||
    DAZHI_RE.test(full) ||
    re("alsoNamed").test(full);
  const payload = peelWakePayload(full) || peelWakePayload(t);

  const meetingEnd =
    tails.some((s) => re("meetingEndTail").test(s)) ||
    re("meetingEndTail").test(full) ||
    (named && re("meetingEndPayload").test(payload));
  const meetingStart =
    tails.some((s) => re("meetingStartTail").test(s)) ||
    re("meetingStartTail").test(full) ||
    (named && re("meetingStartPayload").test(payload));

  const clauses = t
    .split(re("clauseSplit"))
    .map((s) => s.trim())
    .filter(Boolean);
  const scan = clauses.length ? clauses : [t];
  const clauseBare = (s) => String(s || "").replace(/\s/g, "");
  const stop =
    scan.some((s) => {
      const c = clauseBare(s);
      return re("stopBareThanks").test(c) || re("stopBareRest").test(c);
    }) ||
    re("stopLoose").test(t) ||
    re("stopFull").test(full);

  const bareInterrupt = (s) => re("bareInterrupt").test(clauseBare(s));
  const interrupt =
    re("interruptTail").test(t) ||
    re("interruptLoose").test(t) ||
    re("interruptFull").test(full) ||
    scan.some(bareInterrupt) ||
    bareInterrupt(full);

  const continueSpeak =
    !stop &&
    scan.some((s) => re("continueBare").test(clauseBare(s)));

  const summaryHint = (s) =>
    Boolean(s) &&
    (re("summaryMain").test(s) || re("summaryContext").test(s)) &&
    !re("summaryDeny").test(s);
  const summary =
    !meetingEnd && (summaryHint(t) || summaryHint(full) || summaryHint(payload));
  const confirmSummary = re("confirmSummaryTail").test(t) || re("confirmSummaryFull").test(full);
  const pauseLog = re("pauseLog").test(t);
  const resumeLog = re("resumeLog").test(t) && !continueSpeak;
  const continueHH = re("continueHH").test(t);
  const holdToEnd = interrupt;
  const sayDone = re("sayDone").test(t);
  const reask = re("reaskTail").test(t) || re("reaskFull").test(full);
  const presence = named && re("presence").test(t);
  const askMode =
    re("askMode").test(t) ||
    (named && payload && re("askPayload").test(payload) && !re("askPayloadDeny").test(payload));
  const talkMode = re("talkMode").test(t) || (named && re("talkPayload").test(payload || t));

  let command = null;
  if (meetingEnd) command = "MEETING_END";
  else if (meetingStart) command = "MEETING_START";
  else if (stop) command = "STOP";
  else if (interrupt) command = "INTERRUPT";
  else if (continueSpeak) command = "CONTINUE";
  else if (reask) command = "REASK";
  else if (pauseLog) command = "PAUSE_LOG";
  else if (resumeLog) command = "RESUME_LOG";
  else if (summary) command = "SUMMARY";
  else if (confirmSummary) command = "CONFIRM_SUMMARY";
  else if (continueHH) command = "CONTINUE_HH";
  else if (askMode) command = "WAKE_ASK";
  else if (talkMode) command = "WAKE_TALK";
  else if (
    named &&
    (presence || re("wakeHello").test(t))
  ) {
    command = "WAKE";
  } else if (named && isQuestionForm(t)) {
    command = "WAKE_ASK";
  } else if (named && payload.length >= 2) {
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

/** @deprecated 使用 detectMeetingCommand */
const detectMeetingCommand = detectAgentCommand;

module.exports = {
  emptyCommand,
  tailClausesForCommand,
  detectAgentCommand,
  detectMeetingCommand
};
