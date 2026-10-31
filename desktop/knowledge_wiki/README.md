# Karpathy Wiki 2.0（会中 Evidence 底座）

与 `dev_knowledge/wiki`（论文概念、会中不读）分离。  
本目录供 **会中 Fast Read**（只注入 AI-First Snapshot）与 **会后 Slow Write**（Episode → Claims → Reconcile）。

| 路径 | 用途 |
|------|------|
| `wiki/decisions/` | 架构/产品决策页（四段式） |
| `wiki/entities/` | 实体页 |
| `wiki/themes/` | 跨会议主题（Wave F） |
| `raw/episodes/` | 会后原始切片 |
| `changelog/` | 冲突消解审计 |
| `.graph_index/` | `npm run wiki2:index` 生成，勿手改 |

维护：改 Markdown 后执行 `npm run wiki2:index`。见 `dev_knowledge/adr/007-wiki2-fast-read.md`。
