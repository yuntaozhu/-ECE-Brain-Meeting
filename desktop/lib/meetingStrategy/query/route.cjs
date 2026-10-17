/**
 * 答法分层与 FAQ 秒答门控。
 * 句式只读 knowledge/schema/query-classify.json。
 */
const { normalizeForMatch } = require("../../duplex");
const { normalizeDazhiAliases } = require("../../meetingSession");
const { load, rx } = require("../../knowledge/schemaStore.cjs");
const {
  isClosedFaqQuestion,
  isComplexQuestion,
  isBusinessIntent
} = require("./classify.cjs");

function lim(name) {
  const value = load().classify.limits[name];
  if (value == null) throw new Error("missing classify limit " + name);
  return value;
}

function pat(name) {
  return rx("classify", name);
}

function classifyAnswerTier(text, opts = {}) {
  const t = normalizeDazhiAliases(String(text || "").trim());
  if (!t) return "L2";
  if (isClosedFaqQuestion(t)) return "L1";
  if (opts.forceDeep) return "L3";
  if (pat("deep").test(t)) return "L3";
  if ((opts.bizFollowUps || 0) >= 2 && (isBusinessIntent(t) || isComplexQuestion(t))) {
    return "L3";
  }
  if (isBusinessIntent(t) || isComplexQuestion(t)) return "L2";
  return "L2";
}

function topicPairOk(qn, tn) {
  for (const pair of load().classify.faqTopicPairs || []) {
    const [qPat, tPat] = pair;
    if (new RegExp(qPat).test(qn) && new RegExp(tPat).test(tn)) return true;
  }
  return false;
}

function shouldFaqInstant(text, faqHit, opts = {}) {
  const minScore = opts.minScore != null ? opts.minScore : 45;
  if (!faqHit?.answer) return false;
  const closed = isClosedFaqQuestion(text);
  if (!closed && isComplexQuestion(text)) {
    const qn = normalizeForMatch(text).replace(/\s+/g, "");
    const tn = normalizeForMatch(faqHit.title || "").replace(/\s+/g, "");
    const topicOk = topicPairOk(qn, tn);
    if (!topicOk || (faqHit.score || 0) < Math.max(lim("faqComplexMinScore"), minScore)) {
      return false;
    }
  } else {
    if (!closed && isBusinessIntent(text)) return false;
    if (!closed && (faqHit.score || 0) < minScore + lim("faqBizScorePad")) return false;
    if ((faqHit.score || 0) < minScore) return false;
  }

  const qn = normalizeForMatch(text).replace(/\s+/g, "");
  const tn = normalizeForMatch(faqHit.title || "").replace(/\s+/g, "");
  const priceAsk = pat("routePriceAsk").test(qn);
  const diffAsk = pat("routeDiffAsk").test(qn) && !priceAsk;
  const titlePrice = pat("routeTitlePrice").test(tn);
  const titleDiff = pat("routeTitleDiff").test(tn);
  const presenceFaq = pat("routePresenceFaq").test(tn);
  if (priceAsk && presenceFaq) return false;
  if (diffAsk && titlePrice && !titleDiff) return false;
  if (priceAsk && titleDiff && !titlePrice) return false;
  if (qn.length >= lim("faqTitleMin") && tn.length >= lim("faqTitleMin")) {
    const slice = Math.min(lim("faqOverlapSlice"), qn.length);
    if (tn.includes(qn.slice(0, slice)) || qn.includes(tn.replace(/^Q:/, "").slice(0, lim("faqOverlapSlice")))) {
      return true;
    }
    for (const e of load().classify.entityOverlap || []) {
      if (qn.includes(e) && tn.includes(e)) return true;
    }
    if (qn.includes(load().classify.patterns.routeMeiyu) && tn.includes(load().classify.patterns.routeMeiyu)) {
      if (diffAsk) return titleDiff;
      if (priceAsk) return titlePrice;
      if (pat("routeDefinition").test(qn) && pat("routeDefinition").test(tn)) return true;
    }
  }
  return closed && (faqHit.score || 0) >= Math.max(lim("faqComplexMinScore"), minScore - lim("faqClosedScorePad"));
}

module.exports = { classifyAnswerTier, shouldFaqInstant };
