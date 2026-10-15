/**
 * 经营先开口已退出。口播由 MeetingAgent 在检索闸门之后统一发出。
 * 保留导出，避免旧调用点在检索前播模板或改走「第二条路」。
 */
function tryBizAnswer() {
  return null;
}

module.exports = { tryBizAnswer };
