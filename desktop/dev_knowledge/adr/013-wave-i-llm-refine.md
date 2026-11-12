# ADR-013 Wave I：smartClip + 两阶段建议卡精炼

## 背景

建议卡 `clip` 易切半截词；模板句生硬。需在不改 `decideSpeak` 的前提下提升扫视质量。

## 决策

1. `smartClip`：在 `[0.65n, n]` 区间优先按 `。！？；，、` 等断句。
2. 第 1 阶段同步推送 `stage:"instant"` 模板卡；若 `COPILOT_LLM_REFINE=1|auto` 或 Push-to-Ask `force`，后台 `refineCopilotPacketAsync` 调豆包，成功后广播 `stage:"refined"`。
3. 新巡检 `AbortController` 取消旧精炼；无 Key 时静默保留 instant。

## 后果

- UI 显示「精炼中…」→「✨ AI 已精炼」。
- 默认 `COPILOT_LLM_REFINE=0` 时仅手动出卡尝试精炼（有 Key 才成功）。

## 补丁（Wave R Phase 5）

- 精炼走 `channel:"copilot"`：`COPILOT_LLM_MODEL`（推荐 `doubao-seed-evolving` / `ep-`），不污染 Host `DOUBAO_CHAT_MODEL`。
- `COPILOT_LLM_THINKING` 默认 `disabled`，请求带 `thinking.type=disabled`。
- 与 ADR-017 的 SpeakDraft 对齐：已 `aligned` 可跳过 refine；refine 时事实锁 Draft/Evidence。
