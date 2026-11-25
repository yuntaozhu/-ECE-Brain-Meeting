# 小星 · 农产品行情情报

## 目标

通过小星 **问今日批发价 / 看库内行情**，与农服口径、会议旁路衔接。

## Phase A（已完成）

- T0/T1 源入 `crawl-sources`（`bucket=market`）  
- 归一化（元/斤）+ Ask 行情层 + 种子价 + 驾驶舱只读  

## Phase B（已完成）

- **规则解析**：新发地 Markdown 表、寿光自由文本（`lib/market/parsers`）  
- **ingest**：raw + fixtures  
- **cron**：`market-cron --slot=morning|spread`（`--crawl` 才真采）  
- **旁路建议**：会场询价出 `market` 卡  
- **价差跟进**：`kind=market_watch`  

## Phase C（已完成 · 轻量）

- **省厅路由**：试点鲁/粤/川/陕；关键词发现 + `province-route-cache.json`  
- **病虫预警**：种子告警 + Ask `layer=pest`  
- **附件钩子**：`detectAttachmentLinks`（解析后置）  
- 未做：Playwright 整站、VLM 自愈、31 省全量  

## Phase D（已完成 · 轻量）

- **T3 源**：一亩田 / 惠农入 `crawl-sources`  
- **地头价**：`seed-b2b-quotes` + ymt/cnhnb fixture 解析；`quote_kind=farmgate`  
- **价差跟进**：地头 vs 批发 → `b2b_spread`；midday cron  
- **登录闸**：`b2b/profile` 未登录拒绝 live；自动外呼后置  
- 未做：Persistent Browser 真登录、完整手机号、自动外呼  

## Phase E（已完成 · 轻量）

- **驾驶舱**：近 7 日均价条 + 批发/地头徽章 + 价差告警行  
- **Web**：`/market` · `GET /api/market`；`/healthz` 含 market 计数  
- **种子**：装载按钮 = 批发 + 地头（`ingestSeedWithB2b`）  
- **出处口播**：`信息来自北京新发地价格行情` 等短名；**禁止念 URL**（`sourceLabel`）  

## 检索门闩 + live-on-miss（已完成）

- **品名硬门闩**：问句品与 `product_name` 不一致不得命中（防「寿光大豆→黄瓜」）  
- **market_miss**：库无该品诚实说明，不顶替、不强行 wiki  
- **live**：miss 后白名单 Firecrawl scrape → 解析入库 → 再答（需 key；B2B 默认不盲爬）  
- Schema：`knowledge/schema/market-products.json`  
- 冒烟：`npm run smoke:market:gate` · `npm run smoke:bank`（250 题）
- 「去哪查 / 准吗」等渠道问法不进行情，走 FAQ/Wiki（水稻门户等）  


## 非目标（后置）

- Playwright 持久登录保活、自动语音外呼、31 省 VLM、安装包  

## 命令

```bash
npm run market:seed
npm run market:ingest -- --fixtures-only
npm run market:cron -- --slot=morning
npm run market:cron -- --slot=morning --crawl   # 需 Firecrawl
npm run market:cron -- --slot=midday           # B2B 价差（fixture）
npm run market:province-scan
npm run crawl:market
npm run smoke:market
npm run smoke:market:b
npm run smoke:market:c
npm run smoke:market:d
npm run smoke:market:e
npm run smoke:market:gate
npm run smoke:bank
```

## Ask / 会场示例

- 「新发地草莓多少钱」→ `market`（批发）  
- 「一亩田草莓产地价多少」→ `market`（地头 farmgate）  
- 会场 Others 同句 → 旁路建议卡，点口播才播  
- 浏览器打开 `/market` 看近 7 日条与卡片  

详见 ADR-012～016。
