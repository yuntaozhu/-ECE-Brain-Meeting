# ADR-009 Wave G：硬编码门禁、空命中、业务 Wiki 桥接

## 背景

Wave E–F 落地后审计发现：`recap` 触发 no-hardcode-lint；`retrieve` 0 分仍返回首篇研发页；业务 `knowledge/wiki/concepts` 未进 Fast Read；LLM ingest 落盘被规则覆盖。

## 决策

1. `recap` / `mermaidHint` 正则迁入 `knowledge/schema/copilot-gate.json`，经 `schemaStore.rx("copilot", …)`。
2. `retrieveWiki2` 无正分命中时返回 `mode: wiki2-empty`，禁止兜底无关页；`draft` 降权；CJK 2–4 字 n-gram 切词。
3. `wiki2-sync-domain`：concepts → `knowledge_wiki/wiki/entities/biz_*.md`（口播→Snapshot，事实→Active，边界→Superseded）。
4. `ingestEpisode` 支持 `precompiled`；`reconcile` 保留原 `valid_from` 并以 `.tmp`+rename 原子写。

## 后果

- 会中业务问句可命中 biz 实体；研发无关问句不再污染 Evidence。
- 改概念页后需再跑 `npm run wiki2:sync-domain`。
- 真流式 prefetch / 打包路径留给 Wave H。
