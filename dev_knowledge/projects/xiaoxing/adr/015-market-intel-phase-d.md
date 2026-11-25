# ADR-015：农产品行情情报 Phase D（B2B 地头价差）

## 背景

Phase C 覆盖省厅路由与病虫；寻源还需要产地地头价相对一级批发的价差信号。一亩田/惠农需登录态，反爬强，不可盲爬。

## 决策（Phase D 轻量）

1. T3 源入 `crawl-sources`（ymt / cnhnb）；**默认 fixture + seed**，不强制公网。  
2. `quote_kind=farmgate` + `source_tier=T3`；联系方式只存 `contact_masked`。  
3. `lib/market/b2b/profile`：Persistent Profile 状态钩子；未登录 / 无 `XIAOXING_B2B_LIVE=1` → 拒绝 live。  
4. 地头 vs 批发价差 → 跟进 `kind=b2b_spread`；**自动外呼后置**（`outbound_call_enabled=false`）。  
5. cron `--slot=midday`：灌 B2B 种子/fixture + 价差跟进。  
6. Playwright 持久登录、完整手机号、自动外呼 **明确不做**（本期）。

## 后果

- `npm run smoke:market:d` · `npm run market:cron -- --slot=midday`  
- Ask「一亩田草莓产地价」→ `layer=market` 且 `quote_kind=farmgate`
