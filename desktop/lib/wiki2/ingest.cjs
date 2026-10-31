"use strict";

const fs = require("fs");
const path = require("path");
const { ensureWiki2Dirs, episodesDir } = require("./paths.cjs");
const { normalizeSlug } = require("./parsePage.cjs");

/**
 * 规则版 Contextual Ingest（不强制 LLM）：生成 episode 文件 + 候选 claims。
 * @param {{ transcript: string, episodeId?: string, agenda?: string, participants?: string[] }} input
 * @param {{ dry?: boolean }} [opts]
 */
function ingestEpisode(input, opts = {}) {
  ensureWiki2Dirs();
  const transcript = String(input?.transcript || "").trim();
  if (!transcript) return { ok: false, error: "empty_transcript" };

  const episodeId =
    String(input.episodeId || "").trim() ||
    `ep_${new Date().toISOString().slice(0, 10).replace(/-/g, "")}_${Date.now().toString(36)}`;
  const agenda = String(input.agenda || "").trim();
  const participants = Array.isArray(input.participants) ? input.participants : [];

  const lines = transcript
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const contextual_chunks = lines.slice(0, 40).map((line, i) => {
    const m = line.match(/^([^:]{1,20})[:：]\s*(.+)$/);
    const speaker = m ? m[1] : "会场";
    const raw_text = m ? m[2] : line;
    const context_prefix = [
      agenda ? `议题:${agenda}` : "议题:未标",
      `片段#${i + 1}`,
      /它|这|那|这块|那边/.test(raw_text)
        ? "含代词，检索时需结合议题与前后句"
        : "陈述句"
    ].join(" | ");
    return {
      turn_range: `turn-${i + 1}`,
      speaker,
      context_prefix: `[${context_prefix}]`,
      raw_text,
      linked_entities: guessEntities(raw_text)
    };
  });

  const extracted_claims = extractClaimCandidates(lines, episodeId);

  const md = [
    `---`,
    `episode_id: ${episodeId}`,
    `timestamp: ${new Date().toISOString()}`,
    `agenda: ${JSON.stringify(agenda)}`,
    `participants: ${JSON.stringify(participants)}`,
    `---`,
    ``,
    `# Episode ${episodeId}`,
    ``,
    ...contextual_chunks.map(
      (c) =>
        `## ${c.turn_range}\n` +
        `- speaker: ${c.speaker}\n` +
        `- context_prefix: ${c.context_prefix}\n` +
        `- text: ${c.raw_text}\n`
    ),
    ``,
    `## Extracted Claim Candidates`,
    ...extracted_claims.map(
      (c) =>
        `- (${c.claim_type}) → ${c.target_wiki_page}: ${c.statement}`
    )
  ].join("\n");

  const file = path.join(episodesDir(), `${episodeId}.md`);
  if (!opts.dry) {
    fs.writeFileSync(file, md, "utf8");
  }

  return {
    ok: true,
    dry: Boolean(opts.dry),
    episode_id: episodeId,
    path: opts.dry ? null : file,
    contextual_chunks,
    extracted_claims,
    chunk_count: contextual_chunks.length,
    claim_count: extracted_claims.length
  };
}

function guessEntities(text) {
  const out = [];
  if (/双通道|Me|Others|CABLE|内录/i.test(text)) out.push("[[dec_audio_dual_track]]");
  if (/VAD|静音|Silero/i.test(text)) out.push("[[dec_vad_gate]]");
  if (/Whisper|本地.?ASR|HOST_ASR/i.test(text)) out.push("[[ent_whisper_local]]");
  if (/副驾驶|decideSpeak|Push-to-Ask|smart-replies/i.test(text)) out.push("[[dec_copilot_bypass]]");
  return out;
}

function extractClaimCandidates(lines, episodeId) {
  const claims = [];
  const decisionRe =
    /(决定|定下来|采用|改用|禁止|不要|改为|落地|拍板|弃用|淘汰).{0,40}/;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const text = line.replace(/^[^:]{1,20}[:：]\s*/, "");
    if (!decisionRe.test(text) && text.length < 12) continue;
    if (!decisionRe.test(text) && !/架构|方案|红线|必须|严禁/.test(text)) continue;

    let target = "wiki/decisions/copilot-bypass.md";
    let claim_type = "NOTE";
    if (/双通道|混轨|CABLE|内录|Me|Others/i.test(text)) {
      target = "wiki/decisions/audio-dual-track.md";
      claim_type = "DECISION_UPDATE";
    } else if (/VAD|静音|Silero|切窗|3\s*秒/i.test(text)) {
      target = "wiki/decisions/vad-gate.md";
      claim_type = /弃用|不要|禁止|淘汰|改用/.test(text)
        ? "DECISION_UPDATE"
        : "FACT";
    } else if (/Whisper|native|addon/i.test(text)) {
      target = "wiki/entities/whisper-local.md";
      claim_type = "FACT";
    } else if (/副驾驶|decideSpeak|旁路/i.test(text)) {
      target = "wiki/decisions/copilot-bypass.md";
      claim_type = "DECISION_UPDATE";
    }

    claims.push({
      target_wiki_page: target,
      claim_type,
      statement: text.slice(0, 180),
      replaces_or_contradicts_topic: /弃用|不要|禁止|淘汰|改用|取代/.test(text)
        ? text.slice(0, 40)
        : null,
      reason_for_change: null,
      valid_from: new Date().toISOString(),
      confidence: 0.7,
      source_citation: `[[raw/episodes/${episodeId}#turn-${i + 1}]]`
    });
  }
  return claims.slice(0, 12);
}

module.exports = {
  ingestEpisode,
  extractClaimCandidates,
  guessEntities,
  normalizeSlug
};
