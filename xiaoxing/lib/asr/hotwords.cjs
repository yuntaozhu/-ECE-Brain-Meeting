"use strict";

const fs = require("fs");
const { schemaFile } = require("../knowledge/paths.cjs");

let _cache = null;

function loadHotwords() {
  if (_cache) return _cache;
  const defaults = ["小星", "草莓", "宁玉", "宁丰", "脱毒苗"];
  try {
    const raw = JSON.parse(fs.readFileSync(schemaFile("asr-hotwords.json"), "utf8"));
    const list = Array.isArray(raw?.words) ? raw.words : [];
    _cache = [...new Set([...defaults, ...list.map((w) => String(w).trim()).filter(Boolean)])].slice(
      0,
      40
    );
  } catch (_) {
    _cache = defaults;
  }
  return _cache;
}

function resetHotwordsCache() {
  _cache = null;
}

module.exports = { loadHotwords, resetHotwordsCache };
