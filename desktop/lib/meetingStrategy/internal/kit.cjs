/**
 * meetingStrategy 共享工具包（deps + result + scripts + llm）
 * handlers 请用 handlers/kit（不含 llm）；consult 用本模块或 paths/consult/kit。
 */
const D = require("./deps.cjs");
const result = require("./result.cjs");
const scripts = require("./scripts.cjs");
const llm = require("../llm");

module.exports = {
  ...D,
  ...result,
  ...scripts,
  ...llm,
  INTERACTION_MODE: D.INTERACTION_MODE || D.AGENT_MODE
};
