# ADR-012：农产品行情情报 Phase A

## 背景

小星需支持实时问价/看行情；现有 Firecrawl 仅覆盖学会与农科院口径页。

## 决策（Phase A）

1. 数据源分 Tier：T0 国家级、T1 一级批发市场先入 `crawl-sources`（`bucket=market`）。  
2. 结构化落盘 `knowledge/market/quotes/*.jsonl`；单位入库统一 **元/斤**。  
3. Ask 顺序：拒答 → FAQ → **Market** → Wiki2 → gap；口播必须带市场与日期。  
4. 无当日价时坦诚「库内最新为×日」，不编造。  
5. 异常价（如均价离谱）标 `needs_review`，不进口播默认。  
6. Browser Use / 省厅 VLM / B2B 登录态后置 Phase B–D。

## 后果

- 冒烟：`npm run smoke:market`（种子数据，不依赖公网）。  
- 真采：`npm run crawl:market` / `npm run market:ingest`。
