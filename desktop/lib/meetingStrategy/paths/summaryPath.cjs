/** 分段总结路径 */
const D = require("../internal/deps.cjs");
const { newEvent, clipSpeak } = require("../internal/result.cjs");
const { arkChat } = require("../llm");
const {
  debugLog,
  INTERACTION_MODE,
  MEETING_LIFE,
  setMode,
  setLifecycle,
  newSegment,
  ensureMeetingOpen,
  deriveMeetingLife,
  readSession,
  formatSessionForPrompt,
  writeSummary,
  writeFaqCandidate,
  stripIntroBoilerplate
} = D;

async function runSummaryPath(state, agenda, opts, a2aTrace, kbStatus, withTopic) {
  ensureMeetingOpen(state, agenda);
  setMode(state, INTERACTION_MODE.HH_SUM);
  setLifecycle(state, MEETING_LIFE.SUMMARY);
  const rows = readSession(state.meetingId, { segmentId: state.segmentId, limit: 40 });
  const fallbackRows = rows.length ? rows : readSession(state.meetingId, { limit: 30 });
  const body = formatSessionForPrompt(fallbackRows, 2800) || "（本段暂无足够转写）";
  let summaryText = "";
  let topicText = "";
  let arkMode = "heuristic";
  const ac = new AbortController();
  const sumTimer = setTimeout(() => ac.abort(), 15000);
  try {
    const res = await arkChat(
      "你是大智会议秘书。根据转写输出：1) 口播用极短总结（≤40字，一两句）；2) 一行「下一议题：…」必须可执行（谁/哪班/做什么）。不要套话。",
      `议程：${agenda}\n转写：\n${body}\n\n按格式：\n总结：...\n下一议题：...`,
      { fast: true, temperature: 0.3, signal: ac.signal, timeoutMs: 15000 }
    );
    if (res.ok && res.content) {
      const raw = res.content;
      const sm = raw.match(/总结[:：]\s*([\s\S]+?)(?=下一议题|$)/);
      const tm = raw.match(/下一议题[:：]\s*([\s\S]+)/);
      summaryText = clipSpeak((sm ? sm[1] : raw).trim(), 80);
      topicText = clipSpeak((tm ? tm[1] : "").trim(), 60);
      arkMode = "llm";
    }
  } catch (err) {
    debugLog.warn("Strategy", "总结 LLM 失败，用本地兜底", {
      error: String(err?.message || err)
    });
  } finally {
    clearTimeout(sumTimer);
  }
  // 超时/失败：本地兜底，禁止「没听清」
  if (!summaryText) {
    summaryText =
      body && body.length > 20
        ? "这段已记入本场会话。稍后可打开会话目录查看转写；下一步建议把动作落到具体班级和负责人。"
        : "这段转写还不多。您可以继续讨论，或再说「大智总结一下」。";
  }
  if (withTopic && !topicText) topicText = "下一议题：确定样板班班级与每日五分钟转发谁来盯。";
  const md =
    `【大智会议纪要】\n时段：${new Date().toISOString()}\n议程：${agenda}\n\n` +
    `核心结论：\n${summaryText}\n\n` +
    (topicText ? `建议下一议题：\n${topicText}\n\n` : "") +
    `转写摘录：\n${body.slice(0, 1500)}\n`;
  writeSummary(state.meetingId, md);
  writeFaqCandidate(state.meetingId, `候选：${summaryText}`);
  const speak = withTopic && topicText ? `${summaryText} ${topicText}` : summaryText;
  a2aTrace.push(
    newEvent("SecretaryAgent", "HostAgent", "SEGMENT_SUMMARY", { summaryText, topicText, arkMode })
  );
  newSegment(state);
  setMode(state, INTERACTION_MODE.IDLE_LISTEN);
  setLifecycle(state, MEETING_LIFE.SILENT);
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
    arkMode,
    arkBillingOverdue: false,
    arkError: null,
    agentMode: state.mode,
    modeChange: INTERACTION_MODE.IDLE_LISTEN,
    kbStatus,
    summaryMarkdown: md,
    meetingLifecycle: deriveMeetingLife(state)
  };
}


module.exports = { runSummaryPath };
