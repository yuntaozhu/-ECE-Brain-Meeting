# -ECE-Brain-Meeting 桌面端（/desktop/）、dev_knowledge 与对话知识库深度优化方案

## 一、项目架构与桌面端（/desktop/）核心模块拆解

### 1.1 典型桌面端设计架构梳理

在 AI 实时会议与多模态脑力辅助系统（如 `-ECE-Brain-Meeting/desktop` 及同类项目）中，桌面端通常作为核心客户端交互与端侧流转中心。整体技术分层主要包含：

```
┌───────────────────────────────────────────────────────────────┐
│               桌面端用户界面 (Frontend / UI Layer)             │
│   • 悬浮窗 / 胶囊形态 (Floating Widget / Stealth Overlay)      │
│   • 实时转写流与双模笔记 (Live Transcript + Hybrid Notepad)    │
│   • 智能建议卡片流 (Smart Reply Stream / Action Cards)         │
│   • 会议议程与实时架构图看板 (Agenda / Live Diagram View)      │
└───────────────────────────────┬───────────────────────────────┘
                                │ IPC (Tauri Events / Electron IPC / WebSocket)
┌───────────────────────────────▼───────────────────────────────┐
│               端侧核心服务层 (Desktop Native Core)            │
│   • 音频捕获 (Audio Capture: 麦克风 + 系统内录双声道分离)       │
│   • VAD 语音断句与抢答预测 (Silero-VAD + Pre-fetch Trigger)    │
│   • 本地会话缓存 & 动态滑动窗口 (Sliding Window + SQLite)      │
│   • 多模态上下文采集 (Screen Capture OCR + Window Metadata)    │
└───────────────────────────────┬───────────────────────────────┘
                                │ Async Network / Local Inference / MCP
┌───────────────────────────────▼───────────────────────────────┐
│               AI 智能回复与知识引擎 (AI Copilot & Knowledge)   │
│   • 实时语音转写 (ASR: WhisperLive / Parakeet / SenseVoice)   │
│   • 意图门控与分级路由 (Intent Gate -> Fast Pill / Deep Dive)  │
│   • 证据优先知识增强 (Karpathy Wiki 2.0 + Bi-Temporal Graph)   │
│   • 双向 MCP 服务桥接 (Meeting <-> IDE Coding Agent 联动)      │
└───────────────────────────────────────────────────────────────┘
```

### 1.2 当前常见痛点与局限性诊断

结合开源同类项目与常见实现，该类系统通常存在以下核心瓶颈：

1. **音频捕获与分离问题**：
   * 麦克风语音（`User/Me`）与扬声器系统声音（`Others/Remote`）混杂，缺少硬件级或驱动级双声道独立切分（缺少对 Loopback / WASAPI / ScreenCaptureKit 的精准隔离）。
   * 说话人无区分（No Diarization），LLM 无法明确区分“对方提问”还是“自己发言”，导致经常出现“自己回复自己”的混乱现象，或在静音期间重复转写历史音频。
2. **生成延迟与时机控制失衡**：
   * 全量轮询机制：频繁将转写结果丢给大模型，导致 API 费用暴增、Token 耗尽且界面刷屏。
   * 缺乏精准的 VAD（静音检测）、抢答预判（While-Speaking Pre-fetch）与手动触发（Push-to-Trigger）双模式，无法在说话者句尾停顿的瞬间精准给出提示，失去即时建议的最佳“黄金 3 秒”。
3. **回复生成质量与形态单一**：
   * 传统提示词大多只指令“请总结会议”或“针对上述内容回答”，生成一长篇段落文本。
   * 会议进行中，用户根本没有时间阅读长篇大论；缺乏**短语级即时应答（Quick Bites）**、**深度观点拓展（Deep Dive）**、**专业反问/引导问题（Counter-Questions）**以及**实时技术架构图可视化（Mermaid Diagram）**的多梯度分层输出。
4. **知识库（Karpathy LLM Wiki）在高频实时对话下的扩展性与时效断层**：
   * 原生 [Karpathy LLM Wiki 模式](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f)（`raw/` + `wiki/` + `index.md`）专为个人静态小规模文献设计；在高频多人对话与实时会议中，面临**检索延迟过高（>3s）**、**上下文窗口溢出（50k~100k Token 墙）**、**跨会议决策冲突未消解**以及**反向链接（Backlinks）无法高效多跳遍历**等瓶颈。

---

## 二、全面对标：10 大前沿开源项目核心机制借鉴

为了全方位升级 `-ECE-Brain-Meeting`，我们横向拆解了当前 GitHub 上最具代表性的 10 个实时会议助手与桌面记忆开源项目：

| 开源项目 | 核心技术栈 | 标杆特性与核心亮点 | 可直接迁移至 `-ECE-Brain-Meeting` 的优化点 |
| :--- | :--- | :--- | :--- |
| [Meetily](https://github.com/Zackriya-Solutions/meetily) | Tauri (Rust) + Next.js | 100% 本地转写（Whisper / NVIDIA Parakeet），无会议 Bot 侵入，支持本地 Ollama 或 BYOK | 引入 Rust 端侧音频处理与 Parakeet 极速本地 ASR，降低 Electron/前端内存占用 |
| [Cue](https://github.com/Blueturboguy07/cue) *(基于 Glass)* | Electron + Whisper.cpp | 依靠 Chromium `MacLoopbackAudioForScreenShare` 与 Windows WASAPI 实现免虚拟驱动的 `You`/`Them` 双流隔离，支持画面防共享抓取 | 借鉴其免安装复杂虚拟声卡的系统内录方案，以及屏幕截图 + 双声道音频的多模态上下文融合 |
| [Natively](https://github.com/Natively-AI-assistant/natively-cluely-ai-assistant) | Electron + TinyPrompts | 专有 TinyPrompts 状态机、证据优先（Evidence-First）本地 RAG 注入、工程会议实时生成架构图/状态机图、完善的 `CLAUDE.md` | 引入“证据前置”提示词结构、研发会议实时 Mermaid 架构图渲染，以及跨平台研发规范体系 |
| [Screenpipe](https://github.com/mediar-ai/screenpipe) | Rust + Next.js + SQLite | 7x24 小时屏幕 OCR + 音频本地索引，插件化（Pipes）生态，原生提供 [MCP Server](https://www.augmentcode.com/mcp/screenpipe) 供 IDE 编程助手检索 | 将桌面端采集数据通过本地 SQLite 持久化，并暴露 MCP 接口让 IDE 直接调取会议结论 |
| [Hyprnote](https://github.com/fastrepl/hyprnote) | Tauri + Local LLM | 类 Granola 的“人机协同双模笔记”：用户在开会时随手敲几个关键词，AI 结合实时转写自动扩写为结构化纪要 | 在 `/desktop/` 增加轻量速记输入框，将用户的碎片化想法与实时语音流融合生成高准度总结 |
| [Amurex](https://github.com/thepersonalaicompany/amurex) | Chrome Ext + Web/Backend | 提供 **Late Join Recap（迟到速览）**、冷场互动建议（Engagement Suggestions）、跨会议记忆搜索与一键跟进邮件 | 新增“中途入会一键追赶（Catch Me Up）”按钮与跨会议历史语义检索 |
| [WhisperLive](https://github.com/collabora/WhisperLive) | Python + Faster-Whisper / TensorRT | 集成 Silero VAD 实时语音活动检测，解决静音期重复转写历史片段的顽疾 | 在流式 ASR 前置接入 Silero VAD 静音门控与环形缓冲区，消除幻觉与重复文本 |
| [Ecoute](https://github.com/SevaSk/ecoute) | Python + Dual Stream | 极简双栏实时对照：实时分离并显示 `[You]` 与 `[Speaker]` 转写文本，底部联动实时推荐回答框 | 优化桌面端转写视图为清晰的 `[Me]` / `[Others]` 聊天气泡流与置顶建议区 |
| [EchoAI Helper](https://github.com/colakang/echoai_helper) & [Meetingly-AI](https://github.com/iskandaryv/meetingly-ai) | Desktop Overlay + Streaming LLM | “边听边答（The answer, while they're still asking）”：对方还在提问前半段时即预热检索，话音刚落答案即上屏 | 引入流式句子主干预测与 RAG 预检索（Speculative Retrieval），压缩端到端感知延迟 |
| [Devleed/meeting-copilot](https://github.com/Devleed/meeting-copilot) | Whisper + Local RAG | 支持 **Auto Mode（自动触发）** 与 **Manual Mode（按 Enter 手动触发）** 切换，适应嘈杂环境 | 在桌面端提供自动意图触发与快捷键（如 `Enter` / `Ctrl+Space`）手动截断触发双模式 |

---

## 三、项目整体与桌面端（/desktop/）深度优化方案

### 3.1 感知层优化：双声道免驱内录 + 静音门控 + 视觉 OCR 多模态
1. **双通道独立音频流（Dual-Track Audio Pipeline）**：
   * **Track A (`[Me]`)**：采集麦克风输入。
   * **Track B (`[Others]`)**：参考 [Cue](https://github.com/Blueturboguy07/cue)，在 Windows 采用 WASAPI Loopback，在 macOS 14.4+ 启用 `ScreenCaptureKit`（或 Chromium 内置 `MacLoopbackAudioForScreenShare` 标志），无需用户繁琐配置 BlackHole 多输出设备即可分离对方声音。
   * **VAD 防幻觉拦截**：参考 [WhisperLive](https://github.com/collabora/WhisperLive)，在音频分片进入 ASR 前通过 Silero VAD 过滤纯静音帧，防止 Whisper 在安静时无限循环输出“谢谢观看”或重复上一句文本。
2. **轻量视觉上下文（Visual Context OCR / VLM）**：
   * 参考 [Screenpipe](https://github.com/mediar-ai/screenpipe) 与 [Cue](https://github.com/Blueturboguy07/cue)，支持在触发智能回复时按需截取当前共享屏幕画面（或通过本地轻量 OCR 提取画面文字），作为 `[Screen Context]` 一并注入 Prompt，解决“大家看屏幕左边这个模块”的指代消解问题。

### 3.2 决策层优化：抢答式预检索（Speculative RAG）+ 双模触发引擎
1. **两段式意图门控与预热（Speculative Pre-fetch）**：
   * 参考 [Meetingly-AI](https://github.com/iskandaryv/meetingly-ai) 与 [EchoAI Helper](https://github.com/colakang/echoai_helper)，当检测到 `[Others]` 正在连续发言超过 3 秒且出现疑问词或技术实体名词时，**不等对方把话说完**，后台立即异步启动知识库预检索。
   * 一旦 VAD 检测到句尾停顿（300ms~500ms 静音），已检索好的知识块（Evidence）与完整问题立即拼接发送给高速推理模型，将首字返回时间（TTFT）压缩至 500ms 以内。
2. **自动 + 手动混合触发（Hybrid Trigger Mode）**：
   * 参考 [Devleed/meeting-copilot](https://github.com/Devleed/meeting-copilot)，提供 **Auto Copilot 模式**（自动检测提问弹窗）与 **Manual Push-to-Ask 模式**（按键触发推理）一键切换。

### 3.3 交互与功能层优化：从“只给文字”升级为“全周期参谋”
1. **分级流式回复卡片（Tiered Response Cards）**：提供 **Tier 1 瞬间口径（1秒内）**、**Tier 2 核心支撑要点（2秒内）** 与 **Tier 3 启发式反问**。
2. **工程会议实时架构图生成（Live Mermaid Diagramming）**：参考 [Natively ROADMAP](https://github.com/Natively-AI-assistant/natively-cluely-ai-assistant/blob/main/ROADMAP.md)，自动将架构讨论渲染为 Mermaid 架构图/时序图。
3. **中途入会速览（Late Join Recap）与人机协同笔记**：参考 [Amurex](https://github.com/thepersonalaicompany/amurex) 提供 **"Catch Me Up"** 按钮，参考 [Hyprnote](https://github.com/fastrepl/hyprnote) 提供极简速记槽（Quick Jot）。

---

## 四、`dev_knowledge` 专项优化方案：赋能后续开发迭代

结合 [Natively 的 CLAUDE.md 规范](https://github.com/Natively-AI-assistant/natively-cluely-ai-assistant/blob/main/CLAUDE.md)、[Claude Code 官方最佳实践](https://code.claude.com/docs/en/best-practices)、[shanraisshan/claude-code-best-practice](https://github.com/shanraisshan/claude-code-best-practice/blob/main/CLAUDE.md) 以及 [Ahel Session Logging 工作流](https://ahel.ai/catalog/item/logging-session)，将项目研发知识库重构为**“总控索引 + 按路径懒加载规则 + 失败路径保留（ADR）+ 会话日志沉淀”**体系：

```
-ECE-Brain-Meeting/
├── CLAUDE.md                           # [L0 总控入口] <150行：项目全景、构建命令、核心红线与索引路由
└── dev_knowledge/
    ├── INDEX.md                        # 知识库全局导航图与模块维护规范
    ├── rules/                          # [L1 模块级守护规则] 带 paths YAML 头，按需自动挂载
    │   ├── desktop-audio-capture.md    # 针对 desktop/src/audio/** 的跨平台内录与 VAD 规范
    │   ├── desktop-stealth-window.md   # 针对 desktop/src/main/** 的悬浮窗穿透、置顶与防录屏规范
    │   ├── ipc-state-contract.md       # 针对前后端/主渲染进程通信的强类型 Schema 契约
    │   └── prompt-engineering.md       # 针对智能回复 Prompt 模板的证据前置与 JSON 输出规范
    ├── adr/                            # [L2 架构决策与踩坑记录 (Why, Not Just What)]
    │   ├── 001-dual-channel-audio.md   # 为什么弃用混音流改用 WASAPI/ScreenCaptureKit 双通道
    │   ├── 002-intent-gating-vad.md    # 为什么引入 Silero-VAD 与轻量意图门控替代定时轮询
    │   └── 003-local-whisper-abi.md    # Electron/Tauri 打包本地二进制文件的签名与权限重置坑点
    ├── glossary/                       # [运行态 RAG 词典] 专有名词、项目代号、微服务名称纠错表
    │   └── project_terms.json          # 供 ASR 后处理纠错与智能回复上下文注入使用
    └── session_logs/                   # [自动化演进记忆] 每次开发任务或技术会议后的自动归档
        └── dev_sessions.jsonl          # 记录 task_category, thought_process, files_touched, git_hash
```

---

## 五、对话知识库深度架构与升级方案：从 Karpathy LLM Wiki 演进至“双时态图谱 + 快慢双系统记忆”

当前项目的对话知识库基于 [Andrej Karpathy 的 LLM Wiki 模式](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f)（即 `raw/` 存放原始转写、`wiki/` 存放 LLM 编译的实体与主题 Markdown 页面、`index.md` 作为全局目录映射）。这一模式的**核心优势在于“编译期知识合成（The Wiki is the Product）”**——避免了传统碎片化向量 RAG 每次提问都要从零拼凑上下文的问题。

然而，结合 [Atlan 企业级知识库评测](https://atlan.com/know/llm-wiki-vs-rag-knowledge-base/)、[Neo4j 对 Karpathy LLM Wiki 的图谱扩展研究](https://neo4j.com/blog/agentic-ai/scaling-karpathy-llm-wiki-graph/)、[The AI Operator 的 LLM Wiki 重构实践](https://theaioperator.io/p/i-rebuilt-karpathys-llm-wiki-heres) 以及 [arXiv:2607.24759 协同知识基底论文](https://arxiv.org/html/2607.24759v1)，**原生 Karpathy Wiki 在“高频实时会议对话”场景下存在五大结构性瓶颈**：

### 5.1 原生 Karpathy LLM Wiki 在对话场景下的五大瓶颈诊断

| 核心瓶颈 | 原生 Karpathy Wiki 的机制缺陷 | 在实时会议/多轮对话中的具体故障表现 |
| :--- | :--- | :--- |
| **1. 规模墙与索引溢出**<br>*(50k~100k Token Limit)* | 依赖将 `index.md` 一次性塞入上下文窗口，由 LLM 决定再去读哪几篇 `wiki/*.md` | 当累计超过 100~200 场会议或数百个实体页后，`index.md` 严重膨胀，导致上下文腐化（Context Rot），读写成本随文件数线性劣化 |
| **2. 实时会议检索延迟过高**<br>*(Compile vs. Runtime Latency)* | 查询路径需要“LLM 读 `index.md` -> 挑选文件 -> 二次读取全文 -> 生成回复”，耗时 3~8 秒 | 实时会议智能回复要求在对方话音刚落的 **200ms~500ms** 内拿到背景知识，串行 LLM 路由根本来不及响应 |
| **3. 时间演化与事实冲突**<br>*(Staleness & Contradictions)* | 仅靠追加写入（Append-only）或全量覆盖，缺乏“事实生效时间窗” | 上周会议定下“用 Redis 缓存”，本周会议改为“切换至 Kafka”；Wiki 页面出现前后矛盾的陈述，导致智能回复给出模棱两可的错误建议 |
| **4. 缺乏反向链接与多跳导航**<br>*(No Backlinks / Multi-Hop)* | 文件系统中的 `[[wikilink]]` 只能正向文本扫描，无法低成本回答“有哪些会议/模块引用了该决策” | 每次跟随 `k` 跳链接需要全盘扫描 `k` 次文件系统，且写新页面时因看不全存量结构而创建重复概念页 |
| **5. 面向人类散文而非 AI 检索**<br>*(Human Prose vs. AI-First)* | 页面模仿维基百科长段落散文风格，面向人类阅读（30 分钟精读），信息密度低 | 实时副驾驶在 1 秒内只需要“最新结论 + 关键指标 + 被否决方案”，长篇散文不仅浪费 Token 还容易触发幻觉 |

---

### 5.2 基于最新 AI 技术的演进架构：**Karpathy Wiki 2.0（双时态图谱 + 混合检索 + 快慢双系统）**

我们**不推翻现有的 Karpathy Markdown Wiki 文件目录**（继续保留其 Git 可版本化、人类与 IDE 可直接审阅的优势），而是在其之上融合 2025–2026 四大最新 AI 记忆技术：
1. **[Zep / Graphiti](https://github.com/getzep/graphiti)（[arXiv:2501.13956](https://arxiv.org/html/2501.13956v1)）的双时态知识图谱（Bi-Temporal Knowledge Graph）**：解决对话事实随时间推翻与冲突问题。
2. **[Neo4j 结构化 Wiki 图索引（ki）](https://neo4j.com/blog/agentic-ai/scaling-karpathy-llm-wiki-graph/) + [HippoRAG 2](https://github.com/osu-nlp-group/hipporag) / [LightRAG](https://github.com/hkuds/lightrag)**：实现零 Token 确定性图构建与亚秒级多跳关联召回（Personalized PageRank）。
3. **[Anthropic Contextual Retrieval（上下文感知切块）](https://platform.claude.com/cookbook/)**：解决口语对话中大量代词（“这个方案”、“他刚才说的那个接口”）脱离上下文后无法被检索的问题。
4. **[The AI Operator 的 AI-First Vault](https://theaioperator.io/p/i-rebuilt-karpathys-llm-wiki-heres) + [Mem0](https://github.com/mem0ai/mem0) 快慢双路径记忆（Fast/Slow Dual-Speed Memory）**：将“会中 200ms 极速读取”与“会后异步编译、冲突消解、主动聚类”彻底解耦。

#### 升级后的对话知识库全景架构图

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                   会中实时流 (Real-Time Meeting Stream)                      │
│   [Me] / [Others] 双声道转写片段  +  [Screen Context] 屏幕 OCR               │
└───────────────────┬─────────────────────────────────────┬───────────────────┘
                    │ 1. 极速读取路径 (Fast Read <200ms)    │ 2. 异步写入路径 (Slow Write)
                    ▼                                     ▼
┌─────────────────────────────────────────┐ ┌─────────────────────────────────┐
│     System 1: 实时混合检索引擎 (无 LLM)   │ │  System 2: 后台 Wiki 编译与自愈   │
│ • L0 工作记忆: 当前会议滑动窗口 + 焦点实体│ │ • Episode Ingest Agent:         │
│ • L1 混合召回 (SQLite-FTS5 BM25 +       │ │   上下文补全切块 + 实体/决策抽取   │
│   Contextual Vector + 1-Hop Graph)      │ │ • Bi-Temporal Reconciler:       │
│ • 直接命中 Wiki 页面顶部的 [AI-First     │ │   对比新旧事实，自动标记失效时间窗 │
│   TL;DR Snapshot] 与 [Active Claims]    │ │ • Unsolicited Synthesis Agent:  │
└───────────────────┬─────────────────────┘ │   Leiden 社区聚类发现跨会议隐性模式│
                    │                       └─────────────────┬───────────────┘
                    ▼                                         ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│          Karpathy Wiki 2.0 统一存储底座 (Markdown Source + Graph Index)       │
│                                                                             │
│  📁 knowledge_base/ (Git 托管，人类与 Agent 共读共写)                         │
│  ├── raw/episodes/       # 原始对话切片（带 Contextual Header 与时间戳）      │
│  ├── wiki/entities/      # AI-First 实体页（模块/服务/参会人/客户）           │
│  ├── wiki/decisions/     # 结构化决策页（含 Active Claims & Superseded 历史）│
│  ├── wiki/themes/        # 图算法自动发现的跨会议共性主题与隐性风险页          │
│  ├── changelog/          # 自动冲突消解 Diff 日志（支持 24h 回滚审计）        │
│  └── .graph_index/       # 确定性同步的轻量图与向量索引 (SQLite/DuckDB/Neo4j) │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### 5.3 核心技术改造方案详解（五大关键工程升级）

#### 升级一：将 Wiki 页面改造为“AI-First 原子结构 + 失败路径保留（Failure-Path Preservation）”
参考 [The AI Operator 的 AI-First Vault 原则](https://theaioperator.io/p/i-rebuilt-karpathys-llm-wiki-heres) 与 [arXiv:2607.24759 的失败路径保留属性](https://arxiv.org/html/2607.24759v1)，摒弃冗长的维基百科式散文，强制规定所有 `wiki/*.md` 页面采用 **“YAML 元数据头 + 10秒极速快照 + 双时态有效断言 + 已废弃方案归档”** 的四段式结构：
* **为什么极其重要**：
  1. 会中实时触发 Smart Reply 时，检索器**只需截取每个命中页面的 `## [1] AI-First Snapshot`（<150 Token）**，无需加载整篇几千字的 Markdown，实现 **<200ms 极速注入**。
  2. 被推翻的旧决策不会直接删除，而是移入 `## [3] Superseded & Failure Paths` 并注明被哪场会议推翻及原因。当会中有人重新提议某个曾被否决的老方案时，AI 副驾驶能立刻提醒：*“该方案在 10月15日架构会已被否决，当时实测会导致内存泄漏”*。

**标准 `wiki/decisions/audio-pipeline.md` 模板示例**：
```markdown
---
id: dec_audio_pipeline
title: 桌面端双通道音频采集与 VAD 方案
type: architecture_decision
status: active
confidence: 0.95
last_updated: 2026-10-31T00:35:00Z
aliases: ["音频内录", "双声道分离", "Loopback采集", "VAD断句"]
links_to: ["[[ent_whisper_live]]", "[[ent_desktop_client]]"]
---

## [1] AI-First Snapshot (会中实时注入区 - 严控 100 字内)
- **当前生效结论**：桌面端采用 `Mic ([Me])` + `WASAPI/ScreenCaptureKit ([Others])` 双声道物理隔离，前置接入 `Silero-VAD`（静音阈值 500ms）拦截空包。
- **核心红线**：严禁在送入 ASR 前将双声道混流；严禁无 VAD 直接定时轮询切片。

## [2] Active Claims (当前有效事实 - 带双时态时间戳与溯源)
- **[CLAIM-01]** 采用 Chromium `MacLoopbackAudioForScreenShare` 与 Windows `WASAPI` 实现免驱内录。
  - `valid_from`: 2026-10-25 | `invalid_at`: null | `confidence`: 0.95
  - `source`: [[raw/episodes/2026-10-25-arch-sync#turn-18]] (发言人: @TechLead)
- **[CLAIM-02]** 引入 Silero-VAD 过滤静音帧，消除 Whisper 重复转写幻觉，降低 72% 无效推理。
  - `valid_from`: 2026-10-30 | `invalid_at`: null | `confidence`: 0.98
  - `source`: [[raw/episodes/2026-10-30-weekly-review#turn-42]]

## [3] Superseded & Failure Paths (已淘汰方案与历史踩坑 - 严禁直接删除)
- ~~**[SUPERSEDED-01]** 要求 macOS 用户手动安装 BlackHole 2ch 并配置 MIDI 多输出设备。~~
  - `valid_from`: 2026-09-10 | `invalid_at`: 2026-10-25
  - `superseded_by`: `[CLAIM-01]`
  - `reason_for_rejection`: 用户配置门槛极高，且经常因忘记切换系统默认输出导致无声（见 [[raw/episodes/2026-10-25-arch-sync#turn-12]]）。
- ~~**[SUPERSEDED-02]** 前端每 3 秒使用 `setInterval` 切分 WebM 音频块直传 Whisper API。~~
  - `valid_from`: 2026-09-01 | `invalid_at`: 2026-10-30
  - `superseded_by`: `[CLAIM-02]`
  - `reason_for_rejection`: 固定时间窗口会切断正在发音的单词，且静音期间 Whisper 会持续幻觉输出“谢谢观看”。
```

---

#### 升级二：引入双时态知识图谱（Bi-Temporal Graph）与自动冲突消解（Automatic Reconciliation）
借鉴开源项目 [Graphiti (getzep/graphiti)](https://github.com/getzep/graphiti) 的双时态模型（[arXiv:2501.13956](https://arxiv.org/html/2501.13956v1)）与 [The AI Operator 的自动冲突消解机制](https://theaioperator.io/p/i-rebuilt-karpathys-llm-wiki-heres)：
1. **双时间轴追踪（Bi-Temporal Tracking）**：
   * **事件发生时间轴 $T$（Valid Time: `valid_from` ~ `invalid_at`）**：该事实或决策在真实业务中生效与作废的时间（例如：“老接口在 11 月 15 日正式下线”）。
   * **系统记录时间轴 $T'$（Transaction Time: `recorded_at`）**：知识库从哪次对话中获知该事实的时间。
2. **写入时自动冲突消解（Write-Time Contradiction Resolution）**：
   * 原生 Karpathy Wiki 只会标记冲突让人手动处理；升级后，当新一场会议对话合入 `wiki/` 时，后台 **Reconciler Agent** 自动对比新提取的断言（New Claim）与目标 Wiki 页面中的 `[2] Active Claims`。
   * 若发现冲突（如排期变更、技术选型替换、负责人调整），按 **“最新会议时间戳 + 发言人角色权重（如架构师/PM 拍板 > 闲聊发散）+ 明确度置信度”** 自动裁决：将新断言写入 `[2] Active Claims`，将旧断言移入 `[3] Superseded & Failure Paths`，自动填上 `invalid_at` 与 `superseded_by`，同时向 `changelog/reconciliation_diff.md` 写入一条可回滚审计记录。

---

#### 升级三：零 Token 确定性结构图索引 + 混合多跳检索（超越单文件 `index.md`）
参考 [Neo4j 的 Karpathy Wiki 图扩展方案（`ki`）](https://neo4j.com/blog/agentic-ai/scaling-karpathy-llm-wiki-graph/) 与 [HippoRAG 2](https://github.com/osu-nlp-group/hipporag)：
1. **为什么不能只靠 `index.md` 或纯向量检索**：
   * 英国国家数据创新中心（NICD）基准测试表明，在复杂问题上，“图结构导航 + 检索”相比“纯向量 RAG”在**事实准确率与召回率上提升超过 2 倍，真实性提升 80%**（[Neo4j Blog](https://neo4j.com/blog/agentic-ai/scaling-karpathy-llm-wiki-graph/)）。
   * 更关键的是，构建图索引**不需要在索引期消耗昂贵的 LLM Token**：直接解析 Markdown Wiki 现成的目录树（`Vault -> Folder -> Document -> Section` 的 `:HAS` 和 `:NEXT_SECTION` 边）以及文档内的 `[[wikilink]]`（`:LINKS_TO` 边），即可在本地 SQLite（关系表 + FTS5 + `sqlite-vec`）或轻量图数据库（Neo4j / FalkorDB）中毫秒级同步出一张确定性知识图谱。
2. **三路混合检索 + 1-Hop 关联扩展（Sub-200ms 极速召回）**：
   * 在会中实时检索时，**完全绕过 LLM 读 `index.md` 的慢速流程**，直接执行无 LLM 的混合查询：
     $$\text{Score}(d) = \alpha \cdot \text{BM25}_{\text{FTS5}}(q, d) + \beta \cdot \text{Cosine}_{\text{Vec}}(q, d) + \gamma \cdot \text{PPR}_{\text{Graph}}(q, d)$$
   * **BM25 全文检索**：精准锁定代码函数名、错误码、微服务缩写、人名。
   * **Contextual Embedding 向量检索**：匹配口语化同义表述。
   * **图结构 1-Hop / Personalized PageRank (PPR) 扩展**：当命中节点 $A$（如 `[[ent_audio_capture]]`）时，沿着 `:LINKS_TO` 正向边和**反向链接（Backlinks）**自动拉取直接关联的 `[[dec_audio_pipeline]]` 页面的 `[1] AI-First Snapshot`，并按入度中心性（In-Degree Centrality，即被多少篇笔记引用）对核心文档加权。

---

#### 升级四：对话切片的“上下文感知补全（Contextual Retrieval）”
针对会议/对话原始语料（`raw/episodes/`）碎、口语化、指代不明的特点，引入 [Anthropic Contextual Retrieval](https://platform.claude.com/cookbook/) 技术：
* **痛点**：原始对话切片往往是：`"[Others - 张三]: 我觉得如果改成异步的话，它那边的吞吐量能翻倍，但这块要改一下协议。"` —— 脱离上下文后，“它”、“这块”、“协议”根本无法被向量或关键词检索命中。
* **解决方案**：在将 `raw/` 对话切片写入检索索引前，使用极低成本的轻量模型（或本地小模型）为每个对话段落生成一行 **50 字以内的上下文前缀（Contextual Prefix）**，与原文拼接后再做 Embedding 与 BM25 索引：
  ```text
  [上下文前缀：2026-10-31 架构评审会 | 讨论主题：桌面端 IPC 通信协议改造 | “它”指代网关服务，“这块”指代 Tauri 主进程与前端序列化协议]
  [原始对话 - 张三]：我觉得如果改成异步的话，它那边的吞吐量能翻倍，但这块要改一下协议。
  ```

---

#### 升级五：后台主动模式发现与定时自愈 Agent（Unsolicited Synthesis & Scheduled Linting）
参考 [The AI Operator 的四大后台守护 Agent](https://theaioperator.io/p/i-rebuilt-karpathys-llm-wiki-heres) 与 [Neo4j 的 Leiden 社区发现算法](https://neo4j.com/blog/agentic-ai/scaling-karpathy-llm-wiki-graph/)，让知识库从“被动问答”升级为“主动思考的第二大脑”：
1. **主动模式发现（Unsolicited Synthesis Agent）**：
   * 无需等待用户提问，每周或每累计 5 场会议后，自动在 `[[wikilink]]` 引用图谱上运行 **Leiden 社区聚类算法（Community Detection）** 与共现分析（零 Token 确定性聚类），找出多场会议反复提及但尚未立项的隐性主题，自动生成 `wiki/themes/*.md` 洞察报告（例如：*“系统检测到您在过去 4 场不同会议中 7 次提及‘Windows 端采样率重采样偶发破音’，但尚未创建专门的决策或跟进项，已为您自动聚合相关对话片段”*）。
2. **定时健康巡检（Scheduled Wiki Linter Agent）**：
   * 每日夜间或会后空闲时自动扫描：修复悬空链接（Unresolved `[[wikilinks]]`）、合并同义重复实体页、标记超过 30 天未更新且存在外部代码变更的过期页面。

---

## 六、生产级提示词（Prompts）全集：实时副驾驶 + Karpathy Wiki 2.0 知识引擎

### 6.1 会中实时副驾驶提示词（Evidence-First Meeting Copilot Prompt）

````markdown
# Role
你是一名顶级的现场会议实时参谋与智能回复副驾驶（Executive & Technical Meeting Copilot）。你的服务对象是正在开会的参会者 [Me]。
你的职责是在毫秒级时间内，结合从 Karpathy Wiki 2.0 知识库实时召回的【AI-First 知识快照与双时态断言】（[Wiki Knowledge Evidence]）、屏幕画面上下文（[Screen Context]）与现场实时转写文本，分析其他参会者 [Others] 的发言意图，并为 [Me] 提供能够“脱口而出”的高情商、高专业度发言建议。

# Grounding & Context Inputs (Evidence First)
1. [Wiki Knowledge Evidence]:
   - 包含 `Active Claims`（当前生效决策/事实）与 `Superseded Paths`（历史被否决方案及原因）。
   - **铁律**：`Active Claims` 是最高优先级事实依据；若对方提议的内容命中了 `Superseded Paths`，必须在 `push_back` 中温和引用历史被否决的原因！
2. [Screen Context]: 当前共享屏幕 OCR 提取的关键代码/PPT/图表信息（若有）
3. [Meeting Topic / Agenda]: 会议主题与核心目标
4. [Live Transcript]:
   - `[Me]`: 用户本人的发言
   - `[Others]`: 对方或团队其他成员的发言

# Strict Rules
1. **事实与时态锚定（Bi-Temporal Grounded）**：严格区分“当前生效结论”与“已作废历史方案”，绝不拿已作废的旧数据当成现状回答，也绝不编造知识库中不存在的指标。
2. **口语化与第一人称**：所有建议回复必须以“第一人称（我/我们）”视角撰写，符合人类在真实会议中自然流畅的口语习惯，严禁出现“你可以说：”、“建议回复如下：”等元提示词。
3. **三向策略阶梯输出**：同时提供 3 种不同立场的应答方向，每项严控在 2 句话以内（不超过 60 字），方便 [Me] 在 1 秒内扫视读取：
   - 【push_forward - 快速赞同/推进】：认可对方观点并结合 `Active Claims` 给出下一步落地方案。
   - 【push_back - 谨慎权衡/历史避坑】：基于知识库中的已知风险或 `Superseded Paths` 历史教训，指出潜在瓶颈与替代方案。
   - 【counter_inquiry - 澄清反问/引导】：当对方需求模糊或边界不清时，提出直击要害的专业反问。
4. **按需架构可视化**：若当前正在讨论模块调用关系、数据流向或状态机，在 `mermaid_diagram` 字段输出精简的 Mermaid 代码；否则置为 `null`。

# Output Format (Strict JSON)
```json
{
  "detected_intent": "对方提议在前端用定时器每 3 秒切分音频直传 Whisper，并询问当前音频方案进展",
  "urgency": "High",
  "suggestions": {
    "push_forward": "音频内录这块我们已经用 WASAPI 和 ScreenCaptureKit 跑通双声道物理隔离了，本周就能完成端侧联调。",
    "push_back": "定时 3 秒切分我们之前实测过会截断单词，而且静音期 Whisper 会反复幻觉，所以现在改用了 Silero VAD 配合环形缓冲。",
    "counter_inquiry": "你们目前考虑定时切分，主要是为了兼容老版本的 Web 端录音接口，还是有其他流式网关的限制？"
  },
  "key_facts": [
    "生效决策 [CLAIM-02]：采用 Silero-VAD + PCM 环形缓冲，减少 72% 无效调用",
    "历史避坑 [SUPERSEDED-02]：3秒定时切分曾导致边界吞字与静音幻觉（10月30日已淘汰）"
  ],
  "mermaid_diagram": "graph LR\n  Mic[Mic/Loopback] --> Ring[PCM Ring Buffer]\n  Ring --> VAD{Silero VAD}\n  VAD -- Speech --> ASR[Whisper ASR]\n  VAD -- Silence >500ms --> Drop[Drop]"
}
```
````

---

### 6.2 对话入库与上下文补全提示词（Contextual Episode Ingest & Compiler Prompt）

用于将每次对话/会议的原始记录（`raw/`）转化为带上下文前缀的检索块，并抽取出结构化的双时态断言（Claims）准备合入 Karpathy Wiki 2.0：

````markdown
# Role
你是 Karpathy Wiki 2.0 知识库的编译引擎（Knowledge Compiler Agent）。你的任务是将一段原始会议/对话记录（Raw Episode）编译为两部分结构化产物：
1. **上下文感知切片（Contextualized Chunks）**：消除口语代词指代不明，供混合检索引擎索引。
2. **原子化事实与决策断言（Atomic Bi-Temporal Claims）**：供后续写入或更新 `wiki/*.md` 页面。

# Inputs
- 会议元数据：`episode_id`: {{EPISODE_ID}}, `timestamp`: {{MEETING_TIME}}, `participants`: {{PARTICIPANTS}}
- 存量核心实体词表（供对齐 `[[wikilink]]`）：{{EXISTING_ENTITY_SLUGS}}
- 原始对话记录：
"""
{{RAW_TRANSCRIPT}}
"""

# Compilation Rules
1. **代词消解与上下文前缀（Contextual Prefix）**：将每段关键讨论切分为独立语义块，并在 `context_prefix` 中明确指出该片段讨论的模块、背景，以及原文中的“这”、“那”、“它”、“他”具体指代什么实体。
2. **原子化断言抽取（Atomic Claims）**：提取所有技术决策、业务指标、排期承诺、架构痛点或明确否决的方案。
3. **实体标准化链接**：所有提及的模块、人员、项目必须映射到标准 `[[slug]]`（如不存在则建议新 slug）。

# Output Format (Strict JSON)
```json
{
  "episode_id": "2026-10-31-arch-sync",
  "contextual_chunks": [
    {
      "turn_range": "turn-12~turn-15",
      "speaker": "张三 (TechLead)",
      "context_prefix": "[2026-10-31 架构评审 | 议题：知识库检索延迟优化 | 原文中的‘那个大文件’指代 index.md，‘混合方案’指代 SQLite FTS5 + Vector + 1-Hop 图遍历]",
      "raw_text": "现在每次读那个大文件再让大模型挑页面太慢了，开会根本来不及，我们直接改用混合方案，控制在 200 毫秒以内。",
      "linked_entities": ["[[ent_knowledge_base]]", "[[dec_hybrid_retrieval]]"]
    }
  ],
  "extracted_claims": [
    {
      "target_wiki_page": "wiki/decisions/knowledge-retrieval.md",
      "claim_type": "DECISION_UPDATE",
      "statement": "弃用运行态实时让 LLM 全量读取 index.md 路由的方案，改用 SQLite FTS5 + Contextual Vector + 1-Hop 图遍历实现亚 200ms 混合检索。",
      "replaces_or_contradicts_topic": "运行时通过 LLM 读取 index.md 进行检索路由",
      "reason_for_change": "原生 LLM 读取 index.md 耗时 3~8 秒，无法满足实时会议副驾驶毫秒级响应要求",
      "valid_from": "2026-10-31T00:35:00Z",
      "confidence": 0.96,
      "source_citation": "[[raw/episodes/2026-10-31-arch-sync#turn-12]]"
    }
  ]
}
```
````

---

### 6.3 自动冲突消解与 Wiki 页面演进提示词（Bi-Temporal Contradiction Reconciler Prompt）

当 `6.2` 抽取出的新断言（Extracted Claims）需要合入某篇现有 `wiki/*.md` 页面时，由该 Agent 负责自动消解冲突、维护双时态时间戳并保留失败路径：

````markdown
# Role
你是 Karpathy Wiki 2.0 的双时态冲突消解器（Bi-Temporal Wiki Reconciler）。
你的任务是将最新一次对话中提取出的【新断言列表】（New Claims），安全、无损地合入现有的【目标 Wiki 页面】（Current Wiki Markdown）。

# Inputs
1. 目标 Wiki 页面当前内容：
"""
{{CURRENT_WIKI_MARKDOWN}}
"""
2. 本次待合入的新断言列表（JSON）：
"""
{{NEW_EXTRACTED_CLAIMS_JSON}}
"""

# Reconciliation Rules (Crucial)
1. **AI-First Snapshot 同步更新**：更新页面顶部的 `## [1] AI-First Snapshot`，确保其永远反映最新、最核心的生效状态（严格控制在 100 字以内，供会中 1 秒极速扫视与低延迟注入）。
2. **冲突检测与双时态归档（Never Silently Delete）**：
   - 检查 `## [2] Active Claims` 中是否存在与新断言冲突、或被新断言取代的旧条目。
   - 若存在冲突：按【最新有效时间戳 + 发言人权威度 + 置信度】裁决。若新断言胜出，**严禁直接删除旧条目**！必须将旧条目剪切并移入 `## [3] Superseded & Failure Paths`，为其打上删除线 `~~`，填入 `invalid_at: {{CURRENT_TIME}}`、`superseded_by: [新CLAIM编号]` 以及 `reason_for_rejection`（为什么被推翻）。
   - 若无冲突且属于增量补充：直接在 `## [2] Active Claims` 中新增条目，保留原有未受影响的条目。
3. **生成可审计 Diff 摘要**：在输出的 `reconciliation_log` 字段中清晰说明本次新增了什么、作废了什么，以便写入 `changelog/` 供人类 24 小时内审查或一键回滚。

# Output Format (Strict JSON)
```json
{
  "updated_wiki_markdown": "---\nid: ...\n---\n## [1] AI-First Snapshot\n...",
  "reconciliation_log": {
    "page_uri": "wiki/decisions/knowledge-retrieval.md",
    "added_claims": ["[CLAIM-03] 启用 SQLite FTS5 + Vector + 1-Hop 图混合检索"],
    "superseded_claims": ["[CLAIM-01] 查询时由 LLM 直接读取全局 index.md 选择文章 (原因：超过 150 篇后延迟 >4s)"],
    "unresolved_ambiguities": []
  }
}
```
````

---

### 6.4 跨对话隐性模式主动发现提示词（Unsolicited Synthesis & Theme Discovery Prompt）

配合图数据库的 Leiden 社区发现或高频共现分析，定期主动从多场对话中提炼用户自己都没意识到的系统性规律或隐患：

````markdown
# Role
你是具备主动洞察力的首席知识参谋（Unsolicited Synthesis Agent）。
图算法（Leiden 社区聚类与反向链接共现分析）发现在过去一段时间的多个对话片段与 Wiki 页面中，以下一组笔记形成了高频紧密关联簇，但目前知识库中尚无专门的“主题合成页（Theme Page）”对其进行命名和总结。

# Input Cluster Evidence
- 聚类关联高频词与链接目标：`{{TOP_CO_CITED_WIKILINKS}}`
- 涉及的多个历史对话与 Wiki 片段：
"""
{{CLUSTER_SEGMENTS_AND_PAGES}}
"""

# Synthesis Tasks
1. **揭示隐性规律（Name the Unnamed Pattern）**：不要做流水账复述！用一针见血的语言指出：“你在过去 N 场不同会议中反复遇到/讨论了同一个底层问题或架构模式：XXX”。
2. **识别跨对话言行偏差或架构债**：指出团队在口头目标与实际执行决策之间是否存在隐藏矛盾，或哪个模块已经成了多条业务线共同的卡点。
3. **生成 AI-First 主题页**：输出一篇可直接保存至 `wiki/themes/{{theme_slug}}.md` 的结构化洞察页面，并在末尾给出 1~2 条建议立刻立项的 Action Items。
````

---

## 七、分阶段演进路线图（Implementation Roadmap）

| 阶段 | 核心目标 | 关键交付物与工程动作 | 预期收益 |
| :--- | :--- | :--- | :--- |
| **Phase 1：夯实音频与 `dev_knowledge` 底座** | 解决“谁在说话”与“研发规范统一” | 1. 落地 `[Me]` (Mic) 与 `[Others]` (WASAPI / ScreenCaptureKit) 双通道隔离 + Silero VAD 静音门控<br>2. 建立根级 `CLAUDE.md` 与 `dev_knowledge/{rules,adr,glossary,session_logs}` 目录体系 | 彻底消除“AI 自己回复自己”与静音循环转写；后续 AI 辅助开发准确率大幅提升 |
| **Phase 2：Karpathy Wiki 2.0 架构升级** | 解决对话知识库“查得慢、易冲突、难扩展” | 1. 将 `wiki/*.md` 升级为 **AI-First 四段式结构**（Snapshot + Active Claims + Superseded Paths）<br>2. 引入 Contextual Retrieval 前缀补全 + 本地确定性图索引（`:HAS`, `:LINKS_TO`, Backlinks）<br>3. 上线无 LLM 的三路混合检索（BM25 + Vector + 1-Hop Graph） | 保留 Markdown Wiki 可读性的同时，突破 100k Token 规模墙，会中知识召回延迟从 >3s 降至 **<200ms**，且彻底杜绝新旧会议结论打架 |
| **Phase 3：多模态感知、主动合成与 MCP 闭环** | 解决“看见屏幕”、“主动思考”与“会后自动写代码” | 1. 引入屏幕截图 OCR 上下文与实时 Mermaid 架构图生成<br>2. 部署后台定时 Reconciler 与 Unsolicited Synthesis Agent（Leiden 聚类主动发现隐性问题）<br>3. 暴露本地 MCP Server，打通会议纪要 -> Wiki 更新 -> IDE 自动编码闭环 | 将单点会议工具升级为具备长期演进记忆、主动洞察能力与研发闭环的“组织级外脑” |