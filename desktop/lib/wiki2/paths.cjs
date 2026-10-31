"use strict";

const path = require("path");
const fs = require("fs");

function wiki2Root() {
  const fromEnv = (process.env.WIKI2_ROOT || "").trim();
  if (fromEnv) return path.resolve(fromEnv);
  return path.join(__dirname, "..", "..", "knowledge_wiki");
}

function wikiDir() {
  return path.join(wiki2Root(), "wiki");
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
