/**
 * 答法分层与 FAQ 秒答门控。
 */
const { normalizeForMatch } = require("../../duplex");
const { normalizeDazhiAliases } = require("../../meetingSession");
const {
  DEEP_RE,
  isClosedFaqQuestion,
  isComplexQuestion,
  isBusinessIntent
} = require("./classify.cjs");

/**
 * 答法分层：L1 模板 / L2 RAG+LLM / L3 Deep Thinking
 * @param {string} text
 * @param {{ bizFollowUps?: number, forceDeep?: boolean }} [opts]
 * @returns {"L1"|"L2"|"L3"}
 */
function classifyAnswerTier(text, opts = {}) {
  const t = normalizeDazhiAliases(String(text || "").trim());
  if (!t) return "L2";
  if (isClosedFaqQuestion(t)) return "L1";
  if (opts.forceDeep) return "L3";
  if (DEEP_RE.test(t)) return "L3";
  if ((opts.bizFollowUps || 0) >= 2 && (isBusinessIntent(t) || isComplexQuestion(t))) {
    return "L3";
  }
  if (isBusinessIntent(t) || isComplexQuestion(t)) return "L2";
  return "L2";
}

/**
 * 是否允许 FAQ 直出口播。
 * @param {string} text 改写后问句
 * @param {{ answer?: string, title?: string, score?: number }|null} faqHit
 * @param {{ minScore?: number }} [opts]
 */
function shouldFaqInstant(text, faqHit, opts = {}) {
  const minScore = opts.minScore != null ? opts.minScore : 45;
  if (!faqHit?.answer) return false;
  const closed = isClosedFaqQuestion(text);
  // 复杂开放题禁止 FAQ；但闭题或「收益保障」高分命中例外
  if (!closed && isComplexQuestion(text)) {
    const qn = normalizeForMatch(text).replace(/\s+/g, "");
    const tn = normalizeForMatch(faqHit.title || "").replace(/\s+/g, "");
    const topicOk =
      (/收益保障/.test(qn) && /收益保障/.test(tn)) ||
      (/三笔账/.test(qn) && /三笔账/.test(tn)) ||
      (/一园两制/.test(qn) && /一园两制/.test(tn)) ||
      (/普惠/.test(qn) && /普惠/.test(tn)) ||
      (/(条件|具备)/.test(qn) && /(条件|具备)/.test(tn)) ||
      (/(收费|多少钱)/.test(qn) && /(收费|多少钱|三万九)/.test(tn)) ||
      (/(开口|认可)/.test(qn) && /(开口|认可|家长)/.test(tn));
    if (!topicOk || (faqHit.score || 0) < Math.max(22, minScore)) return false;
  } else {
    if (!closed && isBusinessIntent(text)) return false;
    if (!closed && (faqHit.score || 0) < minScore + 10) return false;
    if ((faqHit.score || 0) < minScore) return false;
  }

  const qn = normalizeForMatch(text).replace(/\s+/g, "");
  const tn = normalizeForMatch(faqHit.title || "").replace(/\s+/g, "");
  const priceAsk = /三万九|39000|买的是什么|项目多少钱|怎么收费|如何收费|收费多少/.test(qn);
  const diffAsk = /区别|优势|培训班|少儿英语培训/.test(qn) && !priceAsk;
  const titlePrice = /怎么收费|如何收费|收费多少|多少钱|三万九|39000|3900/.test(tn);
  const titleDiff = /区别|优势|培训班/.test(tn);
  const presenceFaq = /在吗|有没有在听/.test(tn);
  if (priceAsk && presenceFaq) return false;
  // 区别问禁止秒出收费条；收费问禁止秒出区别条
  if (diffAsk && titlePrice && !titleDiff) return false;
  if (priceAsk && titleDiff && !titlePrice) return false;
  if (qn.length >= 4 && tn.length >= 4) {
    const slice = Math.min(10, qn.length);
    if (tn.includes(qn.slice(0, slice)) || qn.includes(tn.replace(/^Q:/, "").slice(0, 10))) {
      return true;
    }
    // 实体重叠：勿单靠「全园美语」放行（易把区别问放成收费答）
    for (const e of ["收益保障", "三笔账", "一园两制", "四端联动", "三万九", "39000", "3900"]) {
      if (qn.includes(e) && tn.includes(e)) return true;
    }
    if (qn.includes("全园美语") && tn.includes("全园美语")) {
      if (diffAsk) return titleDiff;
      if (priceAsk) return titlePrice;
      // 定义类等：标题需同向意图词，或闭题高分
      if (/(是什么|什么是)/.test(qn) && /(是什么|什么是)/.test(tn)) return true;
    }
  }
  return closed && (faqHit.score || 0) >= Math.max(22, minScore - 10);
}

module.exports = { classifyAnswerTier, shouldFaqInstant };
