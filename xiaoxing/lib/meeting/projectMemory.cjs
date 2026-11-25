/**
 * 跨会主题记忆：sessions/index.json + 开场前情卡
 */
"use strict";

const fs = require("fs");
const path = require("path");
const { sessionsDir, schemaFile, ensureDir } = require("../knowledge/paths.cjs");

let _cfg;

function loadProjectMemoryCfg() {
  if (_cfg) return _cfg;
  try {
    _cfg = JSON.parse(fs.readFileSync(schemaFile("project-memory.json"), "utf8"));
  } catch (_) {
    _cfg = { defaultTopic: "通用", topics: [], maxMeetingsInIndex: 80 };
  }
  return _cfg;
}

function clearProjectMemoryCfgCache() {
  _cfg = null;
}

function indexPath() {
  return path.join(sessionsDir(), "index.json");
}

function readIndex() {
  const p = indexPath();
  if (!fs.existsSync(p)) return { updatedAt: null, meetings: [] };
  try {
    return JSON.parse(fs.readFileSync(p, "utf8"));
  } catch (_) {
    return { updatedAt: null, meetings: [] };
  }
}

function writeIndex(idx) {
  ensureDir(sessionsDir());
  const cfg = loadProjectMemoryCfg();
  const max = Number(cfg.maxMeetingsInIndex) || 80;
  const meetings = (idx.meetings || [])
    .sort((a, b) => String(b.endedAt || b.startedAt || "").localeCompare(String(a.endedAt || a.startedAt || "")))
    .slice(0, max);
  const out = { updatedAt: new Date().toISOString(), meetings };
  fs.writeFileSync(indexPath(), JSON.stringify(out, null, 2), "utf8");
  return out;
}

function inferTopics(texts = []) {
  const cfg = loadProjectMemoryCfg();
  const blob = texts.map((t) => String(t || "")).join("\n");
  const hit = [];
  for (const t of cfg.topics || []) {
    const kws = t.keywords || [];
    if (kws.some((k) => k && blob.includes(k))) hit.push(t.id);
  }
  if (!hit.length) hit.push(cfg.defaultTopic || "通用");
  return [...new Set(hit)];
}

/**
 * 会后写入索引
 * @param {{ id: string, startedAt?: string, file?: string }} meeting
 * @param {{ summaryPath?: string, gaps?: Array, ingestTasks?: Array, others?: number, me?: number, headlineHints?: string[] }} meta
 */
function registerMeeting(meeting, meta = {}) {
  if (!meeting?.id) return { ok: false, reason: "no_id" };
  const gapQs = (meta.gaps || [])
    .map((g) => (typeof g === "string" ? g : g.query || ""))
    .filter(Boolean)
    .slice(0, 12);
  const todos = [];
  for (const c of meta.ingestTasks || []) {
    const title = c.followup?.title || c.ingest?.query || "";
    if (title) todos.push(String(title).slice(0, 80));
  }
  for (const q of gapQs.slice(0, 6)) {
    if (!todos.some((t) => t.includes(q.slice(0, 8)))) todos.push(`跟进：${q}`.slice(0, 80));
  }

  const hints = [
    ...(meta.headlineHints || []),
    ...gapQs,
    ...todos,
    meeting.id
  ];
  const topics = inferTopics(hints);
  const headline =
    gapQs[0] ||
    todos[0] ||
    (meta.others || meta.me ? `会场${meta.others || 0}句 / 我${meta.me || 0}句` : "（无焦点摘要）");

  const entry = {
    id: meeting.id,
    startedAt: meeting.startedAt || null,
    endedAt: new Date().toISOString(),
    topics,
    headline: String(headline).slice(0, 120),
    todos: todos.slice(0, 10),
    gaps: gapQs.slice(0, 10),
    summaryPath: meta.summaryPath || null,
    file: meeting.file || null
  };

  const idx = readIndex();
  idx.meetings = (idx.meetings || []).filter((m) => m.id !== entry.id);
  idx.meetings.unshift(entry);
  writeIndex(idx);
  return { ok: true, entry, topics };
}

function listMeetingsByTopic(topic, limit = 10) {
  const cfg = loadProjectMemoryCfg();
  const t = String(topic || cfg.defaultTopic || "通用").trim();
  const all = readIndex().meetings || [];
  const filtered =
    !t || t === "全部"
      ? all
      : all.filter((m) => (m.topics || []).includes(t) || (t === cfg.defaultTopic && !(m.topics || []).length));
  return filtered.slice(0, limit);
}

function latestMeeting(topic) {
  const list = listMeetingsByTopic(topic, 1);
  return list[0] || null;
}

/**
 * 开场前情卡
 */
function buildBriefing(opts = {}) {
  const cfg = loadProjectMemoryCfg();
  const topic = opts.topic || null;
  const prev = topic ? latestMeeting(topic) : (readIndex().meetings || [])[0] || null;
  if (!prev) {
    return {
      ok: true,
      empty: true,
      text: "这是本机记录的首次听会，暂无跨会前情。",
      card: null,
      assistantMode: opts.assistantMode || cfg.defaultAssistantMode || "content"
    };
  }
  const maxTodo = Number(cfg.briefingMaxTodos) || 5;
  const maxGap = Number(cfg.briefingMaxGaps) || 4;
  const todos = (prev.todos || []).slice(0, maxTodo);
  const gaps = (prev.gaps || []).slice(0, maxGap);
  const topicBit = (prev.topics || []).join("、") || cfg.defaultTopic;
  const lines = [
    `上次会议 ${prev.id}（主题：${topicBit}）`,
    `焦点：${prev.headline || "（无）"}`
  ];
  if (todos.length) {
    lines.push("待办：");
    todos.forEach((t, i) => lines.push(`  ${i + 1}. ${t}`));
  }
  if (gaps.length && gaps.some((g) => !todos.some((t) => t.includes(String(g).slice(0, 6))))) {
    lines.push("缺口：");
    gaps.slice(0, 3).forEach((g, i) => lines.push(`  ${i + 1}. ${g}`));
  }
  const text = lines.join("\n");
  return {
    ok: true,
    empty: false,
    text,
    card: {
      previousMeetingId: prev.id,
      topics: prev.topics || [],
      headline: prev.headline,
      todos,
      gaps,
      summaryPath: prev.summaryPath
    },
    assistantMode: opts.assistantMode || cfg.defaultAssistantMode || "content"
  };
}

function getAssistantMode() {
  const cfg = loadProjectMemoryCfg();
  try {
    const cmds = JSON.parse(fs.readFileSync(schemaFile("meeting-commands.json"), "utf8"));
    if (cmds.assistantMode === "host" || cmds.assistantMode === "content") return cmds.assistantMode;
  } catch (_) {}
  return cfg.defaultAssistantMode || "content";
}

module.exports = {
  loadProjectMemoryCfg,
  clearProjectMemoryCfgCache,
  indexPath,
  readIndex,
  writeIndex,
  inferTopics,
  registerMeeting,
  listMeetingsByTopic,
  latestMeeting,
  buildBriefing,
  getAssistantMode
};
