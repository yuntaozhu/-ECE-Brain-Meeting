"use strict";

/**
 * 价差异常 → 农服跟进（market_watch）
 */
const { createTask, listTasks } = require("../followup/board.cjs");
const { loadAllQuotes } = require("./store.cjs");

function findLatest(product, marketHint) {
  const all = loadAllQuotes({ limitFiles: 5 });
  const hit = all
    .filter((q) => String(q.product_name).includes(product))
    .filter((q) => !marketHint || String(q.market_or_region).includes(marketHint))
    .sort((a, b) => String(b.publish_date).localeCompare(a.publish_date));
  return hit[0] || null;
}

/**
 * 同品类在两市场均价差超过 threshold（元/斤）则建跟进
 */
function detectSpreadAlerts(opts = {}) {
  const products = opts.products || ["草莓", "黄瓜", "西红柿"];
  const threshold = opts.threshold ?? 3;
  const pairs = opts.pairs || [
    { a: "新发地", b: "江南" },
    { a: "新发地", b: "寿光" }
  ];
  const alerts = [];
  for (const product of products) {
    for (const pair of pairs) {
      const qa = findLatest(product, pair.a);
      const qb = findLatest(product, pair.b);
      if (!qa?.price_avg || !qb?.price_avg) continue;
      const spread = Math.abs(qa.price_avg - qb.price_avg);
      if (spread < threshold) continue;
      alerts.push({
        product,
        spread: Math.round(spread * 1000) / 1000,
        a: qa,
        b: qb
      });
    }
  }
  return alerts;
}

function ingestSpreadFollowups(opts = {}) {
  const alerts = detectSpreadAlerts(opts);
  const created = [];
  for (const al of alerts) {
    const title = `行情价差：${al.product} ${al.a.market_or_region} vs ${al.b.market_or_region} 差 ${al.spread} 元/斤`;
    const dup = listTasks().some(
      (t) => t.kind === "market_watch" && t.title === title && t.status !== "done"
    );
    if (dup) continue;
    created.push(
      createTask({
        title,
        kind: "market_watch",
        sourceQuery: al.product,
        note: `A=${al.a.price_avg} B=${al.b.price_avg}`,
        meta: {
          spread: al.spread,
          a: { market: al.a.market_or_region, avg: al.a.price_avg, date: al.a.publish_date },
          b: { market: al.b.market_or_region, avg: al.b.price_avg, date: al.b.publish_date }
        }
      })
    );
  }
  return { alerts, created };
}

module.exports = { detectSpreadAlerts, ingestSpreadFollowups, findLatest };
