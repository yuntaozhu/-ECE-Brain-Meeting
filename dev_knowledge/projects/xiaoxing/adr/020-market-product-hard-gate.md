# ADR-020：行情品名硬门闩 + miss 后 Firecrawl live

## 背景

问「寿光的大豆/鸡蛋多少钱」时，检索仅凭「寿光」+日期得到 score≈14.6，命中库内黄瓜并口播——违反「不凭印象/不顶替」。

## 决策

1. **硬门闩**（`productGate` + `market-products.json`）：问句抽出品名后，报价 `product_name` 必须一致（含别名）；否则不返回 `market`。  
2. **触发收紧**：仅 `looksLikePriceQuery` 走行情；「资料/哪里查」等不进 market。  
3. **诚实 miss**：价格问未中 → `layer=market_miss`，不掉进弱 wiki2、不播其它品。  
4. **live-on-miss**：`askAsync` / 会议升级路径在 miss 后按白名单 `crawl-sources` 调 Firecrawl scrape → 规则解析入库 → 再检索；B2B 默认禁止盲爬；超时/无 key/冷却则仍 miss。  
5. Me ASR **不**用长期 `forceAsk` 绕过休眠（与 ADR-019 一致）。

## 后果

- 冒烟：`npm run smoke:market:gate`（mock scrape，不打真网）。  
- 真机需 `FIRECRAWL_API_KEY`；驾驶舱状态「正在查行情…」。
