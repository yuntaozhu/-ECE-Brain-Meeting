"use strict";

/**
 * 会后：sessions jsonl → wiki2 ingest（规则/LLM auto）→ 可选 reconcile。
 */
const { readSession, formatSessionForPrompt, sessionsDir } = require("../runtime");
const { ingestEpisodeAuto } = require("./compileLlm.cjs");
const { ingestEpisode } = require("./ingest.cjs");
const { reconcileClaims } = require("./reconcile.cjs");
const { synthesizeThemes } = require("./themes.cjs");
const fs = require("fs");
const path = require("path");

function latestMeetingId() {
  try {
    const dir = sessionsDir();
    if (!fs.existsSync(dir)) return null;
    const files = fs
      .readdirSync(dir)
      .filter((f) => f.endsWith(".jsonl") && !f.includes("-summary"))
      .map((f) => ({
        id: f.replace(/\.jsonl$/, ""),
        mtime: fs.statSync(path.join(dir, f)).mtimeMs
      }))
      .sort((a, b) => b.mtime - a.mtime);
    return files[0]?.id || null;
  } catch (_) {
    return null;
  }
}

/**
 * @param {{ meetingId?: string, apply?: boolean, llm?: boolean, agenda?: string }} [opts]
 */
async function promoteSessionToWiki2(opts = {}) {
  const meetingId = opts.meetingId || latestMeetingId();
  if (!meetingId) return { ok: false, error: "no_session" };
  const rows = readSession(meetingId, { limit: 80 });
  if (!rows.length) return { ok: false, error: "empty_session", meetingId };
  const transcript = formatSessionForPrompt(rows, 5000);
  const input = {
    transcript,
    agenda: opts.agenda || `session:${meetingId}`,
    episodeId: `sess_${String(meetingId).replace(/[^\w\-]+/g, "_").slice(0, 40)}`
  };

  let ingested;
  if (opts.llm === false) {
    ingested = { ...ingestEpisode(input, { dry: false }), mode: "rule", llm: false };
  } else {
    ingested = await ingestEpisodeAuto(input, {
      dry: false,
      forceLlm: opts.llm === true
    });
  }

  let reconcile = null;
  if (opts.apply && ingested.extracted_claims?.length) {
    reconcile = reconcileClaims(ingested.extracted_claims, { dry: false });
  } else {
    reconcile = reconcileClaims(ingested.extracted_claims || [], { dry: true });
  }

  let themes = null;
  if (opts.apply || opts.themes) {
    themes = synthesizeThemes({ dry: !opts.apply && !opts.themesWrite });
  }

  return {
    ok: Boolean(ingested.ok),
    meetingId,
    ingested,
    reconcile,
    themes
  };
}

module.exports = {
  promoteSessionToWiki2,
  latestMeetingId
};
