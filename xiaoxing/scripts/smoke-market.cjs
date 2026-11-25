"use strict";

/**
 * 行情 Phase A 冒烟（种子数据，不依赖公网）
 * node scripts/smoke-market.cjs
 */
const assert = require("assert");
const fs = require("fs");
const {
  ingestSeed,
  normalizeQuote,
  validateQuote,
  matchMarketQuote,
  listRecentQuotes,
  toJinFactor
} = require("../lib/market/index.cjs");
const { ask } = require("../lib/ask/index.cjs");

function main() {
  assert.equal(toJinFactor("元/公斤"), 0.5);
  assert.equal(toJinFactor("元/斤"), 1);

  const kg = normalizeQuote({
    product_name: "黄瓜",
    publish_date: "2026-11-18",
    market_or_region: "测试市场",
    price_avg: 3.1,
    unit_raw: "元/公斤",
    source_url: "http://example.com"
  });
  assert.equal(kg.unit, "元/斤");
  assert.ok(Math.abs(kg.price_avg - 1.55) < 0.001);
  assert.ok(validateQuote(kg).ok);

  const anomaly = normalizeQuote({
    product_name: "大白菜",
    publish_date: "2026-11-18",
    market_or_region: "测试",
    price_avg: 50,
    unit_raw: "元/斤",
    source_url: "http://example.com"
  });
  assert.equal(anomaly.needs_review, true);

  const seeded = ingestSeed({ replace: true });
  assert.ok(seeded.count >= 4);
  assert.ok(fs.existsSync(seeded.file));

  const { sourceLabel, speakSource } = require("../lib/market/sourceLabel.cjs");
  const { matchPestAlert } = require("../lib/market/pest.cjs");

  function assertNoUrlSpeak(text, label) {
    assert.ok(/信息来自/.test(text), `${label}: 应简述来源`);
    assert.ok(!/https?:\/\//i.test(text), `${label}: 禁止念网址`);
    assert.ok(!/www\./i.test(text), `${label}: 禁止念域名`);
  }

  const hit = matchMarketQuote("新发地草莓多少钱");
  assert.ok(hit, "应命中新发地草莓");
  assert.equal(hit.layer, "market");
  assert.ok(/新发地|草莓|元\/斤/.test(hit.reply));
  assertNoUrlSpeak(hit.reply, "新发地");
  assert.ok(/新发地/.test(hit.source_label || hit.reply));

  const sg = matchMarketQuote("寿光黄瓜均价多少");
  assert.ok(sg && sg.ok, "应命中寿光黄瓜");
  assertNoUrlSpeak(sg.reply, "寿光");
  assert.ok(/寿光/.test(sg.source_label || sg.reply));

  assert.equal(
    sourceLabel({ source_url: "http://www.jnmarket.net" }),
    "广州江南果菜批发市场"
  );
  assert.ok(/江南/.test(speakSource({ source_url: "http://www.jnmarket.net" })));

  const pest = matchPestAlert("河南番茄晚疫病预警");
  assert.ok(pest && pest.layer === "pest", "病虫应命中");
  assertNoUrlSpeak(pest.reply, "病虫");
  assert.ok(/农技|河南|山东/.test(pest.source_label || pest.reply));

  const list = listRecentQuotes(5);
  assert.ok(list.length >= 1);

  const a = ask("新发地草莓批发价多少", { writeGap: false, session: false });
  assert.equal(a.layer, "market");
  assert.ok(a.moreQuestions?.length >= 2);
  assertNoUrlSpeak(a.reply, "Ask行情");

  // 农艺问不抢行情
  const faq = ask("宁玉有什么特点", { writeGap: false, session: false });
  assert.ok(["faq", "wiki", "wiki2"].includes(faq.layer));

  console.log(
    JSON.stringify(
      {
        ok: true,
        seeded: seeded.count,
        sampleReply: hit.reply.slice(0, 80),
        sgLabel: sg.source_label,
        pestLabel: pest.source_label,
        askLayer: a.layer,
        recent: list.length
      },
      null,
      2
    )
  );
}

main();
