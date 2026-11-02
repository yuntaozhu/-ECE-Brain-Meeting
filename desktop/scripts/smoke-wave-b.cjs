"use strict";

/**
 * Wave B 冒烟：prefetch + manual/auto 模式（纯 Node）。
 *   node scripts/smoke-wave-b.cjs
 */
const assert = require("assert");
const {
  classifyCopilotIntent,
  buildCopilotPacket,
  noteOthersForPrefetch,
  onOthersPartialAsr,
  takePrefetch,
  clearPrefetch,
  setTriggerMode,
  resetTriggerMode,
  resolveTriggerMode
} = require("../lib/copilot/index.cjs");

clearPrefetch();
resetTriggerMode();

const q = "全园美语是什么？怎么收费？";
const gate = classifyCopilotIntent(q);
assert.strictEqual(gate.should_trigger, true, "gate should trigger on question");

// 流式 partial 真预热：同一次进程内 speakingMs 不再恒为 0
process.env.COPILOT_TRIGGER_MODE = "auto";
resetTriggerMode();
clearPrefetch();
const partial = onOthersPartialAsr("全园美语是什么怎么收费值不值得上");
assert.ok(!partial.skipped || partial.reason === "throttled", "partial prefetch attempted");
// 立即再调应节流
const throttled = onOthersPartialAsr("全园美语是什么怎么收费值不值得上继续说");
assert.strictEqual(throttled.reason, "throttled", "600ms throttle");

clearPrefetch();
for (let i = 0; i < 3; i++) {
  noteOthersForPrefetch(`园长问：${q}`);
}
const pre = takePrefetch(q);
assert.ok(pre, "prefetch cache should exist after cue notes");

const autoPkt = buildCopilotPacket(q, { agenda: "教研会", skipPrefetch: false });
assert.strictEqual(autoPkt.trigger_mode, "auto");
assert.strictEqual(autoPkt.should_trigger, true);
assert.ok(autoPkt.suggestions?.push_forward, "auto suggestions");

setTriggerMode("manual");
const held = buildCopilotPacket(q, { agenda: "教研会" });
assert.strictEqual(held.trigger_mode, "manual");
assert.strictEqual(held.should_trigger, false, "manual holds auto trigger");
assert.strictEqual(held.held_for_manual, true);

const forced = buildCopilotPacket(q, { agenda: "教研会", force: true });
assert.strictEqual(forced.should_trigger, true, "force overrides manual");
assert.ok(forced.suggestions?.push_forward);

resetTriggerMode();
delete process.env.COPILOT_TRIGGER_MODE;

console.log(
  JSON.stringify(
    {
      ok: true,
      mode: resolveTriggerMode(),
      prefetchFaq: pre?.faq?.title || null,
      autoCat: autoPkt.category,
      manualHeld: held.held_for_manual,
      forceOk: forced.should_trigger
    },
    null,
    2
  )
);
