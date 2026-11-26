# dev_knowledge 全局导航

**角色**

- **对内（Cursor / 研发）**：与根 `.cursorrules`、`.cursor/rules/*.mdc` 配合，服务 `desktop/`、`xiaoxing/` 及未来同级项目。
- **对外（运行态）**：各产品业务 FAQ/Wiki **不在此**；ASR 热词见 `shared/glossary` + `projects/<name>/glossary`（由各产品 `appPaths` 加载）。

> AI 总控：根 `.cursorrules` + 本 INDEX。方案 SSOT：`multi_project_monorepo_and_dev_knowledge_plan.md`。

---

## 目录分工

| 路径 | 用途 |
|------|------|
| `shared/adr/` | 跨项目会场底座 ADR（双轨、VAD、Whisper、Wiki2、胶囊等 001–012） |
| `shared/rules/` | 通用模块红线 |
| `shared/patterns/` | 可复用设计模式 |
| `shared/checklists/` | 新项目 / 发布 / 避坑清单 |
| `shared/playbook/` | 选型、会议能力、知识分层、经验入库 |
| `shared/glossary/` | 通用技术热词 |
| `projects/desktop/` | **大智**专属 ADR（013–023）、rules、glossary |
| `projects/xiaoxing/` | **小星**专属 ADR（含 AI 会议落地） |
| `projects/_template/` | 新项目脚手架 |
| `wiki/` · `raw/` | 算法与论文（会中不读） |
| `session_logs/dev_sessions.jsonl` | 全局开发经验流（须含 `project`） |

---

## 按任务查

| 任务 | 打开 |
|------|------|
| 新建同级产品 | `shared/playbook/product-scaffold.md` · `projects/_template/` |
| AI 会议能力（大智/小星） | `shared/playbook/meeting-assistant.md` · `shared/adr/001`～`003` |
| 会议控制 / RTC AI / Bot | `docs/meeting-control-mvp.md` · `docs/tasklist-meeting-control-2026-11-26.md` · `docs/meeting-control-acceptance.md` · `shared/patterns/meeting-event-contract.md` |
| 会议管理台（专家/议题/会控） | `shared/patterns/meeting-admin-console.md` · `/api/meeting-admin/*` · `npm run smoke:meeting-admin` |
| LiveKit 评估（暂缓） | `shared/adr/013-livekit-agents-evaluation.md` |
| 业务知识分层 | `shared/playbook/knowledge-layers.md` · 各产品 `knowledge/` |
| 经验怎么入库 | `shared/playbook/experience-ingest.md` |
| 改大智引擎 | `projects/desktop/` + `desktop/.cursorrules` |
| 改小星 | `projects/xiaoxing/` + `xiaoxing/` 文档 |

---

## 按产品查

| 产品 | 入口 |
|------|------|
| 大智 `desktop/` | `projects/desktop/INDEX.md` |
| 小星 `xiaoxing/` | `projects/xiaoxing/INDEX.md` |

---

## 维护规范

1. 新决策：先 `projects/<name>/adr/`；跨项目通用再脱敏升格 `shared/`。
2. 每完成 Feature/Fix：追加 `session_logs/dev_sessions.jsonl`。
3. 运行态 jots / bridge / 业务 FAQ **禁止**写入本目录。
4. 保持本 INDEX 精简（建议 &lt;150 行）。
