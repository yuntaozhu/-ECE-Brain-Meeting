"use strict";

/**
 * 农服跟进看板（Kaiban 列语义轻量落地，不依赖 KaibanJS 包）
 * 列：todo → doing → review → done
 */
const fs = require("fs");
const path = require("path");
const { followupsDir, schemaFile, ensureDir } = require("../knowledge/paths.cjs");

const DEFAULT = {
  enabled: true,
  columns: ["todo", "doing", "review", "done"],
  labels: { todo: "待办", doing: "进行中", review: "待验收", done: "完成" },
  kindLabels: {
    meeting_gap: "会场缺口",
    manual: "手建",
    wechat_fragment: "微信碎片",
    market_watch: "跨市价差",
    b2b_spread: "地头价差",
    ingest_task: "补库任务"
  },
  autoFromMeetingGaps: true
};

let _cfg = null;

function loadCfg() {
  if (_cfg) return _cfg;
  try {
    _cfg = { ...DEFAULT, ...JSON.parse(fs.readFileSync(schemaFile("followup-board.json"), "utf8")) };
  } catch (_) {
    _cfg = { ...DEFAULT };
  }
  return _cfg;
}

function resetFollowupCache() {
  _cfg = null;
}

function columns() {
  return loadCfg().columns || DEFAULT.columns;
}

function labels() {
  return { ...DEFAULT.labels, ...(loadCfg().labels || {}) };
}

function kindLabels() {
  return { ...DEFAULT.kindLabels, ...(loadCfg().kindLabels || {}) };
}

function kindLabel(kind) {
  const map = kindLabels();
  return map[kind] || kind || "跟进";
}

function listFiles() {
  ensureDir(followupsDir());
  return fs
    .readdirSync(followupsDir())
    .filter((f) => f.endsWith(".json"))
    .map((f) => path.join(followupsDir(), f));
}

function readTask(file) {
  const raw = JSON.parse(fs.readFileSync(file, "utf8"));
  const cols = columns();
  const status = cols.includes(raw.status) ? raw.status : "todo";
  return {
    ...raw,
    id: raw.id || path.basename(file, ".json"),
    status,
    file
  };
}

function listTasks() {
  return listFiles()
    .map(readTask)
    .sort((a, b) => String(b.at || "").localeCompare(String(a.at || "")));
}

function boardColumns() {
  const cols = {};
  for (const c of columns()) cols[c] = [];
  for (const t of listTasks()) {
    (cols[t.status] || cols.todo).push({
      ...t,
      kind_label: kindLabel(t.kind)
    });
  }
  return { columns: cols, labels: labels(), kindLabels: kindLabels() };
}

function createTask(input = {}) {
  ensureDir(followupsDir());
  const ts = Date.now();
  const id = `fu_${ts}`;
  const title = String(input.title || input.query || "").trim();
  if (!title) throw new Error("missing title");
  const task = {
    id,
    at: new Date(ts).toISOString(),
    status: columns().includes(input.status) ? input.status : "todo",
    title,
    kind: input.kind || "manual",
    note: input.note || "",
    meetingId: input.meetingId || null,
    sourceQuery: input.sourceQuery || title,
    meta: input.meta || {}
  };
  const file = path.join(followupsDir(), `${id}.json`);
  fs.writeFileSync(file, JSON.stringify(task, null, 2), "utf8");
  return { ...task, file };
}

function setTaskStatus(id, status) {
  const cols = columns();
  if (!cols.includes(status)) throw new Error(`invalid status: ${status}`);
  const task = listTasks().find((t) => t.id === id);
  if (!task) throw new Error(`followup not found: ${id}`);
  const next = { ...task };
  delete next.file;
  next.status = status;
  next.updatedAt = new Date().toISOString();
  fs.writeFileSync(task.file, JSON.stringify(next, null, 2), "utf8");
  return next;
}

/**
 * 会场未答/缺口 → 跟进待办（去重：同 meetingId + 同 title 不重复）
 */
function ingestMeetingGaps(meeting, gaps = []) {
  const cfg = loadCfg();
  if (cfg.enabled === false || cfg.autoFromMeetingGaps === false) {
    return { ok: true, created: [] };
  }
  const meetingId = meeting?.id || null;
  const existing = listTasks().filter((t) => t.meetingId === meetingId);
  const created = [];
  for (const g of gaps) {
    const title = String(g.query || "").trim();
    if (title.length < 4) continue;
    const dup = existing.some(
      (t) => t.title === title || t.sourceQuery === title
    );
    if (dup) continue;
    const task = createTask({
      title: `跟进：${title}`.slice(0, 80),
      kind: "meeting_gap",
      meetingId,
      sourceQuery: title,
      note: g.layer || "others_unanswered",
      meta: { layer: g.layer || null }
    });
    created.push(task);
    existing.push(task);
  }
  return { ok: true, created };
}

module.exports = {
  loadCfg,
  resetFollowupCache,
  columns,
  labels,
  kindLabels,
  kindLabel,
  listTasks,
  boardColumns,
  createTask,
  setTaskStatus,
  ingestMeetingGaps
};
