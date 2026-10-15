/**
 * meetingStrategy/llm — Ark 补全、失败回退、整段口播。
 */
const transport = require("./transport.cjs");
const { chatFallbackFor } = require("./fallback.cjs");
const { speakViaChat, FAST_LLM_MS } = require("./speak.cjs");

module.exports = {
  ...transport,
  chatFallbackFor,
  speakViaChat,
  FAST_LLM_MS
};
