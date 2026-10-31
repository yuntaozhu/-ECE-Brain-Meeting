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

// 模拟连续发言：缩短阈值靠多次 note
process.env.COPILOT_TRIGGER_MODE = "auto";
resetTriggerMode();
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
