"use strict";

/**
 * 综合回归冒烟：纠错 / 出处 / 熔断边界 / 隔离 / Ask 口播
 * node scripts/smoke-extra.cjs
 */
const assert = require("assert");
const fs = require("fs");
const path = require("path");
const { correctAsrText, resetCorrectionCache } = require("../lib/asr/correct.cjs");
const { createAsrCircuit, classifyError } = require("../lib/asr/circuit.cjs");
const { sourceLabel, speakSource, looksLikeUrl } = require("../lib/market/sourceLabel.cjs");
const { speakQuote, normalizeQuote } = require("../lib/market/normalize.cjs");
const { matchMarketQuote, ingestSeedWithB2b, buildMarketDashboard } = require("../lib/market/index.cjs");
const { matchPestAlert } = require("../lib/market/pest.cjs");
const { ask } = require("../lib/ask/index.cjs");
const followup = require("../lib/followup/board.cjs");
const { debugLog } = require("../lib/platform/debugLog.cjs");

function assertNoUrl(text, label) {
  assert.ok(!/https?:\/\//i.test(text), `${label}: 禁 http`);
  assert.ok(!/www\./i.test(text), `${label}: 禁 www`);
}

function main() {
  // —— ASR 纠错（含日志中出现的误识）——
  resetCorrectionCache && resetCorrectionCache();
  assert.equal(correctAsrText("宁雨草莓怎么样"), "宁玉草莓怎么样");
  assert.equal(correctAsrText("山东草莓灰病毒如何"), "山东草莓灰霉病如何");
  assert.equal(correctAsrText("哪些地方的育病有意境"), "哪些地方的疫病有预警");
  assert.equal(correctAsrText("新发地草霉多少钱"), "新发地草莓多少钱");
  assert.equal(correctAsrText("宁峰和宁雨有什么区别"), "宁丰和宁玉有什么区别");
  assert.equal(correctAsrText("拓毒苗怎么选"), "脱毒苗怎么选");
  assert.equal(correctAsrText("晓星你是谁"), "小星你是谁");
  assert.equal(correctAsrText("苏梅66适合家定吗"), "苏莓66适合嘉定吗");
  assert.equal(correctAsrText("番茄晚意病怎么办"), "番茄晚疫病怎么办");
  assert.equal(correctAsrText("一亩田产地驾多少"), "一亩田产地价多少");

  // —— 出处短名 ——
  assert.equal(sourceLabel({ source_url: "http://www.xinfadi.com.cn/priceDetail.html" }), "北京新发地价格行情");
  assert.equal(sourceLabel({ source_url: "http://www.sgvindex.com" }), "寿光蔬菜价格指数");
  assert.equal(sourceLabel({ source_url: "https://www.ymt.com/gongying/" }), "一亩田");
  assert.equal(sourceLabel({ source_url: "https://www.szap.com/price" }), "深圳海吉星行情");
  assert.equal(sourceLabel({ source_url: "https://www.cnhnb.com/supply/" }), "惠农网");
  assert.equal(sourceLabel({ source_url: "http://nync.shandong.gov.cn/price" }), "山东省农业农村厅");
  assert.equal(sourceLabel({ source_id: "cnhnb-supply" }), "惠农网供应大厅");
  assert.equal(sourceLabel({ market_or_region: "海吉星批发" }), "深圳海吉星行情");
  assert.ok(!looksLikeUrl(sourceLabel({ source_id: "jnmarket" })));
  assert.ok(looksLikeUrl("https://example.com/x"));
  assert.ok(!looksLikeUrl("北京新发地价格行情"));
  const spoken = speakSource({ source_url: "https://www.natesc.org.cn" });
  assert.ok(spoken.startsWith("信息来自"));
  assert.ok(/全国农技中心/.test(spoken));
  assertNoUrl(spoken, "speakSource");

  const q = normalizeQuote({
    product_name: "草莓",
    publish_date: "2026-11-18",
    market_or_region: "北京新发地",
    price_avg: 12.5,
    unit_raw: "元/斤",
    source_url: "http://www.xinfadi.com.cn/priceDetail.html",
    source_id: "xinfadi-price"
  });
  const spokenQ = speakQuote(q);
  assert.ok(/信息来自北京新发地/.test(spokenQ));
  assertNoUrl(spokenQ, "speakQuote");

  // —— 行情 Ask ——
  ingestSeedWithB2b();
  const m = matchMarketQuote("新发地草莓多少钱");
  assert.ok(m && m.layer === "market");
  assertNoUrl(m.reply, "market reply");
  const farm = matchMarketQuote("一亩田草莓产地价多少");
  assert.ok(farm && farm.quote.quote_kind === "farmgate");
  assertNoUrl(farm.reply, "farmgate reply");
  const pest = matchPestAlert("河南番茄晚疫病预警");
  assert.ok(pest && pest.layer === "pest");
  assertNoUrl(pest.reply, "pest reply");

  const askM = ask("寿光黄瓜均价多少", { writeGap: false, session: false });
  assert.equal(askM.layer, "market");
  assertNoUrl(askM.reply, "ask market");

  // 品名硬门闩：不得用地名顶替
  const askSoy = ask("寿光的大豆多少钱一斤", { writeGap: false, session: false });
  assert.equal(askSoy.layer, "market_miss");
  assert.ok(/大豆/.test(askSoy.reply));
  assert.ok(!/黄瓜/.test(askSoy.reply));
  assert.equal(matchMarketQuote("草莓资料哪里查"), null);

  const askId = ask("你是谁", { writeGap: false, session: false });
  assert.ok(askId.layer === "identity" || askId.layer === "faq");
  assert.ok(/小星/.test(askId.reply));

  const askRefuse = ask("草莓打什么药治灰霉病剂量多少", { writeGap: false, session: false });
  assert.equal(askRefuse.layer, "refuse");

  const askFaq = ask("宁玉有什么特点", { writeGap: false, session: false });
  assert.equal(askFaq.layer, "faq");
  assert.ok(/宁玉/.test(askFaq.reply));

  // —— dashboard ——
  const dash = buildMarketDashboard({ quoteLimit: 8, days: 7 });
  assert.ok(dash.ok);
  assert.ok(dash.sparklines.some((s) => s.series.length === 7));
  assert.ok(dash.quotes.some((x) => x.badge === "批发" || x.badge === "地头"));

  // —— 熔断边界：退避递增 ——
  const c = createAsrCircuit({ failThreshold: 3, baseBackoffMs: 1000, maxBackoffMs: 8000 });
  c.onFailure({ code: "connect_timeout", message: "connect_timeout" });
  c.onFailure({ code: "connect_timeout", message: "connect_timeout" });
  const open1 = c.onFailure({ code: "connect_timeout", message: "connect_timeout" });
  assert.equal(open1.payload.code, "circuit_open");
  const d1 = open1.reconnectDelayMs;
  // 再失败仍 hold，delay ≥ 剩余
  const hold = c.onFailure({ code: "socket_error", message: "ENOTFOUND x" });
  assert.equal(hold.payload.code, "circuit_hold");
  assert.equal(hold.emit, true); // 首条 hold 仍 emit
  const hold2 = c.onFailure({ code: "socket_error", message: "ENOTFOUND x" });
  assert.equal(hold2.payload.code, "circuit_hold");
  assert.equal(hold2.emit, false); // 2～9 抑制
  assert.ok(hold.reconnectDelayMs > 0);
  assert.equal(classifyError({ message: "getaddrinfo ENOTFOUND x" }), "dns");
  assert.equal(classifyError({ code: "missing_speech_key" }), "config");
  c.onSuccess();
  assert.equal(c.snapshot().open, false);
  assert.ok(d1 >= 1000);

  // 配置错不计入熔断
  const c2 = createAsrCircuit({ failThreshold: 3, baseBackoffMs: 1000, maxBackoffMs: 8000 });
  const bypass = c2.onFailure({ code: "missing_speech_key", message: "no key" });
  assert.equal(bypass.payload.circuit, "bypass");
  assert.equal(c2.snapshot().failCount, 0);
  assert.equal(c2.snapshot().open, false);

  // —— 跟进标签 ——
  assert.equal(followup.kindLabel("meeting_gap"), "会场缺口");
  assert.equal(followup.kindLabel("wechat_fragment"), "微信碎片");
  assert.equal(followup.kindLabel("b2b_spread"), "地头价差");
  assert.equal(followup.kindLabel("market_watch"), "跨市价差");
  assert.equal(followup.kindLabel("manual"), "手建");

  // —— 日志脱敏 + 限流 ——
  debugLog.clearMemory();
  debugLog.info("Extra", "secret check", { authorization: "Bearer abc", apiKey: "sk-test", ok: true });
  const last = debugLog.recent(1)[0];
  assert.equal(last.detail.authorization, "***");
  assert.equal(last.detail.apiKey, "***");
  assert.equal(last.detail.ok, true);
  const r1 = debugLog.warn("Extra", "rate", { x: 1 }, { rateKey: "extra-rate", rateMs: 60000 });
  const r2 = debugLog.warn("Extra", "rate", { x: 2 }, { rateKey: "extra-rate", rateMs: 60000 });
  assert.ok(r1);
  assert.equal(r2, null);

  // —— 隔离：关键路径不得 require desktop 业务 lib ——
  const roots = [
    path.join(__dirname, "..", "lib"),
    path.join(__dirname, "..", "main.cjs"),
    path.join(__dirname, "..", "preload.cjs")
  ];
  const offenders = [];
  function scan(p) {
    const st = fs.statSync(p);
    if (st.isDirectory()) {
      for (const f of fs.readdirSync(p)) {
        if (f === "node_modules") continue;
        scan(path.join(p, f));
      }
      return;
    }
    if (!/\.(cjs|js)$/.test(p)) return;
    const raw = fs.readFileSync(p, "utf8");
    if (/require\(['"]\.\.\/desktop\//.test(raw) || /require\(['"]\.\.\/\.\.\/desktop\//.test(raw)) {
      offenders.push(path.relative(path.join(__dirname, ".."), p));
    }
  }
  for (const r of roots) scan(r);
  assert.deepEqual(offenders, [], "不得跨项目 require desktop: " + offenders.join(","));

  console.log(
    JSON.stringify(
      {
        ok: true,
        corrections: ["灰霉病", "疫病", "宁玉", "宁丰", "脱毒苗", "晚疫病"],
        ask: { identity: askId.layer, faq: askFaq.layer, refuse: askRefuse.layer, market: askM.layer },
        marketLayer: m.layer,
        farmgate: farm.quote.quote_kind,
        pestLabel: pest.source_label,
        circuitOpenDelay: d1,
        circuitBypass: bypass.payload.circuit,
        rateLimited: r2 === null,
        isolationOk: true
      },
      null,
      2
    )
  );
}

main();
