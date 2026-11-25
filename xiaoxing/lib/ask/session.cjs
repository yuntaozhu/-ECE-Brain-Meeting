const fs = require("fs");
const path = require("path");
const { sessionsDir, ensureDir } = require("../knowledge/paths.cjs");

function appendSession(turn) {
  ensureDir(sessionsDir());
  const day = new Date().toISOString().slice(0, 10);
  const file = path.join(sessionsDir(), `session_${day}.jsonl`);
  const line = JSON.stringify({
    at: new Date().toISOString(),
    ...turn
  });
  fs.appendFileSync(file, line + "\n", "utf8");
  return file;
}

module.exports = { appendSession };
