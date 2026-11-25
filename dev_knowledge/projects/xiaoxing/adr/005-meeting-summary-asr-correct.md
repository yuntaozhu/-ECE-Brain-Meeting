# ADR-005：会后摘要 + ASR 农服纠错

## 背景

云 ASR 仍会把「宁玉」听成「宁雨」等；散会后缺少可审阅摘要与会场未答沉淀。

## 决策

1. `schema/asr-corrections.json` + `lib/asr/correct.cjs`：ingest 前纠错。  
2. `lib/meeting/summary.cjs`：结束听会写 `mtg_*-summary.md`；会场疑似未答问进 inbox。  
3. 胶囊同步听会 / 唤醒 / 会场句。

## 后果

- 纠错表可人工追加；不替代云端热词。  
- 冒烟：`npm run smoke:meeting:summary`。
