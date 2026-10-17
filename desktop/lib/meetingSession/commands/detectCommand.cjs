/**
 * 会议会话 — 口令检测（优先级决策表）
 */
const { isQuestionForm } = require("../../duplex");
const { DAZHI_RE } = require("../constants.cjs");
const { normalizeDazhiAliases, peelWakePayload } = require("./normalize.cjs");

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
    .split(/[。！？!?；;\n]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (!clauses.length) return [t];
  if (clauses.length === 1) return clauses;
  const last = clauses[clauses.length - 1];
  const prev = clauses[clauses.length - 2];
  if (last.length < 8 && prev) return [prev, last];
  return [last];
}

function detectAgentCommand(lastFloor) {
  const raw = String(lastFloor || "").trim();
  const full = normalizeDazhiAliases(raw);
  if (!full) return emptyCommand("");
  const tails = tailClausesForCommand(full);
  const t = tails.join("。");
  if (t.replace(/\s/g, "").length < 2) return emptyCommand(full);

  const named =
    tails.some((s) => DAZHI_RE.test(s) || /李老师/.test(s)) ||
    DAZHI_RE.test(full) ||
    /李老师/.test(full);
  const payload = peelWakePayload(full) || peelWakePayload(t);

  const meetingEnd =
    tails.some((s) => /大智[，,\s]*(会议结束|散会了?|结束会议)/.test(s)) ||
    /大智[，,\s]*(会议结束|散会了?|结束会议)/.test(full) ||
    (named && /^(会议结束|散会)[。.!！？?\s]*$/.test(payload));
  const meetingStart =
    tails.some((s) => /大智[，,\s]*(会议开始|开会了|开始会议|我们开会)/.test(s)) ||
    /大智[，,\s]*(会议开始|开会了|开始会议|我们开会)/.test(full) ||
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
    /停止大智|大智休息|大智闭嘴|大智先听着|谢谢李老师|停止李老师|谢谢大智/.test(t) ||
    /谢谢大智|停止大智|大智休息|大智闭嘴|大智先听着/.test(full);

  const bareInterrupt = (s) => /^(大智[，,]?)?(听我说|你听我说)[。.!！？?]*$/.test(clauseBare(s));
  const interrupt =
    /大智[，,\s]*(听我说|先听我说|你先听|先别说)/.test(t) ||
    /你先听我说完|请听我说完|先听我说|听我说完|大智听我说/.test(t) ||
    /大智[，,\s]*(听我说|先听我说|你先听|先别说)|大智听我说|请听我说完/.test(full) ||
    scan.some(bareInterrupt) ||
    bareInterrupt(full);

  const continueSpeak =
    !stop &&
    scan.some((s) =>
      /^(大智[，,]?)?(请继续|接着说|你继续|继续(说|答|讲)?)[。.!！？?]*$/.test(clauseBare(s))
    );

  const summaryHint = (s) =>
    Boolean(s) &&
    (/大智\s*(总结|小结|归纳)|(?:请|帮)?\s*(总结|小结)\s*(一下|这段|这次|对话|会场|刚刚)?|结束并总结|做个纪要|对对话进行总结|总结一下对话|能不能总结|可以总结吗|帮我总结|总结下这次|总结下刚刚/.test(
      s
    ) ||
      /(总结|小结).{0,10}(对话|这段|刚才|会场|刚刚)/.test(s)) &&
    !/(看不到|记不记得|问了什么)/.test(s);
  const summary =
    !meetingEnd && (summaryHint(t) || summaryHint(full) || summaryHint(payload));
  const confirmSummary = /要总结|需要总结|总结吧|可以总结|开始总结/.test(t) || /要总结|可以总结/.test(full);
  const pauseLog = /暂停记录/.test(t);
  const resumeLog = /继续记录/.test(t) && !continueSpeak;
  const continueHH = /你们继续|继续讨论|大智旁听|回到讨论/.test(t);
  const holdToEnd = interrupt;
  const sayDone = /我说完了|讲完了|说完了/.test(t);
  const reask =
    /回复我刚才|回到刚才|回到我刚才|刚才的问题|回复刚才/.test(t) ||
    /回复我刚才|回到刚才|刚才的问题/.test(full);
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
    (presence || /大智\s*你好|你好\s*大智|呼叫大智|大智[，,。！!？?\s]*$/.test(t))
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
