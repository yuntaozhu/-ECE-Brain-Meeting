# ADR-016：农产品行情情报 Phase E（体验打磨）

## 背景

A–D 已具备问价 / 解析 / 省厅 / B2B 价差；驾驶舱仍是扁平行情列表，Web 无行情页。

## 决策（Phase E 轻量）

1. `buildMarketDashboard`：今日卡（批发/地头徽章）+ 近 7 日均价序列（库内有则填）+ 价差摘要。  
2. Electron：`marketDashboard` IPC；右侧「今日行情」渲染 spark 条与告警。  
3. Web：`/market` + `GET /api/market`；`/healthz` 附带 market 计数。  
4. 装载种子改为批发+地头（`ingestSeedWithB2b`）。  
5. 不做：Chart.js 重依赖、实时推送、安装包。

## 后果

- `npm run smoke:market:e`  
- 缺日数据以空条展示，不编造价格。
