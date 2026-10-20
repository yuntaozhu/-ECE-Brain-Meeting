/** 分段总结路径 */
const D = require("../internal/deps.cjs");
const { extractiveSummary } = require("../internal/scripts.cjs");
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
  const rows = readSession(state.meetingId, { limit: 40 });
  const fallbackRows = rows;
  const body = formatSessionForPrompt(fallbackRows, 1800) || "（本段暂无足够转写）";
  const localSummary = extractiveSummary(fallbackRows, {
    pendingAsk: state.pendingAsk || ""
  });
  let summaryText = "";
  let topicText = "";
  let arkMode = "extractive";
  const ac = new AbortController();
  const sumTimer = setTimeout(() => ac.abort(), 4000);
  try {
    const res = await arkChat(
      "你是大智会议秘书。只根据下面转写里真实出现的提问作总结，禁止编造样板班、负责人或转写里没有的动作。口播≤40字。若转写里没有下一议题，不要写下一议题。",
      `议程：${agenda}\n转写：\n${body}\n\n按格式：\n总结：...\n下一议题：...`,
      { fast: true, temperature: 0.2, signal: ac.signal, timeoutMs: 4000 }
    );
    if (res.ok && res.content) {
      const raw = res.content;
      const sm = raw.match(/总结[:：]\s*([\s\S]+?)(?=下一议题|$)/);
      const tm = raw.match(/下一议题[:：]\s*([\s\S]+)/);
      const got = clipSpeak((sm ? sm[1] : raw).trim(), 80);
      if (got && !/样板班|会话目录|记入本场/.test(got)) {
        summaryText = got;
        const topic = clipSpeak((tm ? tm[1] : "").trim(), 40);
        if (topic && !/样板班|确定班级/.test(topic) && body.includes(topic.slice(0, 4))) {
          topicText = topic;
        }
        arkMode = "llm";
      }
    }
  } catch (err) {
    debugLog.warn("Strategy", "总结 LLM 失败，用转写摘句", {
      error: String(err?.message || err)
    });
  } finally {
    clearTimeout(sumTimer);
  }
  if (!summaryText) summaryText = localSummary;
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
