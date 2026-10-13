/** 会末收尾路径 */
const D = require("../internal/deps.cjs");
const scripts = require("../internal/scripts.cjs");
const { newEvent, clipSpeak } = require("../internal/result.cjs");
const { arkChat } = require("../llm");
const {
  debugLog,
  INTERACTION_MODE,
  MEETING_LIFE,
  setMode,
  setLifecycle,
  newSegment,
  readSession,
  formatSessionForPrompt,
  writeSummary,
  writeFaqCandidate,
  stripIntroBoilerplate
} = D;
const { ENDING_SCRIPT } = scripts;

async function runClosingPath(state, agenda, opts, a2aTrace, kbStatus) {
  setLifecycle(state, MEETING_LIFE.CLOSING);
  setMode(state, INTERACTION_MODE.HH_SUM);
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
  setMode(state, INTERACTION_MODE.IDLE_LISTEN, { newSegment: true });
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
    modeChange: INTERACTION_MODE.IDLE_LISTEN,
    kbStatus,
    summaryMarkdown: md,
    requestSessionPromote: true,
    requestListenStop: true,
    meetingId: state.meetingId,
    meetingLifecycle: MEETING_LIFE.CLOSING,
    closing: { conclusions, disputes, todos, nextStep }
  };
}

module.exports = { runClosingPath };
