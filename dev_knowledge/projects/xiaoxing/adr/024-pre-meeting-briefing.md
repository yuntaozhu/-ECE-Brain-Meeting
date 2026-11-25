# ADR-024 · 会前行业动态 briefing

| 项 | 内容 |
|----|------|
| 状态 | Accepted |
| 日期 | 2026-11-24 |
| 产品 | xiaoxing |

## 决策

1. `crawl-sources` 增加 `bucket: briefing` 白名单（学会/院所/部委/市农委公开首页），**仅标题+摘要**。
2. `lib/briefing/daily.cjs` + `npm run briefing` / `briefing:live` 生成 `raw/briefing/briefing_YYYY-MM-DD.md` 与 `latest.json`。
3. 无 briefing 快照时可回退同机构已有 rice/xunbao/firecrawl 快照。
4. 驾驶舱「会前补充」卡 + IPC；HTTP `GET /briefing`；听会开始可附带 `industryBriefing.speak`。
5. 不作栽培规程、不替代审定 FAQ。
