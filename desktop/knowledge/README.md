# 大智 AI 会议顾问 — 知识库说明（v3 · LLM Wiki）

本目录供桌面虚拟音频网桥（**大智**）使用。正式口径在 **Wiki 概念页**，原始材料只追加不改写。

| 文件/目录 | 用途 |
|-----------|------|
| `wiki/schema.md` | 页模板、Ingest/Query/Lint 约定 |
| `wiki/index.md` | 会中 Query 目录 |
| `wiki/concepts/*.md` | **正式词条**（口播 / 事实 / 边界 / 相关 / 常见问法） |
| `wiki/log.md` | 变更日志 |
| `raw/` | 原料说明（immutable） |
| `faq-meeting.txt` | **L1** 闭题秒答（A 侧应来自词条口播） |
| `quan-yuan-meiyu.txt` | 详版 raw；缺口时才进向量 |
| `.rag-index.json` | Embedding 本地索引；`npm run rag:index` |
| `sessions/` | 本场 jsonl + summary |
| `inbox/` | L2/L3 答后候选 |
| `distilled/` | 历史升格；**新沉淀默认进 wiki 常见问法** |

## 答法三层

| 层 | 来源 | 说明 |
|----|------|------|
| L1 | `faq-meeting.txt` | 闭题模板秒答 |
| L2 | Wiki 整页 + Chat | 开放/经营；成功写入 `inbox/` |
| L3 | Wiki 整页 + Deep Thinking | 起死回生等；成功写入 `inbox/` |

会中只做 **Query**（读 index → 1–3 整页）。**Ingest / Lint** 会后执行：

```bash
cd desktop
npm run knowledge:wiki:ingest       # inbox → 概念页「常见问法」（不改事实）
npm run knowledge:wiki:ingest:dry
npm run knowledge:promote:faq       # 常见短答 → FAQ（A=词条口播）
npm run knowledge:wiki:lint         # 矛盾 / 断链 / 缺口播
npm run rag:index                   # 重建索引（wiki 每页一条）
```

兼容旧命令：`knowledge:promote` 同上（默认不再堆一问一文件 distilled）。

## 代码入口

| 模块 | 路径 |
|------|------|
| 知识门面 | `lib/knowledge/`（Wiki / RAG / corpus / sink） |
| Wiki 子模块 | `wiki/{paths,parse,catalog,query,write,lint}.cjs` |
| RAG 子模块 | `rag/{paths,chunks,embed,store,retrieve,state}.cjs` |
| 策略引擎 | `lib/meetingStrategy/` |
| 经营顾问 | `lib/meetingStrategy/advisors/{config,diagnose,heuristics,lead,llmChat,run}` |
| 会话状态 | `lib/meetingSession/` |

回归：`npm run smoke`（wave6–12 + dialog:eval）

## 模式

| 模式 | 触发 | 行为 |
|------|------|------|
| HH 人—人 | 默认 | 旁听记录；偏题短纠偏；不抢答 |
| HA_ASK 咨询 | 呼叫大智 + 闭题/一般问 | FAQ 或 Wiki+短答 |
| HA_TALK 探讨 | 大智探讨 / 抵触两难 | 亲和选项+反问 |
| HA_BIZ 经营顾问 | 招生/倒闭/落地/多园/0→1 | L2/L3：口播抓手 + 步骤卡 |
| 总结 | 大智总结 / 要总结 | 短纪要 + 下一议题 |

口令：`大智你好` · `谢谢大智` · `大智总结一下` · `暂停记录` · `继续记录`
