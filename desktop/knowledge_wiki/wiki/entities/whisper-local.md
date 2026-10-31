---
id: ent_whisper_local
title: 本地 Whisper 外挂 ASR
type: entity
status: active
confidence: 0.94
last_updated: 2026-10-31T12:00:00Z
aliases: ["Whisper", "HOST_ASR_MODE=local", "whisper.cpp"]
links_to: ["[[dec_vad_gate]]", "[[dec_audio_dual_track]]"]
---

## [1] AI-First Snapshot (会中实时注入区 - 严控 100 字内)
- **当前生效结论**：`HOST_ASR_MODE=local` 走外挂 server/CLI，不绑 Electron native whisper addon；转写后 `glossaryCorrect`。
- **核心红线**：禁止引入绑定当前 Electron ABI 的 whisper native addon。

## [2] Active Claims (当前有效事实)
- **[CLAIM-01]** 后端优先 `WHISPER_SERVER_URL`，否则 `WHISPER_BIN`+`WHISPER_MODEL`。
  - `valid_from`: 2026-10-31 | `invalid_at`: null | `confidence`: 0.94
  - `source`: [[raw/episodes/wave-a-whisper#turn-1]]

## [3] Superseded & Failure Paths (已淘汰方案 - 严禁直接删除)
- ~~**[SUPERSEDED-01]** Electron 内嵌 native whisper。~~
  - `valid_from`: 2026-09-01 | `invalid_at`: 2026-10-31
  - `superseded_by`: `[CLAIM-01]`
  - `reason_for_rejection`: ABI/打包成本不可接受（ADR-003）。
