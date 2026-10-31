"use strict";

const { wiki2EvidenceFacts, retrieveWiki2 } = require("./retrieve.cjs");

/**
 * 统一 Evidence 包：供 prefetch / suggest / Catch Me Up 使用。
 */
function buildWiki2Evidence(query, opts = {}) {
  const pack = wiki2EvidenceFacts(query, opts);
  return {
    source: "wiki2",
    query: String(query || "").slice(0, 120),
    facts: pack.facts,
    superseded: pack.superseded,
    preview: pack.preview,
    hits: pack.hits,
    ms: pack.ms
  };
}

function formatEvidenceForPrompt(evidence) {
  if (!evidence?.facts?.length && !evidence?.preview) return "";
  const lines = ["[Wiki Knowledge Evidence]"];
  for (const f of evidence.facts || []) lines.push(`- ${f}`);
  return lines.join("\n").slice(0, 1200);
}

module.exports = {
  buildWiki2Evidence,
  formatEvidenceForPrompt,
  retrieveWiki2,
  wiki2EvidenceFacts
};
