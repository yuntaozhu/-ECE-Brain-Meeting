# ADR-006：会场旁路建议（不占麦）

## 背景

会场 Others 问到农服口径内问题时，小星应提示可答内容，但默认不得自动口播抢麦。

## 决策

1. `schema/copilot-gate.json` + `lib/meeting/suggest.cjs`：仅 Others 疑似问句触发 `suggestSilent`。  
2. `handle` 返回 `suggest`，记 session `type:suggest`；主进程广播带上建议。  
3. UI 旁路卡 +「口播这条」才走 `voiceTurn(preAnswer)`；`speakOnDemandOnly`。  
4. Firecrawl：`healthCheck` + 失败写入 `.fail.json`（code/hint），不静默丢弃。

## 后果

- 建议≠咨询：不写 consult、不改 armed。  
- 冒烟：`npm run smoke:suggest`、`npm run smoke:firecrawl`。
