# ADR-008：Wiki2 豆包编译 Ingest + 轻量主题合成（Wave F）

## 背景

Wave E 规则抽取覆盖面有限；V3 要求 Contextual Ingest 与跨会议主题发现。全量 Leiden/Neo4j 过重。

## 试过什么

1. **仅规则抽取**：稳定但漏口语决策。
2. **Graphiti/Neo4j Leiden**：依赖与运维成本高，本阶段不做。

## 决策

- `compileLlm.cjs`：`WIKI2_INGEST_LLM=1|auto` 时用豆包 JSON 编译；失败回退规则版。
- `themes.cjs`：基于 links/backlinks 共现贪心成簇，写出 `wiki/themes/*.md` 草稿（status=draft）。
- `fromSession.cjs`：最新 session → episode → 可选 reconcile/themes。
- MCP：`ece_wiki_from_session` / `ece_wiki_synthesize_themes`；ingest 支持 `llm`。

## 后果

- LLM 路径依赖豆包 Key 与额度；无 Key 时冒烟仍走规则。
- 主题页须人工升为 active；`--apply` 仍要看 changelog。
