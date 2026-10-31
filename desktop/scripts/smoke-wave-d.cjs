"use strict";

/**
 * Wave D 冒烟：Deep Dive + Mermaid 解析友好结构 + OCR 开关探测。
 */
const assert = require("assert");
const {
  buildCopilotPacket,
  buildDeepDive,
  detectMermaidHint,
  ocrEnabled,
  resetTriggerMode,
  setTriggerMode
} = require("../lib/copilot/index.cjs");

resetTriggerMode();
setTriggerMode("auto");

const pkt = buildCopilotPacket("双通道 ASR 和 Whisper 的架构怎么切？VAD 怎么门控？", {
  agenda: "Wave D",
  force: true
});
assert.ok(pkt.should_trigger, "trigger");
assert.ok(pkt.deep_dive?.speak_script, "deep dive");
assert.ok(pkt.mermaid_diagram && /flowchart/.test(pkt.mermaid_diagram), "mermaid on packet");

const dive = buildDeepDive(pkt);
assert.ok(dive.bullets.length >= 2, "bullets");

const hint = detectMermaidHint("先说流水线从转写到 decideSpeak 再 TTS");
assert.ok(hint, "hint");

// mermaidView 是 ESM；这里用等价解析自检节点边
const src = pkt.mermaid_diagram;
assert.ok(/-->/.test(src), "edges");

console.log(
  JSON.stringify(
    {
      ok: true,
      deepDiveChars: dive.speak_script.length,
      mermaidLines: src.split("\n").length,
      ocrEnabledDefault: ocrEnabled(),
      note: "OCR 需 SCREEN_OCR=1 且 Windows OCR 语言包"
    },
    null,
    2
  )
);

resetTriggerMode();
