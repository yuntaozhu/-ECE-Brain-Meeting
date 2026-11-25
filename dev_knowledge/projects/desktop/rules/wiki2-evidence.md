---
paths:
  - desktop/knowledge_wiki/**
  - desktop/lib/wiki2/**
  - desktop/scripts/wiki2-*.cjs
---

# Wiki2 Evidence

- 会中只注入 AI-First Snapshot / Active·Superseded 摘要，不读整篇散文。
- 与 `dev_knowledge/wiki`（论文概念）分离；勿把论文页当会中 Evidence。
- 改 Markdown 后执行 `npm run wiki2:index`。
- `wiki2:ingest:apply` / MCP `apply:true` 会改决策页，须看 `changelog/`。
- 旁路注入走 `lib/copilot/prefetch`；禁止为此重写 `decideSpeak`。
