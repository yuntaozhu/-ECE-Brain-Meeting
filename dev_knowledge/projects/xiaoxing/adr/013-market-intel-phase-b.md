# ADR-013：农产品行情情报 Phase B

## 背景

Phase A 仅有种子与弱正则；需稳定解析 T1 表结构，并接旁路建议与价差跟进。

## 决策

1. `lib/market/parsers`：新发地表 / 寿光文本规则解析；`detectParser` 路由。  
2. `market-ingest` 解析 `raw/market` + `fixtures`；`market-cron --slot=morning` 可选手动 `--crawl`。  
3. 旁路 `suggestSilent`：询价句优先 `layer=market`（仍不自动抢麦）。  
4. `market_watch`：跨市场均价差 ≥ 阈值 → 农服跟进。  
5. 真采仍依赖 Firecrawl；离线用 fixtures 冒烟。

## 后果

- `npm run smoke:market:b`  
- Phase C 再上省厅 VLM / 附件。
