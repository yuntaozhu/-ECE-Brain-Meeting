/**
 * Wave H 冒烟：partial 预热、VAD pre-roll、appPaths 导出。
 */
"use strict";

const assert = require("assert");
const {
  onOthersPartialAsr,
  clearPrefetch,
  takePrefetch,
  prefetchStatus
} = require("../lib/copilot/prefetch.cjs");
const { createVadGate } = require("../lib/asr/vadGate.cjs");
const {
  wiki2ReadRoot,
  wiki2WriteRoot,
  glossaryPath,
  sessionLogsWriteDir,
  isPackagedApp
} = require("../lib/platform/appPaths.cjs");
const fs = require("fs");

clearPrefetch();
const r1 = onOthersPartialAsr("双通道音频和 VAD 方案怎么选型");
assert.ok(typeof r1.skipped === "boolean");
assert.ok(r1.speakingMs == null || r1.speakingMs >= 0);
// 等待超过节流后再灌一次，应能写入 cache（线索充足）
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  await wait(650);
  clearPrefetch();
  const r2 = onOthersPartialAsr("双通道音频和 VAD 门控方案怎么看能不能混轨");
  assert.strictEqual(r2.skipped, false, `partial should prefetch: ${JSON.stringify(r2)}`);
  const cache = takePrefetch("双通道音频和 VAD");
  assert.ok(cache || prefetchStatus().hasCache, "cache after partial");

  const vad = createVadGate({
    rmsSpeech: 0.05,
    silenceMs: 250,
    minSpeechMs: 120,
    preRollMs: 200
  });
  const weak = new Int16Array(640); // 40ms @16k, near silence
  const loud = new Int16Array(640);
  for (let i = 0; i < loud.length; i++) loud[i] = 12000;
  for (let i = 0; i < 6; i++) vad.push(weak);
  assert.ok(vad.snapshot().preRollFrames >= 1, "preroll buffering");
  for (let i = 0; i < 6; i++) vad.push(loud);
  let flush = null;
  const silence = new Int16Array(640);
  for (let i = 0; i < 10; i++) {
    const hit = vad.push(silence);
    if (hit.flush) flush = hit;
  }
  assert.ok(flush?.pcm?.length > 640 * 6, "preroll merged into utterance");

  assert.ok(fs.existsSync(wiki2ReadRoot()) || fs.existsSync(wiki2WriteRoot()), "wiki2 root");
  assert.ok(fs.existsSync(glossaryPath()), "glossary");
  assert.ok(sessionLogsWriteDir(), "session logs dir");
  assert.strictEqual(isPackagedApp(), false);

  console.log(
    JSON.stringify(
      {
        ok: true,
        partialCached: Boolean(cache),
        prerollFrames: vad.snapshot().preRollFrames,
        pcm: flush.pcm.length,
        glossary: glossaryPath().endsWith("project_terms.json"),
        wiki2: wiki2WriteRoot()
      },
      null,
      2
    )
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
