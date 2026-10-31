"use strict";

/**
 * Wave C 冒烟：Catch Me Up / Jot / Mermaid / bridge（无 Electron 截屏）。
 */
const assert = require("assert");
const fs = require("fs");
const {
  buildCatchMeUp,
  appendJot,
  listJots,
  expandJots,
  detectMermaidHint,
  readBridge,
  clearPrefetch
} = require("../lib/copilot/index.cjs");

clearPrefetch?.();

const transcript = [
  "会场: 我们讨论一下双通道 ASR 和 Whisper 的架构怎么切",
  "会场: 我担心延迟和配额风险，不同意现在全切本地",
  "会场: 那要不要先拍板保留豆包云端，本地做旁路？",
  "会场: 下一步谁负责 VAD 门控验收？"
].join("\n");

const recap = buildCatchMeUp(transcript, { agenda: "桌面端升级", windowMs: 10 * 60 * 1000 });
assert.ok(recap.digest.includes("【当前议题】"), "digest");
assert.ok(recap.disagreements.length >= 1, "disagreements");
assert.ok(recap.pending_decisions.length >= 1, "decisions");
assert.ok(recap.mermaid_diagram && /flowchart/.test(recap.mermaid_diagram), "mermaid");

const jot = appendJot("网关超时 -> 改异步队列", { meetingId: "smoke_wave_c" });
assert.ok(jot.ok, "jot");
const listed = listJots("smoke_wave_c", 10);
assert.ok(listed.some((j) => /异步队列/.test(j.text)), "list jots");

const expanded = expandJots("smoke_wave_c", transcript);
assert.ok(expanded.ok && /Quick Jots/.test(expanded.markdown), "expand");

const hint = detectMermaidHint("本地 Whisper 要配合 VAD 静音门控");
assert.ok(hint && /VAD/.test(hint), "mermaid hint");

const bridge = readBridge();
assert.ok(bridge.updatedAt, "bridge updated");

console.log(
  JSON.stringify(
    {
      ok: true,
      topic: recap.current_topic,
      disagreements: recap.disagreements.length,
      decisions: recap.pending_decisions.length,
      jotCount: listed.length,
      bridgeKeys: Object.keys(bridge),
      mcpScript: fs.existsSync(require("path").join(__dirname, "meeting-context-mcp.cjs"))
    },
    null,
    2
  )
);
