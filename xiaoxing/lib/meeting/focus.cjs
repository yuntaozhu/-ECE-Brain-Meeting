"use strict";

const fs = require("fs");
const { schemaFile } = require("../knowledge/paths.cjs");

let _cfg = null;
/** @type {null | {
 *   query: string,
 *   at: number,
 *   source: 'me'|'others',
 *   status: 'open'|'answered'|'urged',
 *   layer?: string,
 *   reply?: string
 * }} */
let _focus = null;

function loadFocusCfg() {
  if (_cfg) return _cfg;
  try {
    _cfg = JSON.parse(fs.readFileSync(schemaFile("session-focus.json"), "utf8"));
  } catch (_) {
    _cfg = {
      enabled: true,
      focusGlueMs: 8000,
      shortFollowMaxChars: 12,
      urgePatterns: ["请回答"],
      recallPatterns: ["我刚刚问了什么"],
      softCommitOthersSuggest: true,
      honestNoFocus: "这轮还没有记下具体问题，请再说一遍要问的内容。"
    };
  }
  return _cfg;
}

function resetFocusCache() {
  _cfg = null;
}

function clearFocus() {
  _focus = null;
}

function getFocus() {
  return _focus ? { ..._focus } : null;
}

function normalize(text) {
  return String(text || "")
    .replace(/\s+/g, "")
    .replace(/[，,。！!？?、]/g, "");
}

function includesAny(text, list) {
  const n = normalize(text);
  return (list || []).some((p) => n.includes(normalize(p)));
}

function isUrge(text) {
  return includesAny(text, loadFocusCfg().urgePatterns);
}

function isRecall(text) {
  return includesAny(text, loadFocusCfg().recallPatterns);
}

/**
 * 受理即写（不绑成功口播）
 */
function commitFocusAsk(input = {}) {
  const cfg = loadFocusCfg();
  if (cfg.enabled === false) return null;
  const query = String(input.query || "").trim();
  if (query.length < 2) return null;
  _focus = {
    query,
    at: Date.now(),
    source: input.source === "others" ? "others" : "me",
    status: "open",
    layer: undefined,
    reply: undefined
  };
  return getFocus();
}

function markFocusAnswered(input = {}) {
  if (!_focus) return null;
  _focus.status = "answered";
  if (input.layer) _focus.layer = input.layer;
  if (input.reply) _focus.reply = String(input.reply).slice(0, 200);
  _focus.at = Date.now();
  return getFocus();
}

function markFocusUrged() {
  if (!_focus) return null;
  _focus.status = "urged";
  _focus.at = Date.now();
  return getFocus();
}

/**
 * 短追问粘合：武装后短句且落在 glue 窗内 → 拼到上一 Focus
 * @returns {string|null} 粘合后的完整问句；不粘合返回 null
 */
function maybeGlueFollowOn(text) {
  const cfg = loadFocusCfg();
  if (cfg.enabled === false || !_focus?.query) return null;
  const t = String(text || "").trim();
  if (!t) return null;
  if (isUrge(t) || isRecall(t)) return null;
  const maxChars = cfg.shortFollowMaxChars || 12;
  if ([...t].length > maxChars) return null;
  const age = Date.now() - (_focus.at || 0);
  if (age > (cfg.focusGlueMs || 8000)) return null;
  // 已是完整问句则不粘
  if (/[？?]/.test(t) && [...t].length > 6) return null;
  return `${_focus.query} ${t}`.trim();
}

function honestNoFocus() {
  return loadFocusCfg().honestNoFocus || "这轮还没有记下具体问题。";
}

module.exports = {
  loadFocusCfg,
  resetFocusCache,
  clearFocus,
  getFocus,
  commitFocusAsk,
  markFocusAnswered,
  markFocusUrged,
  maybeGlueFollowOn,
  isUrge,
  isRecall,
  honestNoFocus
};
