/** RAG 进程内可变状态 */
module.exports = {
  memIndex: null,
  buildPromise: null,
  embedUnavailable: false,
  embedFailReason: ""
};
