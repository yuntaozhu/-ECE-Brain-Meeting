/**
 * meetingSession — 会议会话状态（互动姿态 / 生命周期 / 口令与意图）
 * 与 LLM Agent / KaibanJS 无关。
 */
const constants = require("./constants.cjs");
const { normalizeDazhiAliases, peelWakePayload } = require("./commands/normalize.cjs");
const {
  detectAgentCommand,
  detectMeetingCommand
} = require("./commands/detectCommand.cjs");
const sessionState = require("./SessionState.cjs");
const intents = require("./intents");
const patrol = require("./patrolPolicy.cjs");

module.exports = {
  ...constants,
  normalizeDazhiAliases,
  peelWakePayload,
  detectAgentCommand,
  detectMeetingCommand,
  ...sessionState,
  ...intents,
  ...patrol
};
