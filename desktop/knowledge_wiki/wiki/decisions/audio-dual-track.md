---
id: dec_audio_dual_track
title: 桌面端双通道音频采集
type: architecture_decision
status: active
confidence: 0.95
last_updated: 2026-10-31T12:00:00Z
aliases: ["双通道", "双声道", "Me Others", "VB-Cable", "内录", "Loopback"]
links_to: ["[[ent_whisper_local]]", "[[dec_vad_gate]]"]
---

## [1] AI-First Snapshot (会中实时注入区 - 严控 100 字内)
- **当前生效结论**：Others 用 CABLE Output 或 displayMedia 系统内录，Me 用本机麦；策略 ASR 只吃 Others，禁止混轨。
- **核心红线**：严禁送入策略前混成单轨；缺 Others 须提示，勿静默改成只听麦。

## [2] Active Claims (当前有效事实)
- **[CLAIM-01]** Windows 以 VB-Cable / `getDisplayMedia` 代理系统内录，Electron 暂无原生 WASAPI 内核 Loopback。
  - `valid_from`: 2026-10-31 | `invalid_at`: null | `confidence`: 0.95
  - `source`: [[raw/episodes/wave-a-dual-track#turn-1]]
- **[CLAIM-02]** Me 轨仅口令与转写标定，不进入口播策略主链。
  - `valid_from`: 2026-10-31 | `invalid_at`: null | `confidence`: 0.92
  - `source`: [[raw/episodes/wave-a-dual-track#turn-2]]

## [3] Superseded & Failure Paths (已淘汰方案 - 严禁直接删除)
- ~~**[SUPERSEDED-01]** 单轨混音后再 ASR。~~
  - `valid_from`: 2026-09-01 | `invalid_at`: 2026-10-31
  - `superseded_by`: `[CLAIM-01]`
  - `reason_for_rejection`: 无法区分说话人，口令与巡检互相污染，易自激。
