---
id: dec_copilot_bypass
title: 副驾驶旁路不改 decideSpeak
type: architecture_decision
status: active
confidence: 0.98
last_updated: 2026-10-31T12:00:00Z
aliases: ["副驾驶", "smart-replies", "Push-to-Ask", "Speculative RAG", "Deep Dive"]
links_to: ["[[dec_audio_dual_track]]", "[[dec_vad_gate]]"]
---

## [1] AI-First Snapshot (会中实时注入区 - 严控 100 字内)
- **当前生效结论**：意图门控与 Option A/B/C、Deep Dive、Catch Me Up 走 `lib/copilot` 旁路 IPC；禁止整段重写 `decideSpeak`。
- **核心红线**：新坏例先进回归/schema/FAQ；知识库不决定开口。

## [2] Active Claims (当前有效事实)
- **[CLAIM-01]** Auto/Manual：`COPILOT_TRIGGER_MODE`；Alt+Z Push-to-Ask；Alt+Shift+Z 切换。
  - `valid_from`: 2026-10-31 | `invalid_at`: null | `confidence`: 0.95
  - `source`: [[raw/episodes/wave-b-copilot#turn-1]]
- **[CLAIM-02]** Speculative prefetch 预热 FAQ/知识块；Wave E 起优先注入 Wiki Snapshot。
  - `valid_from`: 2026-10-31 | `invalid_at`: null | `confidence`: 0.9
  - `source`: [[raw/episodes/wave-e-wiki2#turn-1]]

## [3] Superseded & Failure Paths (已淘汰方案 - 严禁直接删除)
- ~~**[SUPERSEDED-01]** 把副驾驶意图写进口播 `decideSpeak` 责任链。~~
  - `valid_from`: 2026-09-01 | `invalid_at`: 2026-10-31
  - `superseded_by`: `[CLAIM-01]`
  - `reason_for_rejection`: 违反架构宪法；口播与扫视建议职责混淆，回归成本高。
