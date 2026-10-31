"use strict";

const fs = require("fs");
const path = require("path");

const DEFAULT_GLOSSARY = path.join(
  __dirname,
  "..",
  "..",
  "dev_knowledge",
  "glossary",
  "project_terms.json"
);

let _cache = { mtimeMs: -1, rules: [] };

function loadRules(filePath = process.env.ASR_GLOSSARY_PATH || DEFAULT_GLOSSARY) {
  try {
    const st = fs.statSync(filePath);
    if (_cache.mtimeMs === st.mtimeMs && _cache.rules.length) return _cache.rules;
    const raw = JSON.parse(fs.readFileSync(filePath, "utf8"));
    const list = Array.isArray(raw?.replacements) ? raw.replacements : [];
    const rules = list
      .filter((r) => r && typeof r.from === "string" && typeof r.to === "string" && r.from !== r.to)
      .map((r) => ({
        from: r.from,
        to: r.to,
        re: new RegExp(escapeRegExp(r.from), "gi")
      }))
      .sort((a, b) => b.from.length - a.from.length);
    _cache = { mtimeMs: st.mtimeMs, rules };
    return rules;
  } catch (_) {
    return _cache.rules || [];
  }
}

function escapeRegExp(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * 对 ASR/Whisper 原文做术语纠错。无命中则原样返回。
 */
function glossaryCorrect(text, opts = {}) {
  const src = String(text || "");
  if (!src.trim()) return src;
  const rules = loadRules(opts.glossaryPath);
  let out = src;
  for (const r of rules) {
    out = out.replace(r.re, r.to);
  }
  return out;
}

function resetGlossaryCache() {
  _cache = { mtimeMs: -1, rules: [] };
}

module.exports = {
  glossaryCorrect,
  loadRules,
  resetGlossaryCache,
  DEFAULT_GLOSSARY
};
