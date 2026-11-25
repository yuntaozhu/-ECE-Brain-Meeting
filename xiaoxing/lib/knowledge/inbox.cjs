const fs = require("fs");
const path = require("path");
const { inboxDir, ensureDir } = require("./paths.cjs");

const STATUSES = ["pending", "reviewing", "ready", "done"];

function writeInbox(item) {
  ensureDir(inboxDir());
  const ts = Date.now();
  const id = `gap_${ts}`;
  const file = path.join(inboxDir(), `${id}.json`);
  const payload = {
    id,
    at: new Date(ts).toISOString(),
    status: "pending",
    query: item.query || "",
    reason: item.reason || "unknown",
    reply: item.reply || "",
    meta: item.meta || {}
  };
  fs.writeFileSync(file, JSON.stringify(payload, null, 2), "utf8");
  return file;
}

function listInboxFiles() {
  ensureDir(inboxDir());
  return fs
    .readdirSync(inboxDir())
    .filter((f) => f.endsWith(".json") && !f.endsWith(".promoted.json"))
    .map((f) => path.join(inboxDir(), f));
}

function listInbox() {
  return listInboxFiles();
}

function readItem(file) {
  const raw = JSON.parse(fs.readFileSync(file, "utf8"));
  const base = path.basename(file, ".json");
  return {
    ...raw,
    id: raw.id || base,
    status: STATUSES.includes(raw.status) ? raw.status : "pending",
    file
  };
}

function listInboxItems() {
  return listInboxFiles()
    .map(readItem)
    .sort((a, b) => String(b.at).localeCompare(String(a.at)));
}

function boardColumns() {
  const cols = {
    pending: [],
    reviewing: [],
    ready: [],
    done: []
  };
  for (const item of listInboxItems()) {
    (cols[item.status] || cols.pending).push(item);
  }
  return cols;
}

function setInboxStatus(id, status) {
  if (!STATUSES.includes(status)) throw new Error(`invalid status: ${status}`);
  const item = listInboxItems().find((x) => x.id === id);
  if (!item) throw new Error(`inbox not found: ${id}`);
  const next = { ...item };
  delete next.file;
  next.status = status;
  next.updatedAt = new Date().toISOString();
  fs.writeFileSync(item.file, JSON.stringify(next, null, 2), "utf8");
  return next;
}

module.exports = {
  STATUSES,
  writeInbox,
  listInbox,
  listInboxItems,
  boardColumns,
  setInboxStatus
};
