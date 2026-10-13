/** Wiki 路径与目录 */
const fs = require("fs");
const path = require("path");
const { knowledgeReadRoot, knowledgeWriteRoot } = require("../../platform/appPaths.cjs");

function wikiReadRoot() {
  return path.join(knowledgeReadRoot(), "wiki");
}
function wikiWriteRoot() {
  return path.join(knowledgeWriteRoot(), "wiki");
}
function conceptsReadDirs() {
  const read = path.join(wikiReadRoot(), "concepts");
  const write = path.join(wikiWriteRoot(), "concepts");
  return read === write ? [read] : [read, write];
}
function conceptsWriteDir() {
  return path.join(wikiWriteRoot(), "concepts");
}
function indexReadFile() {
  return path.join(wikiReadRoot(), "index.md");
}
function indexWriteFile() {
  return path.join(wikiWriteRoot(), "index.md");
}
function logWriteFile() {
  return path.join(wikiWriteRoot(), "log.md");
}

function ensureWikiDirs() {
  for (const d of [conceptsWriteDir(), wikiWriteRoot()]) {
    try {
      fs.mkdirSync(d, { recursive: true });
    } catch (_) {}
  }
}

module.exports = {
  wikiReadRoot,
  wikiWriteRoot,
  conceptsReadDirs,
  conceptsWriteDir,
  indexReadFile,
  indexWriteFile,
  logWriteFile,
  ensureWikiDirs
};
