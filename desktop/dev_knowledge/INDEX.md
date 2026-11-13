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
| `adr/009-wave-g-lint-retrieve-sync.md` | Wave G：lint / 空命中 / sync-domain |
| `adr/010-ui-cockpit-jk.md` | Wave J/K：驾驶舱壳 + 气泡/三色卡/结构化速览 |
| `adr/011-wave-l-capsule-stealth.md` | Wave L：胶囊双态 HUD + setContentProtection |
| `adr/012-wave-h-prefetch-vad-paths.md` | Wave H：partial 预热 / VAD 预卷 / 打包路径 |
| `adr/013-wave-i-llm-refine.md` | Wave I：smartClip + 两阶段 LLM 精炼 |
| `adr/014-wave-m-speakable-counter.md` | Wave M：口播清洗 + Option C 模式族 + 盈利槽位 |
| `adr/015-wave-q-copilot-topic-summary.md` | Wave Q：Copilot topic/fact 净化 + 总结噪声过滤 |
| `adr/016-wave-p-copilot-dialogue-thread.md` | Wave P′：试播开链 + 短答选题巡检 |
| `adr/017-shared-intelligence-layer.md` | Wave R + 共用智能层 + 副驾驶 Seed-Evolving |
| `adr/018-audience-frame-correction.md` | Wave R7：受众帧对齐 + 纠偏闭环 |
| `adr/019-wave-r8-dual-lane-advisor.md` | Wave R8：双通道开口 + 副驾驶顾问精炼 |
| `adr/020-wave-r9a-dialogue-meta.md` | Wave R9a：Dialogue-Meta + meta channel |
| `adr/021-wave-r9b-oralize-lane.md` | Wave R9b：oralize 首句 + lane 模糊仲裁 |
| `adr/022-wave-r9c-agent-copilot.md` | Wave R9c：Agent 两跳 + Copilot Meta 隔离 |
| `adr/023-wave-r10-session-focus.md` | Wave R10：Focus SSOT / 催答 / ask_repair / 短窗粘合 |
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
