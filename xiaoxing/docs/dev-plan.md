# 小星开发方案（落地版）

独立产品：农业口径 + **AI 会议能力**。全局方案见仓库根 `multi_project_monorepo_and_dev_knowledge_plan.md`。

## 已完成

1. **M0** 目录与知识分层  
2. **M1** Phase A 品种卡 + 边界 + FAQ  
3. **M2** Ask 管线（FAQ→Wiki→拒答/坦诚）  
4. **M3** Firecrawl 公开源 raw 灌入（部分源待通）  
5. **M4** inbox promote + smoke  
6. **M4b** 本地复盘看板 `/board`  
7. **M5** 微信/Webhook 骨架  
8. **M5b** 上海旬报快照包  
9. **V0–V3** 语音驾驶舱（麦问、胶囊、唤醒、看板内嵌）

## AI 会议

对照 `dev_knowledge/shared/playbook/meeting-assistant.md` 与 `projects/xiaoxing/adr/001`～`002`：

1. **MVP 已落地**：会议会话、Me 唤醒/半双工、Others 采音 + 手动记入  
2. **云 ASR**：Me/Others 豆包流式 + 热词 + **纠错表**（不用本地 Whisper）；ADR-003/004/005  
3. **会后摘要**：`mtg_*-summary.md` + 会场未答进 inbox；胶囊同步听会态  
4. **旁路建议**：Others 问句出卡、不自动抢麦（`suggestSilent` / ADR-006）；口播需人工点  
5. Firecrawl：`healthCheck` + 失败 `.fail.json` 可读  
6. **Session Focus**：催答/回想/短粘合（ADR-007）  
7. **Wiki2 快读**：`lib/wiki2` BM25 + 1-hop；`npm run wiki2:index`（ADR-008）  
8. **设备/PTT**：枚举修复 + 听会中按住说话（ADR-009）  
9. **农服跟进看板**：Kaiban 列语义本地落地（ADR-010）；完整 KaibanJS Team 后置  
10. **微信公网就绪**：安全模式 AES + 缺口跟进 + `/healthz`（ADR-011）  
11. **行情 Phase A**：T0/T1 源扩容 + 报价归一 + Ask 行情层 + 驾驶舱只读（ADR-012）  
12. **行情 Phase B**：新发地/寿光规则解析 + cron + 旁路行情 + 价差跟进（ADR-013）  
13. **行情 Phase C**：省厅关键词路由试点 + 病虫 Ask（ADR-014）  
14. **行情 Phase D**：B2B 地头价种子/fixture + 价差跟进 + midday cron（ADR-015；真登录/外呼后置）  
15. **行情 Phase E**：驾驶舱/Web 行情卡 + 近7日条 + `/api/market`（ADR-016）  
16. **出处口播短名**：`sourceLabel` / 「信息来自××」；禁念 URL；跟进 kind_label  
17. **系统调试日志**：对照大智独立落地 `debugLog` + UI（ADR-017）  
18. **ASR 熔断 / 日志降噪**：circuit_open + consult/final 埋点（ADR-018）
19. **听会默认说完即问**：defaultArmed（ADR-019）
20. **行情门闩 + live-on-miss**：品名硬约束；Firecrawl 白名单补采（ADR-020）  
21. 可选：KaibanJS Team · 安装包 · Playwright 登录态

## 进行中 / 下一波（mtg_1795420554407）

会后知识闭环任务清单（改文件级）：**`docs/tasklist-mtg-2026-11-23-knowledge-loop.md`**

要点：不定人设 → 分层架构 + 缺口变补库任务；上海果树丛书草莓升格、柑橘骨架；丛书/译丛**禁爬全文**。

**已落盘（P0-A + P0-B + C1/C3）**：入库三轨规则与 crawl 扩源；会后 `ingest_task`（摘要「补库任务」节 + 跟进看板建议源）；`npm run smoke:ingest`；书目 catalog。

## 刻意保持的隔离

- 不共用大智业务 FAQ / 会话文件  
- 不 `require('../desktop/...')`  
- 经验写入 `dev_knowledge/projects/xiaoxing/`，通用升格 `shared/`

来源优先级见 `knowledge/schema/source-priority.json`。
