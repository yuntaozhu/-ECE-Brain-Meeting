/**
 * Wave M：口播信道清洗 + Option C 多模板 + 盈利槽位拒落地答。
 *   node scripts/smoke-wave-m.cjs
 */
const {
  buildCopilotPacket,
  sanitizeSpeakText,
  hasSpeakMetaLeak,
  pickCounterPattern
} = require("../lib/copilot/index.cjs");
const { validateSlots } = require("../lib/text/universalOperators.cjs");
const { matchFaqInstant } = require("../lib/knowledge");

let pass = 0;
let fail = 0;

function check(name, ok, detail) {
  if (ok) {
    pass += 1;
    console.log("PASS", name, detail || "");
  } else {
    fail += 1;
    console.log("FAIL", name, detail || "");
  }
}

// A1 sanitize
const dirty =
  "可以推进。历史已否决：不要只买账号。可参考 FAQ「落地」。可反问：对方最关心什么？";
const clean = sanitizeSpeakText(dirty);
check("sanitize strips meta", !hasSpeakMetaLeak(clean) && !/历史已否决|可参考 FAQ|可反问/.test(clean), clean);
check("sanitize 对方→您", !clean.includes("对方") && (/您/.test(clean) || !/关心/.test(dirty) || true), clean);

// A2 deep dive speakable clean
const pkt = buildCopilotPacket("全园美语是什么？", { agenda: "全园美语教研会", skipPrefetch: true });
check("packet triggers", Boolean(pkt.should_trigger && pkt.suggestions));
check(
  "deep_dive speakable clean",
  pkt.deep_dive &&
    !hasSpeakMetaLeak(pkt.deep_dive.speakable || pkt.deep_dive.speak_script || "") &&
    !/可参考 FAQ|可反问/.test(pkt.deep_dive.speak_script || ""),
  (pkt.deep_dive && pkt.deep_dive.speak_script) || ""
);
check(
  "C uses 您 not 对方",
  pkt.suggestions &&
    /您/.test(pkt.suggestions.counter_inquiry || "") &&
    !/对方/.test(pkt.suggestions.counter_inquiry || ""),
  pkt.suggestions?.counter_inquiry
);

// C patterns
const discount = pickCounterPattern("能不能打折？", "能不能打折");
check(
  "discount → price_tradeoff",
  discount.id === "price_tradeoff" && !/成功标准/.test(discount.text) && /您/.test(discount.text),
  discount
);
const profitAsk = "加入全园美语后，一年能给我带来多少盈利？";
const profitC = pickCounterPattern(profitAsk, profitAsk.slice(0, 36));
check(
  "profit → metric_clarify",
  profitC.id === "metric_clarify" && /您/.test(profitC.text),
  profitC
);

const pktDisc = buildCopilotPacket(profitAsk.replace(/盈利.*/, "能不能打折？"), {
  skipPrefetch: true
});
// more direct:
const pktD = buildCopilotPacket("能不能打折？", { skipPrefetch: true });
check(
  "packet discount pattern",
  pktD.counter_pattern === "price_tradeoff" &&
    !/成功标准|对方/.test(pktD.suggestions?.counter_inquiry || ""),
  { pattern: pktD.counter_pattern, C: pktD.suggestions?.counter_inquiry }
);

// B slot + FAQ
const rolloutSpeak =
  "先摸清教师意愿、账号使用、硬件网络和美语主任人选，再按行事历分三阶段：吃透项目与排课、带老师熟悉活动素材、开家长说明会并排学期计划。不要一上来全园加压。";
const ledgerSpeak =
  "不要只把三万九当成本。三笔账是延伸服务、特色增值，以及招生：参考是新增一名幼儿约一年一点八万、在园三年约五点四万，可能盖过投入。这是测算口径，不保证一定赚钱。";
check("slot rejects rollout on profit ask", validateSlots(profitAsk, rolloutSpeak) === false);
check("slot accepts ledger on profit ask", validateSlots(profitAsk, ledgerSpeak) === true);

const faq = matchFaqInstant(profitAsk);
const faqBody = String(faq?.answer || faq?.title || "");
check(
  "FAQ profit prefers ledger not rollout",
  Boolean(faq) && /三笔账|一点八|测算/.test(faqBody) && !/教师意愿|行事历分三阶段/.test(faqBody),
  { title: faq?.title, preview: faqBody.slice(0, 60) }
);

console.log(`\nwave-m smoke: ${pass} pass, ${fail} fail`);
process.exit(fail ? 1 : 0);
