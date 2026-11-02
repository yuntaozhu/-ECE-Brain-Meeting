/**
 * 工程讨论线索 → 可选 Mermaid 草稿（旁路展示，不进口播）。
 * 模式来自 knowledge/schema/copilot-gate.json。
 */
const { schemaStore } = require("../knowledge");

function rx(name) {
  return schemaStore.rx("copilot", name);
}

function detectMermaidHint(text) {
  const t = String(text || "");
  if (!rx("mermaidArch").test(t)) return null;
  if (rx("mermaidDualTrack").test(t)) {
    return [
      "flowchart LR",
      "  Me[Me 本机麦] --> LabelMe[role=me]",
      "  Others[Others 系统/CABLE] --> LabelOt[role=others]",
      "  LabelOt --> ASR[策略 ASR]",
      "  LabelMe --> Cmd[口令/标定]",
      "  ASR --> Decide[decideSpeak]",
      "  Decide --> TTS[Host TTS]"
    ].join("\n");
  }
  if (rx("mermaidVadWhisper").test(t)) {
    return [
      "flowchart LR",
      "  PCM[PCM 16k] --> VAD{vadGate}",
      "  VAD -->|speech| Whisper[Local Whisper]",
      "  VAD -->|silence| Drop[Drop]",
      "  Whisper --> Gloss[glossaryCorrect]",
      "  Gloss --> UI[转写/策略]"
    ].join("\n");
  }
  if (rx("mermaidFlow").test(t) || rx("mermaidArch").test(t)) {
    return [
      "flowchart TD",
      "  A[转写] --> B[meetingSession]",
      "  B --> C[知识库召回]",
      "  C --> D[decideSpeak]",
      "  D --> E[TTS]"
    ].join("\n");
  }
  return null;
}

module.exports = { detectMermaidHint };
