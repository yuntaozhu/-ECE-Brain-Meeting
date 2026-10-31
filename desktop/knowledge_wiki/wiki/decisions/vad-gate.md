---
id: dec_vad_gate
title: ASR 前置 VAD 门控
type: architecture_decision
status: active
confidence: 0.96
last_updated: 2026-10-31T12:00:00Z
aliases: ["VAD", "静音门控", "Silero", "能量 VAD", "vadGate"]
links_to: ["[[ent_whisper_local]]", "[[dec_audio_dual_track]]"]
---

## [1] AI-First Snapshot (会中实时注入区 - 严控 100 字内)
- **当前生效结论**：本地 Whisper 前必须经 `vadGate`（默认能量 VAD；Silero 可选）；连续静音勿盲送推理。
- **核心红线**：禁止固定时长切窗盲送 Whisper；禁止无尾静音的碎切。

## [2] Active Claims (当前有效事实)
- **[CLAIM-01]** `lib/asr/vadGate.cjs`：RMS + 最短语段 + 尾静音 + 最长语段；`VAD_BACKEND=auto|energy|silero`。
  - `valid_from`: 2026-10-31 | `invalid_at`: null | `confidence`: 0.96
  - `source`: [[raw/episodes/wave-a-vad#turn-1]]
- **[CLAIM-02]** Silero 为可选依赖，未安装时自动降级能量 VAD，冒烟不硬失败。
  - `valid_from`: 2026-10-31 | `invalid_at`: null | `confidence`: 0.9
  - `source`: [[raw/episodes/wave-a-vad#turn-2]]

## [3] Superseded & Failure Paths (已淘汰方案 - 严禁直接删除)
- ~~**[SUPERSEDED-01]** 前端 `setInterval` 每 3 秒切 WebM 直传 Whisper。~~
  - `valid_from`: 2026-09-01 | `invalid_at`: 2026-10-31
  - `superseded_by`: `[CLAIM-01]`
  - `reason_for_rejection`: 边界吞字；静音期幻觉与重复计费。
