/**
 * handlers 共用薄工具包（不含 llm；咨询路径请用 paths/consult/kit）
 */
const {
  INTERACTION_MODE,
  MEETING_LIFE,
  setMode,
  setLifecycle,
  ensureMeetingOpen,
  deriveMeetingLife,
  newSegment,
  classifyHaIntent,
  isConsultMode,
  isSilentMode,
  peelWakePayload
} = require("../../meetingSession");
const { looksLikeHostEcho } = require("../../duplex");
const { debugLog } = require("../../platform/debugLog.cjs");
const { clearMeetingCache } = require("../../runtime");
const { baseResult, playAnswer, newEvent, clipSpeak } = require("../internal/result.cjs");
const { CONTINUE_SCRIPT } = require("../internal/scripts.cjs");
const { runSummaryPath } = require("../paths/summaryPath.cjs");
const { runClosingPath } = require("../paths/closingPath.cjs");

module.exports = {
  INTERACTION_MODE,
  MEETING_LIFE,
  setMode,
  setLifecycle,
  ensureMeetingOpen,
  deriveMeetingLife,
  newSegment,
  classifyHaIntent,
  isConsultMode,
  isSilentMode,
  peelWakePayload,
  looksLikeHostEcho,
  debugLog,
  clearMeetingCache,
  baseResult,
  playAnswer,
  newEvent,
  clipSpeak,
  CONTINUE_SCRIPT,
  runSummaryPath,
  runClosingPath
};
