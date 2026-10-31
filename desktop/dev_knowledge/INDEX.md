# dev_knowledge 导航

**角色**

- **对内（Cursor）**：与 `.cursor/rules/*.mdc`、`desktop/.cursorrules` 配合，指导改 `desktop/`。
- **对外（运行态）**：仅 `glossary/` 参与 ASR 纠错；会中 FAQ/RAG 仍以 `desktop/knowledge/` 为准。

> AI 总控入口是 **Cursor rules**，不是 `CLAUDE.md`。

**目录**

| 路径 | 用途 |
|------|------|
| `rules/` | 模块守护规则（paths 头；与 `.cursor/rules` globs 呼应） |
| `adr/` | 架构决策：试过什么 → 为何失败 → 最终方案 |
| `glossary/project_terms.json` | ASR/Whisper 热词纠错 |
| `adr/004-speculative-rag-manual-trigger.md` | Wave B：预检索 + Auto/Manual |
| `adr/005-wave-c-meeting-aid-mcp.md` | Wave C：速览 / 速记 / 截屏 / MCP |
| `adr/006-wave-d-mermaid-ocr-deepdive.md` | Wave D：Mermaid 扫视 / OCR / Deep Dive |
| `adr/007-wiki2-fast-read.md` | Wave E：Wiki2 Fast Read / Ingest |
| `adr/008-wiki2-llm-themes.md` | Wave F：豆包编译 + 共现主题 |
| `../knowledge_wiki/` | 会中 Evidence Wiki 2.0（与论文 wiki 分离） |
| `session_logs/dev_sessions.jsonl` | 开发会话归档（追加写入） |
| `session_logs/meeting_bridge.json` | 会中桥接态（MCP 可读） |
| `session_logs/jots_*.jsonl` | Quick Jot 速记 |
| `wiki/` | 论文与对话系统概念（研发阅读） |
| `raw/` | 原文 PDF/MD |

**维护规范**

1. 新决策先进 `adr/`，再在 `.cursor/rules` 或本 INDEX 加一行路由。
2. 改音频/ASR/窗口时，同步检查对应 `rules/*.md` 与 path-scoped `.mdc`。
3. 完成功能后可向 `session_logs/dev_sessions.jsonl` 追加一条 JSON。
4. 会中业务话术属于 `knowledge/faq-meeting.txt`，不要写进 `dev_knowledge`。
