/**
 * 口播决策入口。
 * 假设比较仍在 agent/relevance.cjs。本文件是流水线唯一入口：
 * 转写 → 模型 → 知识库 → decideSpeak → 写回模型。
 * 先验由 engine-hyperparams.json 的 markov 与脚本特异度调制。
 * 作答线仍是后验、贝叶斯因子、对齐、闭题放宽，不在这里改阈值。
 */
const { decideSpeak: decideFromModel } = require("./agent/relevance.cjs");

function decideSpeak(args) {
  return decideFromModel(args || {});
}

module.exports = { decideSpeak };
