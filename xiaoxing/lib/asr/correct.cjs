"use strict";

const fs = require("fs");
const { schemaFile } = require("../knowledge/paths.cjs");

let _rules = null;

function loadCorrectionRules() {
  if (_rules) return _rules;
  try {
    const raw = JSON.parse(fs.readFileSync(schemaFile("asr-corrections.json"), "utf8"));
    const list = Array.isArray(raw?.replacements) ? raw.replacements : [];
    _rules = list
      .filter((r) => r && r.from && r.to && r.from !== r.to)
      .map((r) => ({
        from: String(r.from),
        to: String(r.to),
        re: new RegExp(escapeRegExp(String(r.from)), "gi")
      }))
      .sort((a, b) => b.from.length - a.from.length);
  } catch (_) {
    _rules = [];
  }
  return _rules;
}

function escapeRegExp(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * 云 ASR 文本农服纠错（非本地 Whisper）
 */
function correctAsrText(text) {
  let out = String(text || "");
  if (!out.trim()) return out;
  for (const r of loadCorrectionRules()) {
    out = out.replace(r.re, r.to);
  }
  return out;
}

function resetCorrectionCache() {
  _rules = null;
}

module.exports = {
  correctAsrText,
  loadCorrectionRules,
  resetCorrectionCache
};
