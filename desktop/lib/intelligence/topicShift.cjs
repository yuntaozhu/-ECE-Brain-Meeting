/**
 * Wave R2：异题检测（数值对齐，无业务词）。
 * 完整新问与上一卡标题/口播对齐过低 → 清 sticky，禁旧 host carry。
 */
const { load } = require("../knowledge/schemaStore.cjs");
const {
  extractWeightedPolarityBigrams,
  computeAlignmentAndExtra
} = require("../text/universalOperators.cjs");

function alignAskTo(ask, text) {
  const a = String(ask || "").trim();
  const b = String(text || "").trim();
  if (!a || !b) return 1;
  return computeAlignmentAndExtra(
    extractWeightedPolarityBigrams(a),
    extractWeightedPolarityBigrams(b)
  ).align;
}

/**
 * @param {string} ask
 * @param {{ hypothesisId?: string, type?: string }|null|undefined} prevDesign
 * @param {string} [lastHost]
 * @returns {boolean}
 */
function isTopicShift(ask, prevDesign, lastHost) {
  if (!prevDesign || prevDesign.type !== "answer") return false;
  const hypo = String(prevDesign.hypothesisId || "").trim();
  if (!hypo || hypo === "carry" || hypo === "probe" || hypo === "script") return false;
  const q = String(ask || "").trim();
  if (q.length < 8) return false;

  const cfg = load().hyper || {};
  const max = Number.isFinite(Number(cfg.topicShiftAlignMax))
    ? Number(cfg.topicShiftAlignMax)
    : 0.22;

  const aHypo = alignAskTo(q, hypo);
  const host = String(lastHost || "").trim();
  const aHost = host.length >= 12 ? alignAskTo(q, host) : 0;
  return Math.max(aHypo, aHost) < max;
}

module.exports = {
  isTopicShift,
  alignAskTo
};
