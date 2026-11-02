# ADR 014 — Wave M：口播信道解耦 + Option C 模式族

## 背景

实机暴露三类同构问题：Deep Dive / 试播把「历史已否决」「可参考 FAQ」「可反问」念进会场；Option C 万金油「对方最关心的成功标准」；问「一年多少盈利」却命中落地准备卡。

## 决策

按问题类治理，不按截图打补丁：

1. **类 A 口播信道**：`speakable` / `internal` / `evidence`；`sanitizeSpeakText` 读 `copilot-gate.speakSanitize`；`host:speak` 出口强制清洗；Deep Dive 试播只绑 `speakable`。
2. **类 B 槽位**：FAQ 补盈利金额同义问；落地 Q 弱化裸「加入全园美语」；`slot-ontology` 增 `PROFIT_AMOUNT`；intent `profit-amount`，rollout `unless` 盈利类。
3. **Option C 模式族**：`counterPatterns` 按题选型（`price_tradeoff` / `metric_clarify` / …）；`refine` 专治 C，约束「您」、禁止「对方」与成功标准套话。

## 后果

- 改 schema / FAQ 后需重启 `npm run desktop`。
- 全量精炼仍受 `COPILOT_LLM_REFINE` 控制；instant 多模板不依赖 LLM 即可脱出打折万金油。
- 不重写 `decideSpeak`；业务词只在 schema/FAQ。

## 验收

`npm run smoke:wave-m`
