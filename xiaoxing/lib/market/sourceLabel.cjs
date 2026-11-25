"use strict";

/**
 * 口播/展示用信息来源短名：绝不念 URL。
 * URL 仅留在 quote.source_url / sources[] 供跳转与审计。
 */

const BY_SOURCE_ID = {
  "xinfadi-price": "北京新发地价格行情",
  xinfadi: "北京新发地价格行情",
  sgvindex: "寿光蔬菜价格指数",
  jnmarket: "广州江南果菜批发市场",
  szap: "深圳海吉星行情",
  "pfsc-agri": "全国农产品批发市场价格系统",
  "agri-cn": "中国农业信息网",
  natesc: "全国农技中心病虫情报",
  "natesc-seed": "全国农技中心病虫情报",
  "shandong-seed": "山东省农业农村厅",
  "ymt-gongying": "一亩田供应大厅",
  "ymt-hangqing": "一亩田行情中心",
  "cnhnb-supply": "惠农网供应大厅",
  "cnhnb-hangqing": "惠农网行情中心"
};

const BY_HOST = [
  { re: /xinfadi\.com\.cn/i, label: "北京新发地价格行情" },
  { re: /sgvindex\.com/i, label: "寿光蔬菜价格指数" },
  { re: /jnmarket\.net/i, label: "广州江南果菜批发市场" },
  { re: /szap\.com/i, label: "深圳海吉星行情" },
  { re: /pfsc\.agri\.cn/i, label: "全国农产品批发市场价格系统" },
  { re: /agri\.cn/i, label: "中国农业信息网" },
  { re: /natesc\.org\.cn/i, label: "全国农技中心病虫情报" },
  { re: /ymt\.com/i, label: "一亩田" },
  { re: /cnhnb\.com/i, label: "惠农网" },
  { re: /nync\.shandong\.gov\.cn/i, label: "山东省农业农村厅" },
  { re: /dara\.gd\.gov\.cn/i, label: "广东省农业农村厅" },
  { re: /nynct\.sc\.gov\.cn/i, label: "四川省农业农村厅" },
  { re: /nynct\.shaanxi\.gov\.cn/i, label: "陕西省农业农村厅" }
];

const BY_MARKET_HINT = [
  { re: /新发地/, label: "北京新发地价格行情" },
  { re: /寿光/, label: "寿光蔬菜价格指数" },
  { re: /江南/, label: "广州江南果菜批发市场" },
  { re: /海吉星|深农/, label: "深圳海吉星行情" },
  { re: /一亩田/, label: "一亩田供应大厅" },
  { re: /惠农/, label: "惠农网供应大厅" }
];

function looksLikeUrl(s) {
  return /https?:\/\//i.test(String(s || "")) || /\.[a-z]{2,}(\/|$)/i.test(String(s || ""));
}

/**
 * @param {{ source_id?: string, source_url?: string, market_or_region?: string, source_label?: string } | string} quoteOrUrl
 * @returns {string} 口播友好短名
 */
function sourceLabel(quoteOrUrl = {}) {
  if (typeof quoteOrUrl === "string") {
    return sourceLabel({ source_url: quoteOrUrl });
  }
  const q = quoteOrUrl || {};
  if (q.source_label && !looksLikeUrl(q.source_label)) {
    return String(q.source_label).trim();
  }
  if (q.source_id && BY_SOURCE_ID[q.source_id]) {
    return BY_SOURCE_ID[q.source_id];
  }
  const url = String(q.source_url || "");
  for (const h of BY_HOST) {
    if (h.re.test(url)) return h.label;
  }
  const market = String(q.market_or_region || "");
  for (const h of BY_MARKET_HINT) {
    if (h.re.test(market)) return h.label;
  }
  if (market && !looksLikeUrl(market)) {
    return `${market}公开行情`;
  }
  return "公开农产品行情源";
}

/** 口播句：信息来自××。 */
function speakSource(quoteOrUrl) {
  return `信息来自${sourceLabel(quoteOrUrl)}。`;
}

module.exports = {
  sourceLabel,
  speakSource,
  looksLikeUrl,
  BY_SOURCE_ID
};
