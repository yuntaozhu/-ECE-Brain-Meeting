"use strict";

/**
 * 行情驾驶舱只读视图（Phase E）
 * - 今日卡（批发 / 地头）
 * - 近 7 日均价序列（库内有则填，无则 null，可静态展示）
 * - 价差跟进摘要（market_watch / b2b_spread）
 */
const { loadAllQuotes } = require("./store.cjs");
const { listRecentQuotes } = require("./retrieve.cjs");
const { detectSpreadAlerts } = require("./watch.cjs");
const { detectFarmgateSpreadAlerts, isFarmgate } = require("./b2b/spread.cjs");
const { listTasks } = require("../followup/board.cjs");

function dayOffset(isoDate, delta) {
  const d = new Date(`${isoDate}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * 近 N 日某品类批发均价序列（同日多条取均值）
 */
function sparklineForProduct(product, { days = 7, endDate = todayIso() } = {}) {
  const all = loadAllQuotes({ limitFiles: Math.max(days, 7) }).filter(
    (q) =>
      String(q.product_name).includes(product) &&
      !isFarmgate(q) &&
      q.price_avg != null
  );
  const byDay = new Map();
  for (const q of all) {
    const day = String(q.publish_date || "").slice(0, 10);
    if (!day) continue;
    if (!byDay.has(day)) byDay.set(day, []);
    byDay.get(day).push(Number(q.price_avg));
  }
  const series = [];
  for (let i = days - 1; i >= 0; i--) {
    const day = dayOffset(endDate, -i);
    const vals = byDay.get(day) || [];
    const avg = vals.length
      ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 1000) / 1000
      : null;
    series.push({ date: day, avg });
  }
  const present = series.filter((s) => s.avg != null).map((s) => s.avg);
  const max = present.length ? Math.max(...present) : 1;
  const min = present.length ? Math.min(...present) : 0;
  return {
    product,
    unit: "元/斤",
    days,
    series,
    max,
    min,
    points: series.map((s) =>
      s.avg == null ? null : Math.round(((s.avg - min) / (max - min || 1)) * 100)
    )
  };
}

function summarizeQuotes(limit = 12) {
  return listRecentQuotes(limit).map((q) => ({
    ...q,
    badge: isFarmgate(q) ? "地头" : "批发",
    kind_label: isFarmgate(q) ? "产地地头价" : "批发均价"
  }));
}

function openSpreadTasks(limit = 8) {
  return listTasks()
    .filter(
      (t) =>
        (t.kind === "market_watch" || t.kind === "b2b_spread") &&
        t.status !== "done"
    )
    .slice(0, limit)
    .map((t) => ({
      id: t.id,
      kind: t.kind,
      title: t.title,
      status: t.status,
      meta: t.meta || null
    }));
}

function buildMarketDashboard(opts = {}) {
  const products = opts.products || ["草莓", "黄瓜", "西红柿"];
  const quotes = summarizeQuotes(opts.quoteLimit || 12);
  const sparklines = products.map((p) => sparklineForProduct(p, { days: opts.days || 7 }));
  const crossMarket = detectSpreadAlerts({
    products,
    threshold: opts.crossThreshold ?? 3
  });
  const farmgate = detectFarmgateSpreadAlerts({
    products,
    threshold: opts.farmgateThreshold ?? 4
  });
  return {
    ok: true,
    at: new Date().toISOString(),
    quotes,
    sparklines,
    alerts: {
      cross_market: crossMarket.map((a) => ({
        product: a.product,
        spread: a.spread,
        a: a.a.market_or_region,
        b: a.b.market_or_region
      })),
      farmgate: farmgate.map((a) => ({
        product: a.product,
        spread: a.spread,
        farmgate: a.farmgate.market_or_region,
        wholesale: a.wholesale.market_or_region
      }))
    },
    followups: openSpreadTasks(opts.followupLimit || 8)
  };
}

module.exports = {
  buildMarketDashboard,
  sparklineForProduct,
  summarizeQuotes,
  dayOffset
};
