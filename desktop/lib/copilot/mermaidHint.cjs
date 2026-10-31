/**
 * 工程讨论线索 → 可选 Mermaid 草稿（旁路展示，不进口播）。
 */
const ARCH_RE =
  /(架构|微服务|调用链|状态机|流水线|双通道|ASR|TTS|Whisper|VAD|decideSpeak|IPC|主进程|渲染)/i;
const FLOW_RE = /(流转|流程|状态转移|从.+到|先.+再)/;

function detectMermaidHint(text) {
  const t = String(text || "");
  if (!ARCH_RE.test(t)) return null;
  if (/双通道|Me|Others|内录|CABLE/i.test(t)) {
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
  if (/Whisper|VAD|静音/i.test(t)) {
    return [
      "flowchart LR",
      "  PCM[PCM 16k] --> VAD{vadGate}",
      "  VAD -->|speech| Whisper[Local Whisper]",
      "  VAD -->|silence| Drop[Drop]",
      "  Whisper --> Gloss[glossaryCorrect]",
      "  Gloss --> UI[转写/策略]"
    ].join("\n");
  }
  if (FLOW_RE.test(t) || ARCH_RE.test(t)) {
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
