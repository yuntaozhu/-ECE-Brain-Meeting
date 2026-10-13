/**
 * 本场会话记录：sessions/{meetingId}.jsonl + summary.md
 */
const fs = require("fs");
const path = require("path");
const { debugLog } = require("../platform/debugLog.cjs");
const { knowledgeWriteRoot } = require("../platform/appPaths.cjs");

function sessionsDir() {
  return path.join(knowledgeWriteRoot(), "sessions");
}
function inboxDir() {
  return path.join(knowledgeWriteRoot(), "inbox");
}

function ensureDirs() {
  for (const d of [sessionsDir(), inboxDir()]) {
    try {
      fs.mkdirSync(d, { recursive: true });
    } catch (_) {}
  }
}

function sessionPath(meetingId) {
  ensureDirs();
  const id = String(meetingId || "unknown").replace(/[^\w\-]+/g, "_");
  return path.join(sessionsDir(), `${id}.jsonl`);
}

function summaryPath(meetingId) {
  ensureDirs();
  const id = String(meetingId || "unknown").replace(/[^\w\-]+/g, "_");
  return path.join(sessionsDir(), `${id}-summary.md`);
}

function appendSession(meetingId, entry) {
  if (!meetingId) return { ok: false };
  const text = String(entry?.text || "").trim();
  if (!text) return { ok: false };
  ensureDirs();
  const line = JSON.stringify({
    ts: entry.ts || Date.now(),
    speaker: entry.speaker || "会场",
    text: text.slice(0, 2000),
    mode: entry.mode || "",
    segmentId: entry.segmentId || ""
  });
  try {
    fs.appendFileSync(sessionPath(meetingId), line + "\n", "utf8");
    return { ok: true };
  } catch (err) {
    debugLog.warn("Session", "append failed", { error: String(err?.message || err) });
    return { ok: false, error: String(err?.message || err) };
  }
}

function readSession(meetingId, opts = {}) {
  const file = sessionPath(meetingId);
  if (!fs.existsSync(file)) return [];
  try {
    const raw = fs.readFileSync(file, "utf8");
    let rows = raw
      .split(/\n+/)
      .map((l) => l.trim())
      .filter(Boolean)
      .map((l) => {
        try {
          return JSON.parse(l);
        } catch {
          return null;
        }
      })
      .filter(Boolean);
    if (opts.segmentId) rows = rows.filter((r) => r.segmentId === opts.segmentId);
    if (opts.limit) rows = rows.slice(-opts.limit);
    return rows;
  } catch (err) {
    return [];
  }
}

function formatSessionForPrompt(rows, maxChars = 2400) {
  let out = (rows || []).map((r) => `${r.speaker}: ${r.text}`).join("\n");
  if (out.length > maxChars) out = out.slice(-maxChars);
  return out;
}

function writeSummary(meetingId, markdown) {
  ensureDirs();
  try {
    fs.writeFileSync(summaryPath(meetingId), String(markdown || ""), "utf8");
    return { ok: true, file: summaryPath(meetingId) };
  } catch (err) {
    return { ok: false, error: String(err?.message || err) };
  }
}

function writeFaqCandidate(meetingId, text) {
  ensureDirs();
  const id = String(meetingId || "unknown").replace(/[^\w\-]+/g, "_");
  const file = path.join(inboxDir(), `faq-candidates-${id}.txt`);
  try {
    fs.appendFileSync(file, String(text || "") + "\n\n---\n\n", "utf8");
    return { ok: true, file };
  } catch (err) {
    return { ok: false, error: String(err?.message || err) };
  }
}

function openSessionsDir() {
  ensureDirs();
  return sessionsDir();
}

module.exports = {
  sessionsDir,
  /** 兼容 promote-session 等旧解构名 */
  get SESSIONS_DIR() {
    return sessionsDir();
  },
  inboxDir,
  appendSession,
  readSession,
  formatSessionForPrompt,
  writeSummary,
  writeFaqCandidate,
  openSessionsDir,
  sessionPath,
  summaryPath,
  ensureDirs
};
