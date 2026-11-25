# ADR-007：Karpathy Wiki 2.0 Fast Read（Wave E）

## 背景

V3 要求会中 <200ms 注入知识，且保留 Markdown 可审阅；原生「LLM 读 index.md」过慢，且会中散文页不适合扫视。

## 试过什么

1. **会中直接读 `dev_knowledge/wiki/concepts`**：论文页、会中明确不读。
2. **引入 better-sqlite3 / Neo4j**：Electron 原生 addon / 运维过重。
3. **运行时 LLM 编译路由**：TTFT 达不到会中要求。

## 决策

- 新建 `desktop/knowledge_wiki/`：AI-First 四段式决策/实体页 + `raw/episodes` + `changelog`。
- Fast Read：`lib/wiki2` 构建 JSON 图索引（BM25-lite + 1-hop links/backlinks），**无 LLM**。
- 会中只注入 Snapshot + Active/Superseded 摘要；接到 `prefetch` / 建议卡 / Catch Me Up。
- Slow Write：规则版 `ingestEpisode` + 最小 `reconcileClaim`；MCP `ece_wiki_*`；完整豆包编译后置。
- AI 总控仍为 Cursor rules，不恢复 `CLAUDE.md`。

## 后果

- 索引需 `npm run wiki2:index`（改页后）。
- 规则抽取会漏/误；Reconciler `--apply` 需人工盯 changelog。
- 向量检索可后续叠在 JSON 索引上，不阻塞 Fast Read。
