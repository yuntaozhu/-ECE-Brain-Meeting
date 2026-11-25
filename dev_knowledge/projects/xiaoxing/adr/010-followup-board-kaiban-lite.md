# ADR-010：农服跟进看板（Kaiban 列语义轻量落地）

## 背景

产品文档要求「星耘管现场，Kaiban 管跟进」。小星 Electron 不宜直接挂 KaibanJS React 运行时；先落地同列语义的本地看板。

## 决策

1. `knowledge/followups/*.json` + `lib/followup/board.cjs`：列 `todo/doing/review/done`。  
2. 与 inbox（补库缺口）分离：跟进=办事闭环，inbox=知识升格。  
3. 散会摘要对未答会场问 `ingestMeetingGaps` 自动建待办。  
4. 驾驶舱右侧「农服跟进」；完整 KaibanJS Team 后置。

## 后果

- 冒烟：`npm run smoke:followup`。  
- 不 `require` 根目录 Kaiban / desktop。
