# 小星知识库

| 路径 | 用途 |
|------|------|
| `wiki/concepts/` | 正式词条（草莓 + 水稻 + 柑橘骨架 + 政策/治理入口） |
| `faq-strawberry.txt` / `faq-rice.txt` / `faq-citrus.txt` | L1 秒答（全部 `faq-*.txt` 自动加载） |
| `market/seed-*.json` | 行情与病虫种子 |
| `schema/ask-question-bank.json` | 自动冒烟题库（约 270 题） |
| `schema/crawl-sources.json` | 公开页爬取白名单（含 `briefing` 桶） |
| `schema/ingest-keywords.json` | 东方城乡报/农委定向关键词 |
| `schema/knowledge-layers.json` | 政策/技术/市场分层 |
| `schema/source-priority.json` | 冲突优先级与版权红线 |
| `schema/project-memory.json` | 跨会主题记忆 |
| `schema/llm-ask.json` | 缺口 LLM 补答策略 |
| `raw/firecrawl/` · `raw/xunbao/` · `raw/rice/` | Firecrawl 公开页快照 |
| `raw/briefing/` | 会前动态卡片 `latest.json` |
| `raw/manual/` | 授权摘录、书目、农业科技汇编索引 |
| `sessions/` | 会议 jsonl / 摘要 / `index.json` |
| `inbox/` | 缺口候选 |
| `ingest_tasks/` | 会后结构化补库任务 |
| `followups/` | 农服跟进（含 `ingest_task`） |

入库规则：`docs/knowledge-ingest-rules.md`  
任务清单：`docs/tasklist-mtg-2026-11-23-knowledge-loop.md`  

**版权**：丛书/译丛禁爬全文；C2 草莓丛书正文仍待授权摘录。  
科技小院等项目 Word **不是**库地基。扩词条后：`npm run wiki2:index`，再 `npm run smoke` / `smoke:bank` / `smoke:briefing`。
