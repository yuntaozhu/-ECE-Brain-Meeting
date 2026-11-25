#!/usr/bin/env node
const { ask } = require("../lib/ask/index.cjs");

const cases = [
  { q: "你是谁", expectLayer: ["identity", "faq"], has: /小星/ },
  { q: "宁玉有什么特点", expectLayer: ["faq", "wiki", "wiki2"], has: /宁玉/ },
  { q: "宁丰和宁玉有什么区别", expectLayer: ["faq", "wiki", "wiki2"], has: /宁丰|宁玉/ },
  { q: "京香草莓怎么样", expectLayer: ["faq", "wiki", "wiki2"], has: /京香/ },
  { q: "什么是脱毒苗", expectLayer: ["faq", "wiki", "wiki2"], has: /脱毒/ },
  { q: "上海哪里种草莓", expectLayer: ["faq", "wiki", "wiki2"], has: /上海|白鹤|金山/ },
  { q: "嘉定草莓怎么样", expectLayer: ["faq", "wiki", "wiki2"], has: /嘉定|红颜|越秀|申莓/ },
  { q: "上海草莓什么时候定植", expectLayer: ["faq", "wiki", "wiki2"], has: /定植|四段|旬报/ },
  { q: "草莓资料去哪查", expectLayer: ["faq", "wiki", "wiki2"], has: /园艺学会|农科院|入口/ },
  { q: "久香草莓怎么样", expectLayer: ["faq", "wiki", "wiki2"], has: /久香|上海/ },
  { q: "苏莓66有什么特点", expectLayer: ["faq", "wiki", "wiki2"], has: /苏莓|早熟/ },
  { q: "草莓打什么药治灰霉病剂量多少", expectLayer: ["refuse"], has: /不能|农技|编造/ },
  { q: "火星种草莓要施多少氮肥保证亩产八吨", expectLayer: ["refuse", "gap"], has: /不能|没有足够|农技|复盘/ }
];

let failed = 0;
for (const c of cases) {
  const r = ask(c.q, { writeGap: false, session: false });
  const layerOk = c.expectLayer.includes(r.layer);
  const textOk = c.has.test(r.reply || "");
  const moreOk =
    ["refuse"].includes(r.layer) ||
    (Array.isArray(r.moreQuestions) && r.moreQuestions.length >= 2);
  const ok = layerOk && textOk && moreOk;
  console.log(
    `${ok ? "PASS" : "FAIL"} [${r.layer}/${r.score}] ${c.q}` +
      (r.moreQuestions?.length ? ` · +${r.moreQuestions.length}问` : "")
  );
  if (!ok) {
    failed += 1;
    console.log("  got:", r.reply);
    console.log("  more:", r.moreQuestions);
  }
}

if (failed) {
  console.error(`smoke FAIL ${failed}/${cases.length}`);
  process.exit(1);
}
console.log(`smoke OK ${cases.length}/${cases.length}`);
