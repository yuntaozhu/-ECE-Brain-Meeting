"use strict";

/**
 * Wiki2 快读冒烟
 * node scripts/smoke-wiki2.cjs
 */
const assert = require("assert");
const fs = require("fs");
const {
  buildWiki2Index,
  clearWiki2Cache,
  wiki2IndexPath,
  retrieveWiki2
} = require("../lib/wiki2/index.cjs");
const { ask } = require("../lib/ask/index.cjs");

function main() {
  clearWiki2Cache();
  const index = buildWiki2Index();
  assert.ok(index.page_count >= 70, `page_count=${index.page_count} expect>=70`);
  assert.ok(fs.existsSync(wiki2IndexPath()));

  const hit = retrieveWiki2("宁玉有什么特点", { topK: 3 });
  assert.equal(hit.mode, "wiki2");
  assert.ok(hit.hits.length >= 1);
  assert.ok(String(hit.hits[0].title + hit.hits[0].speak).includes("宁玉"));
  assert.ok(hit.ms < 200, `期望 <200ms，实际 ${hit.ms}`);

  const empty = retrieveWiki2("火星温室种香蕉亩产多少", { topK: 3 });
  // 可能有弱命中；若正分为空则必须 wiki2-empty
  if (!empty.hits.length) assert.equal(empty.mode, "wiki2-empty");

  const a = ask("宁玉适不适合大棚", { writeGap: false, session: false });
  assert.ok(["faq", "wiki", "wiki2"].includes(a.layer));
  assert.ok(/宁玉|大棚|设施/.test(a.reply));

  console.log(
    JSON.stringify(
      {
        ok: true,
        page_count: index.page_count,
        hitTitle: hit.hits[0].title,
        hitScore: hit.hits[0].score,
        ms: hit.ms,
        askLayer: a.layer
      },
      null,
      2
    )
  );
}

main();
