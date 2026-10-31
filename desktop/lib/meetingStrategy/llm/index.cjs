/**
 * meetingStrategy/llm — BYOK 补全（当前豆包）、失败回退、整段口播。
 */
const transport = require("./transport.cjs");
const { chatFallbackFor } = require("./fallback.cjs");
const { speakViaChat, FAST_LLM_MS } = require("./speak.cjs");
const providers = require("./providers");

module.exports = {
  ...transport,
  ...providers,
  chatFallbackFor,
  speakViaChat,
  FAST_LLM_MS
};
