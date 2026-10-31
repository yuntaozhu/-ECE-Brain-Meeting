"use strict";

/**
 * Wave A 冒烟：glossary + vadGate（不依赖 Whisper binary）。
 * 用法：node scripts/smoke-wave-a.cjs
 */
const assert = require("assert");
const path = require("path");

const { glossaryCorrect, loadRules } = require("../lib/asr/glossaryCorrect.cjs");
const { createVadGate, frameRms } = require("../lib/asr/vadGate.cjs");

function tone(freqHz, ms, amp = 0.25) {
  const n = Math.floor((16000 * ms) / 1000);
  const out = new Int16Array(n);
  for (let i = 0; i < n; i++) {
    out[i] = Math.max(
      -32767,
      Math.min(32767, Math.sin((2 * Math.PI * freqHz * i) / 16000) * amp * 32767)
    );
  }
  return out;
}

function silence(ms) {
  return new Int16Array(Math.floor((16000 * ms) / 1000));
}

function main() {
  const rules = loadRules();
  assert.ok(rules.length >= 1, "glossary rules empty");
  assert.strictEqual(glossaryCorrect("达智你好"), "大智你好");
  assert.strictEqual(glossaryCorrect("用 VBCable 采集"), "用 VB-Cable 采集");

  process.env.VAD_BACKEND = "energy";
  const vad = createVadGate({
    rmsSpeech: 0.02,
    silenceMs: 300,
    minSpeechMs: 200,
    maxUtterMs: 5000
  });
  assert.strictEqual(vad.backend, "energy");

  let flushed = null;
  // 约 40ms 帧
  for (let i = 0; i < 12; i++) {
    const hit = vad.push(tone(220, 40, 0.3));
    if (hit.flush) flushed = hit;
  }
  assert.ok(frameRms(tone(220, 40, 0.3)) > 0.02, "tone rms");
  for (let i = 0; i < 12; i++) {
    const hit = vad.push(silence(40));
    if (hit.flush) flushed = hit;
  }
  assert.ok(flushed && flushed.pcm && flushed.pcm.length > 0, "expected silence flush");
  assert.ok(["silence", "forced_silence"].includes(flushed.why || flushed.flush));

  console.log(
    JSON.stringify(
      {
        ok: true,
        glossaryRules: rules.length,
        vadBackend: vad.backend,
        flushWhy: flushed.why || flushed.flush,
        pcmSamples: flushed.pcm.length,
        glossaryPath: path.join("dev_knowledge", "glossary", "project_terms.json")
      },
      null,
      2
    )
  );
}

main();
