/**
 * knowledge/rag — 语义检索（Embedding + 本地余弦）
 */
const { splitChunks } = require("./chunks.cjs");
const { embedTexts, embedOneText } = require("./embed.cjs");
const { ensureIndex } = require("./store.cjs");
const {
  retrieveSemantic,
  semanticStatus,
  warmIndexFromDisk,
  resetEmbedGate
} = require("./retrieve.cjs");
const { indexReadFile } = require("./paths.cjs");

module.exports = {
  splitChunks,
  retrieveSemantic,
  ensureIndex,
  warmIndexFromDisk,
  embedTexts,
  embedOneText,
  semanticStatus,
  resetEmbedGate,
  get INDEX_FILE() {
    return indexReadFile();
  }
};
