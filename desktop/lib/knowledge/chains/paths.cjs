/**
 * Continuous follow-up chain paths under knowledge/chains.
 */
const path = require("path");
const { knowledgeReadRoot, knowledgeWriteRoot } = require("../../platform/appPaths.cjs");

function chainsWriteDir() {
  return path.join(knowledgeWriteRoot(), "chains");
}

function chainsReadDir() {
  return path.join(knowledgeReadRoot(), "chains");
}

function byCardDir() {
  return path.join(chainsWriteDir(), "by-card");
}

function readableDir() {
  return path.join(chainsWriteDir(), "readable");
}

function indexPath() {
  return path.join(chainsWriteDir(), "index.json");
}

function tuneSamplePath() {
  return path.join(chainsWriteDir(), "tune-samples.jsonl");
}

module.exports = {
  chainsWriteDir,
  chainsReadDir,
  byCardDir,
  readableDir,
  indexPath,
  tuneSamplePath
};
