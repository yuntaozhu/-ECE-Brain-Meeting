/**
 * 会议副驾驶旁路：意图门控 + 建议卡 + Speculative RAG + Auto/Manual
 * + Catch Me Up / Quick Jot / Screen / Mermaid hint。
 * 不改 decideSpeak / 口播责任链。
 */
const gate = require("./gate.cjs");
const suggest = require("./suggest.cjs");
const prefetch = require("./prefetch.cjs");
const mode = require("./mode.cjs");
const recap = require("./recap.cjs");
const jot = require("./jot.cjs");
const screenContext = require("./screenContext.cjs");
const mermaidHint = require("./mermaidHint.cjs");
const deepDive = require("./deepDive.cjs");
const ocrWin = require("./ocrWin.cjs");

module.exports = {
  ...gate,
  ...suggest,
  ...prefetch,
  ...mode,
  ...recap,
  ...jot,
  ...screenContext,
  ...mermaidHint,
  ...deepDive,
  ...ocrWin
};
