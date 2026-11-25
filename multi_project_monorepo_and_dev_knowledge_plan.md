# 多项目同级孵化 + 全局 `dev_knowledge` 知识飞轮

## 完善版开发方案（v1 · 实施 SSOT）

> 仓库从「以 `desktop` 为中心」升级为：**多个同级独立 AI 助理 + 根目录共享研发知识中枢**。  
> 大智把会场助理走通；小星同级孵化，**同样具备 AI 会议能力**，领域与人设独立；每次开发经验写入 `dev_knowledge`，整理后反哺所有项目。

---

## 1. 一句话目标

**经验共享，代码解耦；业务口径产品私有；研发方法全局沉淀。**

---

## 2. 产品线与边界

| 目录 | 产品 | 能力 | 隔离红线 |
|------|------|------|----------|
| `desktop/` | **大智 · AI 会议助手** | 听会双轨、唤醒「大智」、口播、副驾驶、教育/园所口径 | 独立包与打包；运行态只读写自身 `knowledge/` · `knowledge_wiki/` |
| `xiaoxing/` | **小星 · 农业 AI 助理（含会议）** | **AI 会议**（听会/唤醒/口播/半双工等，方法论对齐大智）+ 农服口径问答与复盘 | **禁止** `require`/`import` `desktop` 源码；禁止共用业务 FAQ/会话 |
| `<new_project>/` | 未来同级产品 | 按 `_template/` + 选型清单装配 | 必须与现有产品**同级**建目录 |
| `src/` · `server/` · `server.ts` 等 | 根目录 Web/RTC 示例 | 保留演示与部署 | 桌面产品禁止修改或引用其业务代码 |
| `dev_knowledge/` | 全局**研发**知识库 | ADR、模式、清单、论文 Wiki、开发会话 | **禁止**业务话术、用户会议录音原文 |

跨项目复用只允许：

1. 阅读 `dev_knowledge/shared/` 后在本项目**独立落地**；或  
2. ≥3 个产品稳定同一模块后再抽 `packages/<pkg>/`。

临时共用 Electron 二进制可过渡，不算架构依赖。

---

## 3. 目标目录蓝图

```text
-ECE-Brain-Meeting/
├── .cursorrules
├── .cursor/rules/
│   ├── global-dev-knowledge.mdc      # alwaysApply：查库 / 回写
│   ├── desktop-*.mdc                 # globs: desktop/**
│   └── xiaoxing-*.mdc                # globs: xiaoxing/**
├── dev_knowledge/                    # 原 desktop/dev_knowledge 提升并重组
│   ├── INDEX.md
│   ├── shared/
│   │   ├── adr/                      # 跨项目会场/音频/Wiki2/打包等 ADR
│   │   ├── rules/                    # 通用红线
│   │   ├── patterns/
│   │   ├── checklists/
│   │   ├── playbook/                 # 选型、知识分层、经验入库、会议能力清单
│   │   └── glossary/common_tech_terms.json
│   ├── projects/
│   │   ├── desktop/                  # 大智专属 ADR / glossary / rules
│   │   ├── xiaoxing/                 # 小星专属（含「会议能力落地」ADR）
│   │   └── _template/
│   ├── wiki/ · raw/
│   └── session_logs/dev_sessions.jsonl
├── desktop/
├── xiaoxing/
└── <future_project>/
```

业务运行态知识（FAQ/Wiki/sessions）留在各产品目录；研发指南只在根 `dev_knowledge/`。  
产品业务知识说明见 [`大智知识库架构.md`](./大智知识库架构.md)。

---

## 4. 根 `.cursorrules` 要点

1. 多项目同级隔离矩阵（上表）。  
2. 保留根 Web/RTC；改桌面/`dev_knowledge` 不得破坏其构建部署。  
3. 改某产品时优先遵守该产品 `.cursorrules`。  
4. **知识飞轮**：Pre 查库 → During 守红线 → Post 回写（见 §6）。  
5. 小星与大智均具备 **AI 会议**能力栈（听写/唤醒/口播/半双工等）；差异在人设、领域知识与交互壳，不在「要不要开会」。

完整条文见仓库根 [`.cursorrules`](./.cursorrules)。

---

## 5. 迁移：研发态 vs 运行态

| 原位置 | 新位置 |
|--------|--------|
| `desktop/dev_knowledge/wiki` · `raw` | `dev_knowledge/wiki` · `raw` |
| 通用 ADR（音频/VAD/Whisper/Wiki2/打包等） | `dev_knowledge/shared/adr/` |
| 大智会场智能层等专属演进 | `dev_knowledge/projects/desktop/adr/` |
| `jots_*.jsonl` · `meeting_bridge.json` | `desktop/knowledge/sessions/`（运行态） |
| `dev_sessions.jsonl` | `dev_knowledge/session_logs/`（研发态，带 `project`） |
| 通用热词 | `shared/glossary/common_tech_terms.json` |
| 大智热词 | `projects/desktop/glossary/project_terms.json` 或 `desktop/knowledge/glossary.json` |

代码改造要点：`appPaths.devKnowledgeReadRoot` → 仓库根；`sessionLogsWriteDir` → 产品 sessions；glossary 合并 shared + 项目。

---

## 6. 知识飞轮（经验 → 知识库 → 反哺）

```text
各项目实战 → session_logs + projects/<name>/
           →（≥2 产品或底座坑）脱敏升格 shared/
           → 更新 _template/ 与 INDEX
           → 下一项目 Pre 查阅
```

| 阶段 | 动作 |
|------|------|
| **Pre** | 读 `INDEX.md` → `shared/` → `projects/<本项目>/` |
| **During** | 守 shared rules + 产品 rules；机制与策略分离 |
| **Post** | 追加 `dev_sessions.jsonl`；专属→`projects/`，通用→`shared/` |
| **Upgrade** | 更新 `_template/` 与 `checklists/pitfalls.md` |
| **Lint** | INDEX 保持精简（建议 &lt;150 行） |

禁止：业务 FAQ、用户录音写入 `dev_knowledge`。  
口号：**项目负责做出来；dev_knowledge 负责记清楚、供下次用。**

---

## 7. 四层骨架（大智 / 小星 / 新项目）

| 层 | 内容 | 归属 |
|----|------|------|
| L1 人设与交互 | 唤醒词、口播风格、UI | 100% 项目独有 |
| L2 业务知识与 schema | FAQ/Wiki/schema | 100% 项目独有 |
| L3 能力引擎 | **含 AI 会议能力**（双轨听写、VAD、半双工、定卡口播等按 shared 落地）+ 语音问答 | 模式来自 shared，代码本项目独立 |
| L4 评测门禁 | no-hardcode-lint + smoke | 每项目标配 |

### AI 会议能力清单（大智已具备；小星要对齐落地）

- `[Me]` / `[Others]` 分轨听写（或等价会议听写方案）  
- 唤醒 / 静默 / 半双工不抢麦  
- FAQ → Wiki → 坦诚缺口；会中不改库  
- 本场会话沉淀 → inbox → 会后升格  
- （可选进阶）副驾驶建议卡、Wiki2 Fast Read、Focus/催答——按里程碑从 shared ADR 裁剪引入  

小星差异：领域=农业；唤醒=「小星」；业务知识=`xiaoxing/knowledge/`；**会议能力本身要有**。

---

## 8. 演进路线

| 阶段 | 工作 |
|------|------|
| **P0** | 大智样板已相对完善 |
| **P1** | 根 `.cursorrules`；`dev_knowledge` 提升重组；修路径；冒烟 |
| **P2** | 小星：补齐 AI 会议能力（对照 shared ADR + 大智参考实现独立落地）；`projects/xiaoxing` 档案 |
| **P3** | `_template/` 硬化；第三条同级产品验收飞轮 |
| **P4** | ≥3 复用再抽 `packages/` |

---

## 9. 成功标准

- 改 A 不误用 B 的业务假设；会议能力模式可查 shared。  
- 小星可开会场助理主路径（听写→唤醒→口径口播），知识为农服。  
- 新项目同级新建；经验有 `dev_sessions`；共性进 shared。  
- 业务与研发知识分离；desktop 关键冒烟迁移后仍绿。

---

## 10. 实施提示词（摘要）

1. **迁移**：建根 rules → 搬 `dev_knowledge` → 拆 shared/projects → 运行态回产品 → 修 `appPaths`/冒烟。  
2. **小星会议**：读 shared 会议 ADR → 在 `xiaoxing/` 独立实现听写/唤醒/口播，禁止引用 `desktop/lib`。  
3. **每次任务后**：用知识架构师提示词回写 `dev_sessions` + ADR（见 `shared/playbook/experience-ingest.md`）。
