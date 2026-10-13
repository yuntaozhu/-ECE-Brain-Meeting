/**
 * Platform — 路径与调试日志（与业务策略无关）
 */
module.exports = {
  ...require("./appPaths.cjs"),
  ...require("./debugLog.cjs")
};
