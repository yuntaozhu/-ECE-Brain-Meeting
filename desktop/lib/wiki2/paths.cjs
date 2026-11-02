"use strict";

const path = require("path");
const fs = require("fs");
const { wiki2WriteRoot, wiki2ReadRoot } = require("../platform/appPaths.cjs");

/**
 * 运行态根：可写（开发态即 desktop/knowledge_wiki；安装包为 userData）。
 * 页面读取优先 writeRoot，缺失时回退 readRoot（resources 种子）。
 */
function wiki2Root() {
  const fromEnv = (process.env.WIKI2_ROOT || "").trim();
  if (fromEnv) return path.resolve(fromEnv);
  return wiki2WriteRoot();
}

function wiki2SeedRoot() {
  const fromEnv = (process.env.WIKI2_ROOT || "").trim();
  if (fromEnv) return path.resolve(fromEnv);
  return wiki2ReadRoot();
}

function wikiDir() {
  const writeWiki = path.join(wiki2Root(), "wiki");
  if (fs.existsSync(writeWiki)) return writeWiki;
  const seed = path.join(wiki2SeedRoot(), "wiki");
  return fs.existsSync(seed) ? seed : writeWiki;
}

function decisionsDir() {
  return path.join(wikiDir(), "decisions");
}

function entitiesDir() {
  return path.join(wikiDir(), "entities");
}

function themesDir() {
  return path.join(wikiDir(), "themes");
}

function episodesDir() {
  return path.join(wiki2Root(), "raw", "episodes");
}

function changelogDir() {
  return path.join(wiki2Root(), "changelog");
}

function graphIndexDir() {
  return path.join(wiki2Root(), ".graph_index");
}

function indexPath() {
  return path.join(graphIndexDir(), "index.json");
}

function ensureWiki2Dirs() {
  for (const d of [
    decisionsDir(),
    entitiesDir(),
    themesDir(),
    episodesDir(),
    changelogDir(),
    graphIndexDir()
  ]) {
    fs.mkdirSync(d, { recursive: true });
  }
}

module.exports = {
  wiki2Root,
  wiki2SeedRoot,
  wikiDir,
  decisionsDir,
  entitiesDir,
  themesDir,
  episodesDir,
  changelogDir,
  graphIndexDir,
  indexPath,
  ensureWiki2Dirs
};
