const fs = require("fs");
const { schemaFile } = require("../knowledge/paths.cjs");

let boundary = null;

function loadBoundary() {
  if (boundary) return boundary;
  boundary = JSON.parse(fs.readFileSync(schemaFile("boundary.json"), "utf8"));
  return boundary;
}

function checkRefuse(query) {
  const b = loadBoundary();
  const q = String(query || "");
  for (const p of b.refusePatterns || []) {
    if (q.includes(p)) {
      return {
        refuse: true,
        reason: "boundary_refuse",
        reply: b.refuseReply
      };
    }
  }
  return { refuse: false };
}

module.exports = { loadBoundary, checkRefuse };
