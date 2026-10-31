---
id: dec_example
title: 示例决策页标题
type: architecture_decision
status: active
confidence: 0.9
last_updated: 2026-10-31T00:00:00Z
aliases: ["别名1", "别名2"]
links_to: ["[[ent_example]]"]
---

## [1] AI-First Snapshot (会中实时注入区 - 严控 100 字内)
- **当前生效结论**：一句话结论。
- **核心红线**：禁止事项。

## [2] Active Claims (当前有效事实)
- **[CLAIM-01]** 断言正文。
  - `valid_from`: 2026-10-31 | `invalid_at`: null | `confidence`: 0.9
  - `source`: [[raw/episodes/example#turn-1]]

## [3] Superseded & Failure Paths (已淘汰方案 - 严禁直接删除)
- ~~**[SUPERSEDED-01]** 旧方案描述。~~
  - `valid_from`: 2026-09-01 | `invalid_at`: 2026-10-31
  - `superseded_by`: `[CLAIM-01]`
  - `reason_for_rejection`: 被否决原因。
