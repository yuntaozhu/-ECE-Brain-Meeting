/**
 * knowledge — 知识库门面（FAQ / 详版 / Wiki / 语义 RAG / 答后沉淀）
 * wiki/ · rag/ 已分子模块；本文件聚合导出。
 */
const corpus = require("./corpus.cjs");
const wiki = require("./wiki");
const sink = require("./sink");
const rag = require("./rag");
const schemaStore = require("./schemaStore.cjs");

module.exports = {
  ...corpus,
  ...wiki,
  ...sink,
  ...rag,
  schemaStore
};
