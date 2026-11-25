"use strict";

/**
 * 产地地头价 vs 一级批发价差（Phase D）
 * 异常低谷 → 农服跟进；自动外呼明确后置（outbound_call_enabled=false）
 */
const { createTask, listTasks } = require("../../followup/board.cjs");
const { loadAllQuotes } = require("../store.cjs");
const { loadProfileStatus } = require("./profile.cjs");

function isFarmgate(q) {
  if (!q) return false;
  if (q.quote_kind === "farmgate" || q.source_tier === "T3") return true;
  return /一亩田|惠农|产地|地头/.test(String(q.market_or_region || ""));
}

function isWholesale(q) {
  if (!q) return false;
  if (isFarmgate(q)) return false;
  return /新发地|江南|寿光|海吉星|批发/.test(String(q.market_or_region || ""));
}

function findLatestBy(product, pred) {
  return loadAllQuotes({ limitFiles: 7 })
    .filter((q) => String(q.product_name).includes(product))
    .filter(pred)
    .sort((a, b) => String(b.publish_date).localeCompare(a.publish_date))[0] || null;
}

/**
 * 批发均价 − 地头均价 ≥ threshold → 告警（地头异常偏低）
 */
function detectFarmgateSpreadAlerts(opts = {}) {
  const products = opts.products || ["草莓", "黄瓜", "西红柿"];
  const threshold = opts.threshold ?? 4;
  const alerts = [];
  for (const product of products) {
    const farm = findLatestBy(product, isFarmgate);
    const whole = findLatestBy(product, isWholesale);
    if (!farm?.price_avg || !whole?.price_avg) continue;
    const spread = Math.round((whole.price_avg - farm.price_avg) * 1000) / 1000;
    if (spread < threshold) continue;
    alerts.push({
      product,
      spread,
      farmgate: farm,
      wholesale: whole,
      discount_ratio:
        Math.round((1 - farm.price_avg / whole.price_avg) * 1000) / 1000
    });
  }
  return alerts;
}

function ingestFarmgateSpreadFollowups(opts = {}) {
  const alerts = detectFarmgateSpreadAlerts(opts);
  const profile = loadProfileStatus();
  const created = [];
  for (const al of alerts) {
    const title =
      `B2B价差：${al.product} 地头 ${al.farmgate.market_or_region}` +
      ` ${al.farmgate.price_avg} vs 批发 ${al.wholesale.market_or_region}` +
      ` ${al.wholesale.price_avg}（差 ${al.spread} 元/斤）`;
    const dup = listTasks().some(
      (t) => t.kind === "b2b_spread" && t.title === title && t.status !== "done"
    );
    if (dup) continue;
    created.push(
      createTask({
        title,
        kind: "b2b_spread",
        sourceQuery: al.product,
        note: `地头异常偏低；外呼=${profile.outbound_call_enabled ? "允许" : "后置人工"}`,
        meta: {
          spread: al.spread,
          discount_ratio: al.discount_ratio,
          farmgate: {
            market: al.farmgate.market_or_region,
            avg: al.farmgate.price_avg,
            date: al.farmgate.publish_date,
            contact_masked: al.farmgate.contact_masked || null
          },
          wholesale: {
            market: al.wholesale.market_or_region,
            avg: al.wholesale.price_avg,
            date: al.wholesale.publish_date
          },
          action_hint: "manual_review",
          outbound_blocked: !profile.outbound_call_enabled
        }
      })
    );
  }
  return { alerts, created, outbound_call_enabled: profile.outbound_call_enabled };
}

module.exports = {
  isFarmgate,
  isWholesale,
  detectFarmgateSpreadAlerts,
  ingestFarmgateSpreadFollowups
};
