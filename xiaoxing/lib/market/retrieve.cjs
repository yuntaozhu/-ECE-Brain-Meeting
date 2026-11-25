"use strict";

const { loadAllQuotes } = require("./store.cjs");
const { speakQuote, normalizeQuote } = require("./normalize.cjs");
const { sourceLabel } = require("./sourceLabel.cjs");
const { normalizeText } = require("../knowledge/parse.cjs");
const {
  loadProductCfg,
  extractProducts,
  productMatchesQuote,
  productOverlapScore
} = require("./productGate.cjs");

const MARKET_CUES =
  /行情|批发价|多少钱|什么价|均价|报价|新发地|江南|寿光|海吉星|菜篮子|今日价|昨天价|价格|一亩田|惠农|产地价|地头价|供应大厅|地头|最便宜|便宜吗/;

const AGRI_NOT_PRICE =
  /特点|怎么种|栽培|脱毒|品种选育|适不适合|资料|哪里查|去哪查|如何防治|怎么防治|病虫害/;

function looksLikePriceQuery(query) {
  const q = String(query || "");
  // 补贴/政策金额不是批发行情
  if (/补贴|能领多少|能拿多少钱|一亩给多少|领多少补贴/.test(q)) return false;
  // 问法指南 / 概念辨析，不是询价
  if (/怎么问|如何问|批发价和产地价|为什么.*不答|有的价你不答/.test(q)) return false;
  // 渠道入口 / 准不准：留给 FAQ/Wiki（如「稻谷行情去哪查」「惠农米价准吗」）
  if (/去哪查|哪里查|哪里看|资料入口|准吗|能信吗|可靠吗|靠谱吗|怎么核验|是否权威/.test(q)) {
    return false;
  }
  return MARKET_CUES.test(q);
}

function queryTokens(query) {
  const cjk = String(query || "").replace(/[^\u4e00-\u9fff]/g, "");
  const out = new Set();
  for (let n = 2; n <= 3; n++) {
    for (let i = 0; i + n <= cjk.length; i++) out.add(cjk.slice(i, i + n));
  }
  return [...out];
}

function scoreQuote(q, queryN, tokens, queryProducts) {
  let score = 0;
  const hay = normalizeText(
    [q.product_name, q.specification, q.market_or_region, q.category, q.province].join("")
  );
  const prod = normalizeText(q.product_name);
  const prodScore = productOverlapScore(q, queryProducts);
  score += prodScore;
  if (!queryProducts?.length) {
    if (prod && queryN.includes(prod)) score += 20;
    if (prod && prod.length >= 2 && queryN.includes(prod.slice(0, 2))) score += 8;
  }
  for (const t of tokens) {
    if (hay.includes(t)) score += t.length >= 3 ? 3 : 1;
  }
  if (/新发地/.test(queryN) && /新发地/.test(hay)) score += 10;
  if (/寿光/.test(queryN) && /寿光/.test(hay)) score += 10;
  if (/江南/.test(queryN) && /江南/.test(hay)) score += 10;
  if (/江杨/.test(queryN) && /江杨/.test(hay)) score += 10;
  if (
    /长三角|长江三角洲/.test(queryN) &&
    /长三角|上海|江苏|浙江|江杨/.test(hay)
  ) {
    score += 14;
  }
  if (/上海/.test(queryN) && /上海|江杨/.test(hay)) score += 10;
  if (/一亩田|产地|地头/.test(queryN) && (q.quote_kind === "farmgate" || /一亩田|产地|地头/.test(hay))) {
    score += 14;
  }
  if (/惠农/.test(queryN) && /惠农/.test(hay)) score += 12;
  if (/草莓/.test(queryN) && /草莓/.test(hay)) score += 12;
  if (/黄瓜/.test(queryN) && /黄瓜/.test(hay)) score += 12;
  if (/柑橘|橘子|桔子/.test(queryN) && /柑橘|橘子|桔子/.test(hay)) score += 12;
  if (q.needs_review) score -= 5;
  if (q.publish_date) score += Math.min(6, Number(q.publish_date.slice(8) || 0) / 5);
  return score;
}

function catalogProductNames(limit = 6) {
  const names = [];
  const seen = new Set();
  for (const q of loadAllQuotes({ limitFiles: 3 })) {
    const n = String(q.product_name || "").trim();
    if (!n || seen.has(n)) continue;
    seen.add(n);
    names.push(n);
    if (names.length >= limit) break;
  }
  return names;
}

/**
 * 库内无匹配时的诚实答复（不拿别的品顶替）
 */
function buildMarketMiss(query, meta = {}) {
  const products = extractProducts(query);
  const prodLabel = products.length ? products.join("、") : "该品";
  const liveBit = meta.liveAttempted
    ? meta.liveOk
      ? "刚查了公开行情源，仍未解析到对应报价。"
      : `刚尝试在线查询${meta.liveError ? `（${String(meta.liveError).slice(0, 40)}）` : ""}，暂未拿到可用报价。`
    : "库里暂时没有审定报价。";
  const reply = `${liveBit}不能用其它菜价代替「${prodLabel}」。已记待补源，有口径后再告诉你。`;
  // 续问：跟问句品（询价句式）或库内有货品
  const moreQuestions = [];
  if (products.length) {
    moreQuestions.push(
      `${products[0]}在新发地多少钱`,
      `寿光${products[0]}均价多少`,
      `${products[0]}一亩田产地价多少`
    );
  }
  for (const n of catalogProductNames(4)) {
    if (products.includes(n)) continue;
    moreQuestions.push(`今天${n}批发价多少`);
    if (moreQuestions.length >= 4) break;
  }
  while (moreQuestions.length < 2) {
    moreQuestions.push("新发地草莓多少钱", "寿光黄瓜均价多少");
  }

  return {
    ok: true,
    layer: "market_miss",
    reply,
    score: 0,
    products,
    liveAttempted: Boolean(meta.liveAttempted),
    liveOk: Boolean(meta.liveOk),
    sources: [],
    moreQuestions: moreQuestions.slice(0, 4),
    replyDisplay: null
  };
}

/**
 * @returns {null | { ok: true, layer: 'market', reply: string, quote: object, score: number, sources: string[], moreQuestions: string[] }}
 */
function matchMarketQuote(query, opts = {}) {
  const q = String(query || "").trim();
  if (!q) return null;
  const cfg = loadProductCfg();

  // 仅价格意图（或 force）触发行情；禁止「草莓资料」仅因品名误入
  if (!opts.force && !looksLikePriceQuery(q)) {
    return null;
  }
  if (AGRI_NOT_PRICE.test(q) && !looksLikePriceQuery(q)) {
    return null;
  }
  // 同时含资料/特点与弱价格词时：资料优先留给 FAQ（无强价格词则已在上返回）
  if (/资料|哪里查|去哪查|特点|怎么种/.test(q) && !/多少钱|均价|批发价|产地价|行情/.test(q)) {
    return null;
  }

  let quotes = loadAllQuotes({ limitFiles: opts.limitFiles || 7 });
  if (!quotes.length && opts.allowEmpty !== false) return null;

  const queryProducts = extractProducts(q);
  const requireProduct =
    opts.requireProductMatch !== undefined
      ? opts.requireProductMatch
      : cfg.requireProductMatch !== false;
  const minProductScore = opts.minProductScore ?? cfg.minProductScore ?? 20;
  const minScore = opts.minScore ?? cfg.minScore ?? 12;

  const qn = normalizeText(q);
  const tokens = queryTokens(q);

  if (requireProduct && queryProducts.length) {
    quotes = quotes.filter((quote) => productMatchesQuote(quote, queryProducts));
    if (!quotes.length) return null;
  } else if (requireProduct && looksLikePriceQuery(q)) {
    // 词表未识别出品名时：禁止仅凭地名/日期软命中；报价品名须字面出现在问句中
    quotes = quotes.filter((quote) => {
      const prod = normalizeText(quote.product_name);
      return prod && qn.includes(prod);
    });
    if (!quotes.length) return null;
  }
  const scored = quotes
    .map((quote) => ({
      quote,
      score: scoreQuote(quote, qn, tokens, queryProducts),
      prodScore: productOverlapScore(quote, queryProducts)
    }))
    .filter((x) => {
      if (x.score < minScore) return false;
      if (requireProduct && queryProducts.length && x.prodScore < minProductScore) return false;
      return true;
    })
    .sort(
      (a, b) =>
        b.score - a.score || String(b.quote.publish_date).localeCompare(String(a.quote.publish_date))
    );

  const top = scored[0];
  if (!top) return null;
  if (top.quote.needs_review && top.score < 18) return null;

  const reply = speakQuote(top.quote);
  const label = sourceLabel(top.quote);
  const askProd = queryProducts[0] || top.quote.product_name;
  const moreQuestions = [
    `${askProd}在新发地多少钱`,
    `${askProd}一亩田产地价多少`,
    `${askProd}寿光行情怎么样`,
    "今天草莓批发价多少",
    "黄瓜地头价多少"
  ]
    .filter((x, i, arr) => arr.indexOf(x) === i)
    .slice(0, 4);

  return {
    ok: true,
    layer: "market",
    reply,
    quote: top.quote,
    score: top.score,
    source_label: label,
    query_products: queryProducts,
    sources: [label, top.quote.source_url, top.quote.market_or_region].filter(Boolean),
    moreQuestions,
    replyDisplay:
      reply +
      "\n\n还可以问我：\n" +
      moreQuestions.map((m, i) => `${i + 1}. ${m}`).join("\n")
  };
}

function listRecentQuotes(limit = 12) {
  const all = loadAllQuotes({ limitFiles: 3 });
  return all
    .slice()
    .sort((a, b) => String(b.publish_date).localeCompare(String(a.publish_date)))
    .slice(0, limit)
    .map((q) => normalizeQuote(q));
}

module.exports = {
  looksLikePriceQuery,
  matchMarketQuote,
  listRecentQuotes,
  buildMarketMiss,
  extractProducts
};
