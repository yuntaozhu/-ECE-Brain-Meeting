# ADR-022 · 审定库缺口的 LLM 参考答复

| 项 | 内容 |
|----|------|
| 状态 | Accepted |
| 日期 | 2026-11-23 |
| 产品 | xiaoxing |

## 背景

Ask 在 FAQ/Wiki/行情均未命中时一律 `layer=gap`，口播「审定库没有足够依据」。产品希望：**不必总是拒答式缺口话术**，可接入大模型补答，同时保留红线。

## 决策

1. **同步 `ask()`**：仍只走审定库（题库/冒烟确定性）；缺口话术保留为兜底。
2. **异步 `askAsync()`**：`gap` 且配置开启时调用方舟兼容 Chat；成功则 `layer=llm`，附 disclaimer「参考答复，非审定库口径」。
3. **实现位置**：`xiaoxing/lib/llm/*` + `lib/ask/llmFallback.cjs`；**禁止** `require` desktop 源码（同变量名 BYOK）。
4. **仍禁止 LLM**：`refuse`（用药剂量/产量承诺/补贴金额）；`onMarketMiss` 默认关闭（防编造价）。
5. **弱证据**：把 Wiki 弱候选口播/要点塞进 system，能引用则引用；无证据则谨慎常识 + 标明不确定。
6. **可观测**：LLM 成功也可写 inbox（`writeInboxOnLlm`），便于事后升格审定条。
7. **开关**：`schema/llm-ask.json` + `XIAOXING_LLM_ON_GAP`；无 key 时静默回落 gap。

## 接线

- Electron 会中 consult：gap → `askAsync(llm)`（`main.cjs`）
- HTTP `POST /ask`、语音 `voiceTurn`：默认 askAsync
- 微信回调暂同步 ask（后续可异步升级）

## 后果

- 有 key 时用户少听到「没对齐」；答案带参考声明，不等同审定 FAQ。
- 无 key / 超时 / 关开关：行为与旧版 gap 一致。
