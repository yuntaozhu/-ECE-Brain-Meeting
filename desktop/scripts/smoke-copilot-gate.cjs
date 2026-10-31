/**
 * 副驾驶意图门控 + 建议卡冒烟（纯 Node，不启 Electron）。
 *   node scripts/smoke-copilot-gate.cjs
 */
const {
  classifyCopilotIntent,
  buildCopilotPacket
} = require("../lib/copilot/index.cjs");

const cases = [
  { text: "哈哈没事了", expectCat: "CHITCHAT", expectTrigger: false },
  { text: "全园美语是什么？", expectCat: "DIRECT_QUESTION", expectTrigger: true },
  { text: "你们觉得这个方案怎么推进？", expectCat: "OPINION_SEEKING", expectTrigger: true },
  { text: "接下来给大家同步一下本周进度", expectCat: "INFORMATION_SHARING", expectTrigger: false },
  { text: "怎么收费？贵不贵？", expectCat: "DIRECT_QUESTION", expectTrigger: true }
];

let pass = 0;
let fail = 0;

for (const c of cases) {
  const g = classifyCopilotIntent(c.text);
  const okCat = g.category === c.expectCat;
  const okTrig = g.should_trigger === c.expectTrigger;
  if (okCat && okTrig) {
    pass += 1;
    console.log("PASS", c.text, "→", g.category, "trigger=", g.should_trigger);
  } else {
    fail += 1;
    console.log(
      "FAIL",
      c.text,
      "got",
      g.category,
      g.should_trigger,
      "want",
      c.expectCat,
      c.expectTrigger
    );
  }
}

const pkt = buildCopilotPacket("全园美语是什么？\n怎么收费？", {
  agenda: "全园美语教研会"
});
if (pkt.should_trigger && pkt.suggestions?.push_forward) {
  pass += 1;
  console.log("PASS packet suggestions", {
    category: pkt.category,
    A: pkt.suggestions.push_forward.slice(0, 40),
    faq: pkt.faq_title
  });
} else {
  fail += 1;
  console.log("FAIL packet", pkt);
}

console.log(`\ncopilot-gate smoke: ${pass} pass, ${fail} fail`);
process.exit(fail ? 1 : 0);
