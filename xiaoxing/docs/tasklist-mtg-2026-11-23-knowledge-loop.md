# 开发任务列表 · 会后知识闭环（mtg_1795420554407）

| 项 | 内容 |
|----|------|
| 来源会议 | `knowledge/sessions/mtg_1795420554407.jsonl` / `-summary.md` |
| 共识 | **近期不定人设**（科普/产业/市场）；先做**知识分层架构 + 会后缺什么补什么**；内容先上海果树丛书草莓，评估柑橘 |
| 版权红线 | 《草莓研究进展》《世界草莓大会译丛》及书店正版书：**禁止爬全文**；授权摘录仅 `raw/manual` |
| 文档日期 | 2026-11-23 |

状态：`[ ]` 未开始 · `[~]` 进行中 · `[x]` 完成 · `[-]` 不做/后置

---

## P0-A · 知识库抓取与分层架构（先于角色）

| ID | 任务 | 改哪些文件 | 验收 |
|----|------|------------|------|
| A1 | 写清「抓什么 / 不抓什么 / 从哪来」规则 | 新增 `docs/knowledge-ingest-rules.md`；更新 `knowledge/README.md` 链过去 | 含：公开页可爬、丛书禁爬、B2B 禁盲爬、水稻门户待入源 |
| A2 | 扩展 crawl 白名单（机构+行情，**不含书店图书页当全文**） | `knowledge/schema/crawl-sources.json` | 增：市农委农业技术栏目、水稻所/中国水稻信息网、grainmarket 等**公开首页**；每条带 `tags`/`bucket`/`note` |
| A3 | 补源优先级：上海果树丛书 / 研究进展 / 译丛定位 | `knowledge/schema/source-priority.json` | 写明：丛书=审定摘录；译丛=国际对照；网店=书目发现 only |
| A4 | 分层目录约定（政策/技术/市场 × 全国/上海） | 新增 `knowledge/schema/knowledge-layers.json`（或写进 A1 文档）；Wiki 已有 `rice-knowledge-layers.md` 可链草莓通用版 | schema 可被后续任务读取 |
| A5 | ADR：会后补库闭环与不定人设 | `dev_knowledge/projects/xiaoxing/adr/` 新 ADR（如 021） | 记录会议取舍与版权红线 |

**不做（本阶段）**：种植专家/养护专家硬分身；科普 vs 产业产品线切开。

---

## P0-B · 会后缺口 → 可执行补库任务

| ID | 任务 | 改哪些文件 | 验收 |
|----|------|------------|------|
| B1 | 定义补库任务 schema | 新增 `knowledge/schema/ingest-task.json` | 字段含：`meeting_id`、`query`、`gap_kind`（行情/品种/产区/时事…）、`suggested_source_ids[]`、`status`、`product`/`region` |
| B2 | 会后摘要生成结构化任务（不只长句 followup） | `lib/meeting/summary.cjs`（或同级新模块）；`lib/knowledge/inbox.cjs` | `mtg_*-summary.md` 增加「补库任务」节；并写 `knowledge/followups/` 或 `knowledge/inbox/` 带 `kind=ingest_task` |
| B3 | 从缺口句解析「缺长三角草莓行情」类意图 | 新增 `lib/knowledge/ingestTaskFromGap.cjs` | 单测/smoke：输入会中缺口 → 输出含 `source_ids` 提示（来自 crawl-sources） |
| B4 | 驾驶舱/看板展示待补库任务 | `renderer/` 跟进看板或 board 相关；`lib` followup 看板 | UI 能看到「缺什么 / 建议源 / 待办」 |
| B5 | smoke | 新增或扩 `scripts/smoke-followup.cjs` / `smoke-meeting-summary.cjs` | 跑绿；`测试用例.md` 补 1～2 条 |

示例任务（会议原话落地）：

- 缺 **长三角草莓销售行情** → 建议源：`xinfadi-price`、`jnmarket`、`pfsc-agri` 等（再评估长三角专用源）  
- 缺 **柑橘** 口径 → 标记 `gap_kind=crop_bootstrap`，产品=`柑橘`  
- 缺 **拼多多科技大赛/高校草莓技术时事** → `gap_kind=industry_briefing`，源待白名单

---

## P0-C · 内容建设（授权摘录，非爬书）

| ID | 任务 | 改哪些文件 | 验收 |
|----|------|------------|------|
| C1 | 建立丛书摘录工作区说明 | `knowledge/raw/manual/README.md`（或增补现有） | 写明：正版采购 → 人工摘录 → 升格 Wiki；禁止网店 PDF |
| C2 | 上海果树全产业链·**草莓** 升格首批词条 | `wiki/concepts/` 新/改：栽培历、产区、品种对接丛书章节；`faq-strawberry.txt`；`wiki/index.md`；`wiki/log.md` | `wiki2:index`；相关 Ask 命中 FAQ |
| C3 | 书目索引页（仅元数据，无正文） | `knowledge/raw/manual/shanghai-fruit-series-catalog.md` | 列：梨/桃/葡萄/柑橘/草莓等书名与用途；**无**电商扒文 |
| C4 | **柑橘** 知识骨架（会议 gap） | 新 `faq-citrus.txt`（或先单文件 FAQ 段）；`wiki/concepts/citrus-*.md` 入口 2～3 页；`lib/knowledge/paths.cjs` 已支持 `faq-*.txt` | Ask「柑橘…」不再纯 gap（至少入口口径） |
| C5 | 长三角/上海草莓行情种子补强 | `knowledge/market/seed-quotes.json`；必要时扩 crawl-sources | 问「长三角草莓行情」有诚实分层答或命中报价，不瞎顶替 |
| C6 | 题库/用例回归 | `ask-question-bank.json`；`测试用例.md` | `smoke:bank` 绿 |

---

## P1-D · 跨会记忆与双身份（产品能力）

| ID | 任务 | 改哪些文件 | 验收 |
|----|------|------------|------|
| D1 | 项目/主题维度会议索引 | 新增 `knowledge/schema/project-memory.json`；`lib/meeting/` 读写 `knowledge/sessions/index` 或主题目录 | 能列出同主题历史 `meetingId` |
| D2 | 开场播报「上次讨论了什么 + 待办」 | `lib/meeting/session.cjs` / `summarize`；驾驶舱开始听会文案 | 二次开会可提示前情（可先文本卡，后 TTS） |
| D3 | 主持控场 vs 内容助手开关（轻量） | `knowledge/schema/meeting-commands.json`；`lib/meeting/` | 配置项即可；**不**做专家人设包 |
| D4 | 会中新信息沉淀提示 | `lib/meeting/suggest.cjs` 或 jot 路径 | 参会新数据可一键进 inbox |

---

## P1-E · 会前行业动态 briefing

| ID | 任务 | 改哪些文件 | 验收 |
|----|------|------------|------|
| E1 | 时事源白名单（定向，非关键词乱爬） | `crawl-sources.json` 增加 `bucket: briefing` 条目（高校/学会新闻页等**公开** URL） | 有 note：仅标题+摘要页 |
| E2 | briefing 生成脚本 | 新增 `scripts/briefing-daily.cjs` 或 `lib/briefing/` | 输出 `knowledge/raw/briefing/*.md` |
| E3 | 开会前可读卡片 | 驾驶舱或 `/api` | 可选展示「会前补充」 |

---

## P2-F · 后置（会议说「界定很容易」但现阶段不做）

| ID | 任务 | 说明 |
|----|------|------|
| F1 | 角色包配置 | `schema/roles.json`：种植/养护只切换知识子集与口吻 |
| F2 | 角色 + 本地库 + 联网 | 在 liveFetch 白名单上扩展；仍禁图书全文 |
| F3 | 谈判/培训/参观场景包 | 场景 prompt + 知识滤镜，非独立产品 |

---

## 建议实施顺序

```text
A1 → A2/A3/A4 → A5
     ↓
B1 → B3 → B2 → B5 → B4
     ↓
C1 → C3 → C2 → C5 → C4 → C6
     ↓
D1 → D2 → D3/D4
     ↓
E1 → E2 → E3
     ↓
F*（有明确产品需求再开）
```

---

## 与现有能力对照（避免重复造）

| 已有 | 本列表增量 |
|------|------------|
| inbox / followup 看板 | 结构化 **ingest_task** + 建议 `source_ids` |
| crawl-sources + Firecrawl | 扩源 + **禁止图书**写进规则 |
| market live-on-miss | 会后任务驱动的定向补采 |
| meeting summary | 增加「补库任务」节 |
| faq-*.txt 多文件 | 柑橘 `faq-citrus.txt` |
| rice-knowledge-layers | 推广为通用分层（草莓+果树） |

---

## 快速勾选（执行看板）

- [x] A1  ingest 规则文档  
- [x] A2  crawl-sources 扩公开源（含 dfcxb / nyjs / 水稻所 / grainmarket）  
- [x] A3  source-priority 版权定位  
- [x] A4  knowledge-layers + ingest-keywords schema  
- [x] A5  ADR-021  
- [x] B1  ingest-task.json  
- [x] B2  summary 写任务（「补库任务」节）  
- [x] B3  gap→任务解析 ingestTaskFromGap.cjs  
- [x] B4  UI 展示（跟进卡显示建议源）  
- [x] B5  smoke:ingest + followup/summary  

- [x] C1  manual README  
- [~] C2  上海草莓丛书：公开入口/版权口径已落；**正文摘录仍待授权**  
- [x] C3  书目 catalog（rice-fruit + shanghai-fruit-series）  
- [x] C4  柑橘骨架（faq-citrus + 3 Wiki）  
- [x] C5  长三角草莓行情种子 + 区域加权  
- [x] C6  bank 回归（256/256 绿；Q251–Q256）  
- [x] LLM-gap  审定库缺口 → 方舟 LLM 参考答复（ADR-022；sync ask 仍确定性）  
- [x] D1  project-memory + sessions/index.json  
- [x] D2  开场前情卡（驾驶舱气泡）  
- [x] D3  assistantMode content|host（meeting-commands）  
- [x] D4  会中新信息 ingest_prompt  
- [x] E1  crawl briefing 桶（6 源）  
- [x] E2  briefing-daily 脚本 + raw/briefing  
- [x] E3  驾驶舱卡 + GET /briefing + 听会附带  
- [ ] F*   后置（有明确产品需求再开）  

---

### 收口说明（2026-11-25）

除 **C2 丛书正文授权摘录** 与后置 **F\*** 外，本清单 P0–P1 已落地。汇编轻量升格与 briefing 噪声过滤持续维护：`briefing` / `wiki2:index` / `smoke:all`；有摘录文本再开 C2 正文升格。

*本列表随实现勾选；完成后追加 `dev_knowledge/session_logs/dev_sessions.jsonl`（project: xiaoxing）。*
