/**
 * Wave R / 方案 C：智能层输出契约（Phase 0 草图）。
 * Phase 4 落地 evaluate()；本文件只定义枚举与形状校验，不做策略。
 */

const GATES = Object.freeze({
  COMMITTED: "committed",
  AGENT: "agent",
  CLARIFY: "clarify",
  SKIP: "skip"
});

/**
 * @typedef {object} SpeakDraft
 * @property {string} text
 * @property {string} [arkMode]
 * @property {string[]} [evidenceIds]
 * @property {string} [draftFp]
 */

/**
 * @typedef {object} IntelligenceResult
 * @property {string} [turnId]
 * @property {string} [questionFp]
 * @property {string} [rewrittenAsk]
 * @property {"committed"|"agent"|"clarify"|"skip"} gate
 * @property {{ id?: string, title?: string, speak?: string, posterior?: number, align?: number }|null} [card]
 * @property {SpeakDraft|null} [draft]
 * @property {{ push_forward?: string, push_back?: string, counter_inquiry?: string }|null} [variants]
 * @property {{ lastOpenAsk?: string, clearCarry?: boolean }} [sticky]
 * @property {{ releasedToAgent?: boolean, reason?: string }} [debug]
 */

/**
 * 软校验：形状不对返回错误串，通过返回 null。
 * @param {unknown} value
 * @returns {string|null}
 */
function validateIntelligenceResult(value) {
  if (!value || typeof value !== "object") return "not_object";
  const v = /** @type {Record<string, unknown>} */ (value);
  const gate = String(v.gate || "");
  if (!Object.values(GATES).includes(gate)) return "bad_gate";
  if (v.draft != null) {
    if (typeof v.draft !== "object") return "bad_draft";
    const d = /** @type {Record<string, unknown>} */ (v.draft);
    if (d.text != null && typeof d.text !== "string") return "bad_draft_text";
  }
  if (v.variants != null && typeof v.variants !== "object") return "bad_variants";
  return null;
}

module.exports = {
  GATES,
  validateIntelligenceResult
};
