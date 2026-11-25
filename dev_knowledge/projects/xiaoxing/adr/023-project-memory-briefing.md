# ADR-023 · 跨会主题记忆与开场前情

| 项 | 内容 |
|----|------|
| 状态 | Accepted |
| 日期 | 2026-11-24 |
| 产品 | xiaoxing |

## 决策

1. `knowledge/schema/project-memory.json` 定义主题关键词与助手模式说明。
2. 会后 `summarizeMeeting` 写入 `knowledge/sessions/index.json`（meetingId、topics、headline、todos/gaps）。
3. `startMeeting` 返回 `briefing` 文本卡；驾驶舱展示「小星·前情」气泡。
4. `assistantMode`：`content` | `host`（配置项，非专家人设包）。
5. D4：会中数字/审定/示范等线索 → `ingest_prompt`，提示可进 inbox。

## 非目标

不做跨设备云同步；不做角色包；TTS 前情后置。
