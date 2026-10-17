/**
 * 决策记录。与转写 sessions/*.jsonl 分开。
 * 只追加 winnerBucket，会中不写 engine-hyperparams.json。
 */
const fs = require("fs");
const path = require("path");
const { knowledgeWriteRoot } = require("../platform/appPaths.cjs");

function decisionsDir() {
  return path.join(knowledgeWriteRoot(), "decisions");
}

function decisionPath(meetingId) {
  const id = String(meetingId || "").replace(/[^\w\-]+/g, "_");
  if (!id) return "";
  return path.join(decisionsDir(), `${id}.jsonl`);
}

function appendDecision(meetingId, entry) {
  const file = decisionPath(meetingId);
  if (!file || !entry) return { ok: false };
  try {
    fs.mkdirSync(decisionsDir(), { recursive: true });
    const line = JSON.stringify({
      ts: Date.now(),
      winnerBucket: entry.winnerBucket || "",
      intent: entry.intent || "",
      doubaoConfidence: entry.doubaoConfidence == null ? null : entry.doubaoConfidence,
      action: entry.action || "",
      winnerId: entry.winnerId || "",
      reason: entry.reason || ""
    });
    fs.appendFileSync(file, line + "\n", "utf8");
    return { ok: true, file };
  } catch (_) {
    return { ok: false };
  }
}

module.exports = { appendDecision, decisionPath, decisionsDir };
