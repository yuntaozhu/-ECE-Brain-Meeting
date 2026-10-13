/**
 * meetingStrategy — 会议策略引擎（听一句 → 是否干预 → 答什么）
 * 与开源 KaibanJS 无关。
 *
 * 结构：
 *   engine / pipeline / handlers(+kit) — 责任链
 *   query / advisors — 问句分流与经营顾问
 *   paths/consult — 咨询子策略；summaryPath / closingPath
 *   llm / internal/{kit,deps,scripts,result} — 共享工具与 Chat
 *
 * 命名：INTERACTION_MODE；日志 Strategy；IPC strategy:evaluate / session:mode。
 * 回归：npm run smoke
 */
const impl = require("./engine.cjs");
const query = require("./query");
const advisors = require("./advisors");

module.exports = {
  ...impl,
  query,
  advisors
};
