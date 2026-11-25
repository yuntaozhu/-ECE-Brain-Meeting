#!/usr/bin/env node
"use strict";

const assert = require("assert");
const { ask, askAsync, resolveAskSync } = require("../lib/ask/index.cjs");
const { tryLlmGapAnswer, llmAskEnabled, clearLlmAskCfgCache } = require("../lib/ask/llmFallback.cjs");

async function main() {
  clearLlmAskCfgCache();

  const coldQ = "XYZQWERTY999水培离子配方火星黑灯笼";

  // 1) 同步 ask 仍确定性：明显无库问题 → gap（不调网）
  const syncGap = ask(coldQ, { writeGap: false, session: false });
  assert.equal(syncGap.layer, "gap", `sync ask 应保持 gap，实际 ${syncGap.layer}`);

  // 2) 拒答不进 LLM
  const refuse = await askAsync("草莓打什么药治灰霉病剂量多少", {
    writeGap: false,
    session: false,
    live: false,
    llm: true
  });
  assert.equal(refuse.layer, "refuse");

  // 3) mock chat：gap → llm
  const mockChat = async () => ({
    ok: true,
    content: "这类配方与离子浓度不能口头编造，请对照正式水培规程或记待补库。",
    provider: "mock",
    model: "mock-1"
  });
  const llmHit = await askAsync(coldQ, {
    writeGap: false,
    session: false,
    live: false,
    llm: true,
    chatFn: mockChat
  });
  assert.equal(llmHit.layer, "llm");
  assert.ok(/规程|参考|补库|不能/.test(llmHit.reply), llmHit.reply);
  assert.ok(llmHit.sources.some((s) => String(s).startsWith("llm:")));

  // 4) llm 失败回落 gap
  const llmFail = await askAsync(coldQ, {
    writeGap: false,
    session: false,
    live: false,
    llm: true,
    chatFn: async () => ({ ok: false, error: "boom" })
  });
  assert.equal(llmFail.layer, "gap");

  // 5) opts.llm=false 跳过
  const skip = await askAsync(coldQ, {
    writeGap: false,
    session: false,
    live: false,
    llm: false,
    chatFn: mockChat
  });
  assert.equal(skip.layer, "gap");

  // 6) 直测 tryLlmGapAnswer
  const direct = await tryLlmGapAnswer("草莓灰霉病怎么预防（通识）", {
    candidates: [{ slug: "disease-botrytis", score: 10 }],
    chatFn: mockChat
  });
  assert.equal(direct.ok, true);
  assert.equal(direct.layer, "llm");

  // 7) FAQ 命中不调 LLM
  const faq = await askAsync("宁玉有什么特点", {
    writeGap: false,
    session: false,
    live: false,
    llm: true,
    chatFn: async () => {
      throw new Error("should not call llm");
    }
  });
  assert.equal(faq.layer, "faq");

  assert.ok(typeof llmAskEnabled("gap") === "boolean");
  assert.ok(resolveAskSync("").layer === "empty");

  console.log(
    JSON.stringify(
      {
        ok: true,
        syncGap: syncGap.layer,
        refuse: refuse.layer,
        llmHit: llmHit.layer,
        llmFail: llmFail.layer,
        skip: skip.layer,
        faq: faq.layer
      },
      null,
      2
    )
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
