/**
 * duplex — 半双工控场（PHASE / 回声 / 文本归一 / 巡检启发式）
 * 与 meetingSession（业务口令）正交。
 */
const textNorm = require("./textNorm.cjs");
const phase = require("./phase.cjs");
const echo = require("./echo.cjs");
const patrolHints = require("./patrolHints.cjs");

module.exports = {
  ...textNorm,
  ...phase,
  ...echo,
  ...patrolHints
};
