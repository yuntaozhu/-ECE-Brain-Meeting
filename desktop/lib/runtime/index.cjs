/**
 * runtime — 会中运行时附属（答缓存 / 本场会话日志）
 * 与 knowledge 语料库正交：这里是本场痕迹，不是领域知识。
 */
module.exports = {
  ...require("./answerCache.cjs"),
  ...require("./sessionLog.cjs")
};
