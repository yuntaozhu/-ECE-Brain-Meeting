# ADR 015 — Wave Q：副驾驶 topic/fact 净化 + 总结噪声过滤

## 背景

`bridge-2026-11-02` 与实机截图显示：Option A/B/C 把整句 ASR（「你总结完了吗」「反应速度…就是」）和开场白塞进模板；会中总结把天气/测麦元对话堆进「您问过」口播；「总结完了吗」再次全文复读。

## 决策

1. **Copilot**：`extractCopilotTopic` / `classifySegmentKind` / `isUsableFact`（规则在 `copilot-gate.json`）。ACK / NOISE / SUMMARY_DONE 默认不出卡；无合格 fact 时只用 generic，禁止 `push_forward_with_fact` 灌脏句。
2. **总结**：`summaryNoiseAsk` 过滤回顾列表；`SUMMARY_STATUS`（总结完了吗）只回短状态句；LLM 总结提示忽略测麦/天气。
3. 不改 `decideSpeak` 主链；业务词只进 schema。

## 验收

`npm run smoke:wave-q`
