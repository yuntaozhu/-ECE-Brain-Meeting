# ADR-004：Speculative RAG + Auto/Manual 触发

## 背景

Phase 2 / Wave B：副驾驶建议卡已有意图门控与 Option A/B/C，但句尾才检索会拉长 TTFT；嘈杂会场下 Auto 易误触发。

## 试过什么

1. **每句都调 LLM 生成建议**：成本高、刷屏。
2. **仅句尾 `matchFaqInstant`**：正确但首包慢。
3. **只靠自动门控、无手动出口**：吵会场无法压制。

## 决策

- **Speculative prefetch**（`lib/copilot/prefetch.cjs`）：Others 连续发言 ≥约 3s 且命中疑问/技术线索时，后台预热 FAQ/`retrieveKnowledge`；句尾出卡优先用缓存 evidence。
- **Hybrid trigger**：`triggerMode=auto|manual`（schema / `COPILOT_TRIGGER_MODE` / 运行时切换）。
  - Auto：意图门控 `should_trigger` 出卡。
  - Manual：门控结果仅作「待命」；`force`（Alt+Z / Push-to-Ask）才出卡，窗口约 60s 转写。
- 快捷键：`Alt+Z` Push-to-Ask；`Alt+Shift+Z` 切换模式。仍 **不** 进入 `decideSpeak`。

## 后果

- 预检索命中依赖 FAQ/索引质量；无命中时模板仍可出卡。
- Manual 模式下用户需主动按键；UI 显示「待命」提示。
