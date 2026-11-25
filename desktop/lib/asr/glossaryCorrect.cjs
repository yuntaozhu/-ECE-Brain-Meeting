"use strict";

const fs = require("fs");
const { glossaryPath, sharedGlossaryPath } = require("../platform/appPaths.cjs");

let _cache = { key: "", rules: [] };

function parseFile(filePath) {
  try {
    if (!filePath || !fs.existsSync(filePath)) return [];
    const raw = JSON.parse(fs.readFileSync(filePath, "utf8"));
    const list = Array.isArray(raw?.replacements) ? raw.replacements : [];
    return list.filter((r) => r && typeof r.from === "string" && typeof r.to === "string");
  } catch (_) {
    return [];
  }
}

function escapeRegExp(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * 合并 shared 通用热词 + 项目热词；同 from 时项目覆盖 shared。
 */
function loadRules(opts = {}) {
  const projectPath = opts.glossaryPath || glossaryPath();
  const sharedPath = opts.sharedGlossaryPath || sharedGlossaryPath();
  let key = `${sharedPath}|${projectPath}`;
  try {
    const sm = fs.existsSync(sharedPath) ? fs.statSync(sharedPath).mtimeMs : 0;
    const pm = fs.existsSync(projectPath) ? fs.statSync(projectPath).mtimeMs : 0;
    key = `${sharedPath}@${sm}|${projectPath}@${pm}`;
  } catch (_) {}
  if (_cache.key === key && _cache.rules.length) return _cache.rules;

  const byFrom = new Map();
  for (const r of parseFile(sharedPath)) byFrom.set(r.from, r.to);
  for (const r of parseFile(projectPath)) byFrom.set(r.from, r.to);

  const rules = [...byFrom.entries()]
    .filter(([from, to]) => from !== to)
    .map(([from, to]) => ({
      from,
      to,
      re: new RegExp(escapeRegExp(from), "gi")
    }))
    .sort((a, b) => b.from.length - a.from.length);

  _cache = { key, rules };
  return rules;
}

/**
 * 对 ASR/Whisper 原文做术语纠错。无命中则原样返回。
 */
function glossaryCorrect(text, opts = {}) {
  const src = String(text || "");
  if (!src.trim()) return src;
  const rules = loadRules(opts);
  let out = src;
  for (const r of rules) {
    out = out.replace(r.re, r.to);
  }
  return out;
}

function resetGlossaryCache() {
  _cache = { key: "", rules: [] };
}

module.exports = {
  glossaryCorrect,
  loadRules,
  resetGlossaryCache,
  glossaryPath,
  sharedGlossaryPath,
  get DEFAULT_GLOSSARY() {
    return glossaryPath();
  }
};
