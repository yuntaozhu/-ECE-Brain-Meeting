# ADR-002：意图门控与 VAD

## 背景

本地 Whisper（及云端 ASR）对静音/噪声段计费或占 GPU。连续静音若盲目送推理，延迟与假转写上升。副驾驶旁路也需要「像不像在提问」的轻量门控，避免每句都打 LLM。

## 试过什么

1. **固定时长切窗盲送 Whisper**：静音窗产生空/幻觉文本。
2. **仅靠 RMS 阈值、无尾静音**：切句过碎或拖尾。
3. **副驾驶每句调 LLM**：成本高、建议卡刷屏。

## 决策

- **ASR 端点**：`lib/asr/vadGate.cjs` — 优先可选 Silero（`onnxruntime-node` + 模型路径），否则 **能量 VAD**（RMS + 最短语段 + 尾静音 + 最长语段）。
- **本地 Whisper**：`LocalWhisperSession.appendPcmBase64` 只在 VAD 判为语段结束后才 `_transcribePcm`。
- **副驾驶**：schema 意图门（`knowledge/schema/copilot-intent.json` + `lib/copilot`）；不进 `decideSpeak`。
- 环境变量：`VAD_BACKEND=auto|energy|silero`（默认 `auto`）。

## 后果

- Silero 为可选依赖，未安装时自动降级能量 VAD，冒烟不硬失败。
- 门控阈值调参放 env / schema，不在业务词补丁里改。
