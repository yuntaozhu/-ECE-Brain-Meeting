"use strict";

const fs = require("fs");
const { schemaFile } = require("../knowledge/paths.cjs");

let _cache = null;

function loadCommands() {
  if (_cache) return _cache;
  try {
    _cache = JSON.parse(fs.readFileSync(schemaFile("meeting-commands.json"), "utf8"));
  } catch (_) {
    _cache = {
      wakePatterns: ["小星你好"],
      wakeAliases: ["小星"],
      sleepPatterns: ["谢谢小星"],
      meetingStartPatterns: ["开始听会"],
      meetingStopPatterns: ["结束会议"],
      identityFallback: "你是谁",
      halfDuplex: { ignoreConsultWhileSpeaking: true, keepListeningTranscript: true }
    };
  }
  return _cache;
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

function stripWake(text) {
  const cfg = loadCommands();
  let t = String(text || "").trim();
  for (const a of cfg.wakeAliases || []) {
    const re = new RegExp(`^(${a})[，,。！!？?\\s]*`, "u");
    t = t.replace(re, "").trim();
  }
  return t;
}

/**
 * @returns {{ kind: 'wake'|'sleep'|'meeting_start'|'meeting_stop'|'urge'|'recall'|'ask'|'ignore', body: string }}
 */
function classifyUtterance(text) {
  const raw = String(text || "").trim();
  if (!raw) return { kind: "ignore", body: "" };
  const cfg = loadCommands();
  if (includesAny(raw, cfg.meetingStartPatterns)) return { kind: "meeting_start", body: raw };
  if (includesAny(raw, cfg.meetingStopPatterns)) return { kind: "meeting_stop", body: raw };
  if (includesAny(raw, cfg.sleepPatterns)) return { kind: "sleep", body: raw };
  if (includesAny(raw, cfg.recallPatterns)) return { kind: "recall", body: raw };
  if (includesAny(raw, cfg.urgePatterns)) return { kind: "urge", body: raw };
  if (includesAny(raw, cfg.wakePatterns)) {
    const body = stripWake(raw) || cfg.identityFallback || "你是谁";
    return { kind: "wake", body };
  }
  // 句首带别名也视为唤醒提问
  const aliasHit = (cfg.wakeAliases || []).some((a) => normalize(raw).startsWith(normalize(a)));
  if (aliasHit) {
    const body = stripWake(raw);
    if (body) return { kind: "wake", body };
    return { kind: "wake", body: cfg.identityFallback || "你是谁" };
  }
  return { kind: "ask", body: raw };
}

function resetCommandsCache() {
  _cache = null;
}

module.exports = {
  loadCommands,
  classifyUtterance,
  stripWake,
  resetCommandsCache
};
