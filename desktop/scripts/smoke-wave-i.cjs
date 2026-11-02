/**
 * Wave I 冒烟：smartClip + refine 开关 / 无 Key 优雅降级 / instant stage。
 */
"use strict";

const assert = require("assert");
const { smartClip } = require("../lib/copilot/suggestClip.cjs");
const {
  buildCopilotPacket,
  shouldRefineCopilot,
  refineCopilotPacketAsync,
  clearPrefetch,
  resetTriggerMode
} = require("../lib/copilot/index.cjs");

// smartClip：标点优先
assert.strictEqual(smartClip("短句。", 60), "短句。");
const long =
  "关于收费，历史已否决必须向每个家庭强制收二百五十元，建议先对齐边界与代价，再拍板推进。";
const clipped = smartClip(long, 40);
assert.ok(clipped.length <= 40, `len=${clipped.length}`);
assert.ok(!clipped.endsWith("二") && !clipped.endsWith("百"), `no mid-word: ${clipped}`);
assert.ok(/[。；，、…]/.test(clipped) || clipped.endsWith("…"), `punct or ellipsis: ${clipped}`);

clearPrefetch?.();
resetTriggerMode?.();
process.env.COPILOT_TRIGGER_MODE = "auto";
resetTriggerMode?.();

const pkt = buildCopilotPacket("双通道 ASR 和 VAD 门控方案怎么看？能不能混轨？", {
  agenda: "Wave I",
  force: true
});
assert.ok(pkt.should_trigger);
assert.strictEqual(pkt.stage, "instant");
assert.strictEqual(pkt.refined, false);
assert.ok(pkt.suggestions?.push_forward);

const prev = process.env.COPILOT_LLM_REFINE;
process.env.COPILOT_LLM_REFINE = "0";
assert.strictEqual(shouldRefineCopilot({ force: false }), false);
assert.strictEqual(shouldRefineCopilot({ force: true }), true);
process.env.COPILOT_LLM_REFINE = "1";
assert.strictEqual(shouldRefineCopilot({ force: false }), true);
process.env.COPILOT_LLM_REFINE = "auto";
assert.strictEqual(shouldRefineCopilot({}), true);
if (prev == null) delete process.env.COPILOT_LLM_REFINE;
else process.env.COPILOT_LLM_REFINE = prev;

async function main() {
  const ac = new AbortController();
  const res = await refineCopilotPacketAsync(pkt, {
    agenda: "Wave I",
    signal: ac.signal,
    timeoutMs: 2000
  });
  // 无 Key 时 ok:false；有 Key 也可能成功——两种都可接受
  assert.ok(res && typeof res.ok === "boolean");
  if (!res.ok) {
    assert.ok(
      ["no_api_key", "no_model_endpoint", "resolve_failed", "aborted", "empty", "parse_failed"].includes(
        res.error
      ) || res.error,
      `error=${res.error}`
    );
  } else {
    assert.strictEqual(res.packet.stage, "refined");
    assert.strictEqual(res.packet.refined, true);
  }

  // abort 路径
  const ac2 = new AbortController();
  ac2.abort();
  const aborted = await refineCopilotPacketAsync(pkt, { signal: ac2.signal });
  assert.strictEqual(aborted.ok, false);
  assert.strictEqual(aborted.error, "aborted");

  console.log(
    JSON.stringify(
      {
        ok: true,
        smartClip: clipped,
        stage: pkt.stage,
        refineWithoutKeyOrOk: res.ok,
        refineError: res.error || null,
        abortOk: aborted.error === "aborted"
      },
      null,
      2
    )
  );

  resetTriggerMode?.();
  delete process.env.COPILOT_TRIGGER_MODE;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
