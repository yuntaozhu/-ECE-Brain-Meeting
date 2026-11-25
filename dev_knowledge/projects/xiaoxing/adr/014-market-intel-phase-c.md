# ADR-014：农产品行情情报 Phase C（省厅路由 + 病虫）

## 背景

Phase B 覆盖批发市场规则解析；省厅栏目名不统一，硬编码 31 套 Selector 不可维。

## 决策（Phase C 轻量）

1. `province-agri-roots.json`：试点鲁/粤/川/陕首页根域。  
2. **关键词语义发现**（非 VLM）：抽 `<a>` → 打分「价格行情/病虫测报」→ `province-route-cache.json`。  
3. 连续空采可 `empty_streak` 触发重测绘（钩子已留）。  
4. 病虫预警：`seed-pest-alerts` + Ask `layer=pest`。  
5. Playwright / 附件 VLM / LLM 菜单选型 **后置**；`--live` 可选抓首页。

## 后果

- `npm run market:province-scan` · `npm run smoke:market:c`  
- 真站改版时先扩 keywords，再考虑 VLM 自愈。
