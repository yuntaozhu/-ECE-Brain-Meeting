/**
 * SpeakDraft 写回：供 Host / 副驾驶同源（Phase 4 消费）。
 */
const { GATES, validateIntelligenceResult } = require("./contract.cjs");

function draftFpOf(text) {
  const s = String(text || "");
  let h = 2166136261;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16);
}

/**
 * @param {{ text?: string, arkMode?: string, evidenceIds?: string[], title?: string }} parts
 */
function makeSpeakDraft(parts = {}) {
  const text = String(parts.text || "").trim();
  if (!text) return null;
  return {
    text,
    arkMode: String(parts.arkMode || ""),
    evidenceIds: Array.isArray(parts.evidenceIds) ? parts.evidenceIds.filter(Boolean) : [],
    draftFp: draftFpOf(text),
    title: String(parts.title || "")
  };
}

/**
 * @param {object|null|undefined} state
 * @param {import("./contract.cjs").IntelligenceResult} result
 */
function writeLastIntelligence(state, result) {
  if (!state || !result) return;
  const err = validateIntelligenceResult(result);
  if (err) return;
  state.lastIntelligence = result;
  if (result.draft) state.lastSpeakDraft = result.draft;
  else if (result.gate === GATES.AGENT || result.gate === GATES.SKIP) {
    state.lastSpeakDraft = null;
  }
}

/**
 * 定卡成功时的便捷写回。
 */
function commitDraft(state, { text, arkMode, title, card, sticky } = {}) {
  const draft = makeSpeakDraft({ text, arkMode, title });
  writeLastIntelligence(state, {
    gate: GATES.COMMITTED,
    card: card || (title ? { title, speak: text } : null),
    draft,
    sticky: sticky || undefined,
    debug: { releasedToAgent: false }
  });
  return draft;
}

/**
 * 放行 Agent 时的写回（不定卡）。
 */
function releaseDraft(state, { why, card } = {}) {
  writeLastIntelligence(state, {
    gate: GATES.AGENT,
    card: card || null,
    draft: null,
    debug: { releasedToAgent: true, reason: String(why || "") }
  });
}

module.exports = {
  draftFpOf,
  makeSpeakDraft,
  writeLastIntelligence,
  commitDraft,
  releaseDraft,
  GATES
};
