/**
 * Quick Jot：会中短记，供会后扩写 / MCP 读取。
 */
const fs = require("fs");
const path = require("path");

function jotDir() {
  return path.join(__dirname, "..", "..", "dev_knowledge", "session_logs");
}

function jotPath(meetingId) {
  const id = String(meetingId || "live").replace(/[^\w\-]+/g, "_");
  return path.join(jotDir(), `jots_${id}.jsonl`);
}

function bridgePath() {
  return path.join(jotDir(), "meeting_bridge.json");
}

function ensureDir() {
  fs.mkdirSync(jotDir(), { recursive: true });
}

function appendJot(text, opts = {}) {
  const body = String(text || "").trim();
  if (!body) return { ok: false, error: "empty" };
  ensureDir();
  const entry = {
    ts: Date.now(),
    text: body.slice(0, 500),
    meetingId: opts.meetingId || "live",
    source: opts.source || "ui"
  };
  fs.appendFileSync(jotPath(entry.meetingId), JSON.stringify(entry) + "\n", "utf8");
  refreshBridge({ lastJot: entry });
  return { ok: true, entry };
}

function listJots(meetingId = "live", limit = 50) {
  const file = jotPath(meetingId);
  if (!fs.existsSync(file)) return [];
  try {
    return fs
      .readFileSync(file, "utf8")
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
      .filter(Boolean)
      .slice(-(Number(limit) || 50));
  } catch (_) {
    return [];
  }
}

/**
 * 结合转写窗口把短记扩成纪要草稿（模板，不强制调 LLM）。
 */
function expandJots(meetingId, transcript = "") {
  const jots = listJots(meetingId, 40);
  const lines = String(transcript || "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(-40);
  const md = [
    `# 会议速记扩写草稿`,
    ``,
    `> 由 Quick Jot + 近窗转写生成；请人工校对后写入 ADR / FAQ。`,
    ``,
    `## Quick Jots`,
    ...(jots.length
      ? jots.map((j) => `- (${new Date(j.ts).toISOString()}) ${j.text}`)
      : ["- （无速记）"]),
    ``,
    `## 近窗转写摘录`,
    ...(lines.length ? lines.map((l) => `- ${l}`) : ["- （无转写）"]),
    ``,
    `## 建议沉淀`,
    `- [ ] 更新 \`dev_knowledge/adr/\`（若有架构决策）`,
    `- [ ] 更新 \`knowledge/faq-meeting.txt\`（若有业务口径）`,
    `- [ ] 追加 \`session_logs/dev_sessions.jsonl\``
  ].join("\n");
  return { ok: true, markdown: md, jotCount: jots.length, lineCount: lines.length };
}

function refreshBridge(extra = {}) {
  ensureDir();
  let prev = {};
  try {
    if (fs.existsSync(bridgePath())) {
      prev = JSON.parse(fs.readFileSync(bridgePath(), "utf8"));
    }
  } catch (_) {}
  const next = {
    ...prev,
    updatedAt: Date.now(),
    ...extra
  };
  fs.writeFileSync(bridgePath(), JSON.stringify(next, null, 2), "utf8");
  return next;
}

function readBridge() {
  try {
    if (!fs.existsSync(bridgePath())) return {};
    return JSON.parse(fs.readFileSync(bridgePath(), "utf8"));
  } catch (_) {
    return {};
  }
}

module.exports = {
  appendJot,
  listJots,
  expandJots,
  refreshBridge,
  readBridge,
  jotPath,
  bridgePath
};
