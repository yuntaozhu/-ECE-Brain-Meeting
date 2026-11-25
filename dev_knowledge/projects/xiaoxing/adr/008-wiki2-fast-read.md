# ADR-008：小星 Wiki2 Fast Read（独立落地）

## 背景

会中旁路建议与 Ask 需要 <200ms 知识命中；现有启发式可用，但缺 JSON 索引与 1-hop 扩展。禁止引用 `desktop/lib/wiki2`。

## 决策

1. 索引源：现有 `knowledge/wiki/concepts/*.md`（口播/事实/相关/常见问法）。  
2. `lib/wiki2`：BM25-lite + 链接/反链；产物 `wiki/wiki2-index.json`。  
3. `scorePagesForQuery` 优先 Wiki2，空命中回落旧启发式；Ask/Suggest layer=`wiki2`。  
4. 无正分 → `wiki2-empty`，禁止兜底无关页。  
5. Slow Write / LLM 编译后置；改概念页后跑 `npm run wiki2:index`。

## 后果

- 冒烟：`npm run smoke:wiki2`。  
- 与 shared ADR-007 同模式，代码物理隔离。
