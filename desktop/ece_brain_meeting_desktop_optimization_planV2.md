# -ECE-Brain-Meeting 桌面端（/desktop/）与 dev_knowledge 深度优化方案

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
│   • 证据优先知识增强 (Evidence-First RAG + dev_knowledge)      │
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
4. **缺乏多模态感知与外部知识沉淀（`dev_knowledge` 断层）**：
   * **运行态断层**：滑动窗口丢失历史关键议题，看不见屏幕上正在投屏展示的代码、架构图或 PPT，且未与项目研发知识库（`dev_knowledge`）打通。
   * **研发态断层**：项目自身的 `dev_knowledge` 往往只是静态堆砌的说明文档，缺乏面向后续迭代与 AI 编程助手（如 Claude Code / Cursor）的模块化规则、跨平台踩坑记录（ADR）和会议结论回流机制。

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
   * 当会议有人共享屏幕展示 PPT、架构图或代码 PR 时，纯靠语音（例如对方说“大家看左边这个模块”）AI 无法理解指代内容。
   * 参考 [Screenpipe](https://github.com/mediar-ai/screenpipe) 与 [Cue](https://github.com/Blueturboguy07/cue)，支持在触发智能回复时按需截取当前共享屏幕画面（或通过本地轻量 OCR 提取画面文字），作为 `[Screen Context]` 一并注入 Prompt。

### 3.2 决策层优化：抢答式预检索（Speculative RAG）+ 双模触发引擎
1. **两段式意图门控与预热（Speculative Pre-fetch）**：
   * 参考 [Meetingly-AI](https://github.com/iskandaryv/meetingly-ai) 与 [EchoAI Helper](https://github.com/colakang/echoai_helper)，当检测到 `[Others]` 正在连续发言超过 3 秒且出现疑问词或技术实体名词时，**不等对方把话说完**，后台立即异步启动 `dev_knowledge` 向量/关键词预检索。
   * 一旦 VAD 检测到句尾停顿（300ms~500ms 静音），已检索好的知识块（Evidence）与完整问题立即拼接发送给高速推理模型，将首字返回时间（TTFT）压缩至 500ms 以内。
2. **自动 + 手动混合触发（Hybrid Trigger Mode）**：
   * 参考 [Devleed/meeting-copilot](https://github.com/Devleed/meeting-copilot)，提供状态栏一键切换：
     * **Auto Copilot 模式**：由轻量意图分类器自动识别提问与争议点并弹出卡片。
     * **Manual Push-to-Ask 模式**：持续累积最近 60 秒音频/转写窗口，用户按下快捷键（如 `Alt + Z`）才触发推理，彻底杜绝嘈杂多人讨论环境下的误触发。

### 3.3 交互与功能层优化：从“只给文字”升级为“全周期参谋”
1. **分级流式回复卡片（Tiered Response Cards）**：
   * **Tier 1 (Instant Pill - 1秒内)**：1~2 句直接应答口径，供用户立即脱口而出。
   * **Tier 2 (Key Bullets - 2秒内)**：3 个核心支撑要点（关联 `dev_knowledge` 中的架构指标、排期数据或风险点）。
   * **Tier 3 (Follow-up Question)**：把话语权转回对方的专业反问句。
2. **工程会议实时架构图生成（Live Mermaid Diagramming）**：
   * 参考 [Natively ROADMAP](https://github.com/Natively-AI-assistant/natively-cluely-ai-assistant/blob/main/ROADMAP.md)，当检测到会议正在讨论系统设计、微服务调用链或状态流转时，自动在侧边栏渲染 Mermaid 架构图/时序图，辅助研发团队快速对齐脑图。
3. **中途入会速览（Late Join Recap）与人机协同笔记**：
   * 参考 [Amurex](https://github.com/thepersonalaicompany/amurex) 提供 **"Catch Me Up（过去 5 分钟发生了什么）"** 按钮，一键生成：`[当前讨论议题]` + `[各方核心分歧]` + `[待我拍板事项]`。
   * 参考 [Hyprnote](https://github.com/fastrepl/hyprnote) 提供极简速记槽（Quick Jot），用户输入简短关键词（如 `网关超时 -> 改异步队列`），会后由 AI 结合完整录音自动扩写为详实的研发会议纪要。

---

## 四、`dev_knowledge` 专项优化方案：赋能后续迭代与智能副驾驶

在 `-ECE-Brain-Meeting` 项目中，**`dev_knowledge`（研发知识体系）** 承担着双重战略角色：
- **对内（面向研发迭代与 AI Coding Agent）**：作为项目演进的“外部大脑”，指导开发者与 AI 编程工具（Claude Code / Cursor / Windsurf）理解架构边界、平台坑点与协议契约，避免改崩存量代码。
- **对外（面向会议运行态 RAG 与开发工作流）**：作为会议智能回复的“领域知识底座”，并在会后把会议讨论出的技术决策反向沉淀回代码库。

### 4.1 架构重塑：基于“渐进式披露（Progressive Disclosure）”重构 `dev_knowledge` 目录

本仓库以 **Cursor rules（`.cursor/rules/*.mdc`）为 L0 总控**，不依赖根目录 `CLAUDE.md`。`dev_knowledge` 承担「索引 + 按路径懒加载规则 + ADR/会话沉淀」：

```
-ECE-Brain-Meeting/
├── .cursor/rules/                      # [L0 总控] alwaysApply / globs 作用域规则
│   ├── desktop-architecture.mdc
│   ├── desktop-asr-whisper.mdc
│   └── desktop-audio-dual-track.mdc
└── desktop/dev_knowledge/
    ├── INDEX.md                        # 知识库全局导航图与模块维护规范
    ├── rules/                          # [L1] 带 paths YAML 头，与 Cursor globs 呼应
    │   ├── desktop-audio-capture.md
    │   └── desktop-stealth-window.md
    ├── adr/                            # [L2] 试过什么 → 为何失败 → 最终方案
    │   ├── 001-dual-channel-audio.md
    │   ├── 002-intent-gating-vad.md
    │   └── 003-local-whisper-abi.md
    ├── glossary/project_terms.json     # ASR/Whisper 后处理纠错
    └── session_logs/dev_sessions.jsonl
```

### 4.2 赋能后续开发的五大核心机制

#### 1. 引入带路径作用域的模块化规则（Path-Scoped Rules）
参考 [shanraisshan/claude-code-best-practice](https://github.com/shanraisshan/claude-code-best-practice/blob/main/CLAUDE.md)，在 `dev_knowledge/rules/*.md` 顶部添加 `paths` YAML Frontmatter。当开发者或 AI 助手修改 `/desktop/` 下的音频或窗口代码时，自动精准加载对应规范：
```markdown
---
paths:
  - "desktop/src/audio/**"
  - "desktop/src-tauri/src/audio/**"
---
# Desktop Audio Pipeline Rules
1. 必须保持 `[Me]` (Mic) 与 `[Others]` (System Loopback) 通道物理隔离，严禁在送入 ASR 前混音成单声道。
2. 修改原生音频模块后，必须同时验证 macOS (`ScreenCaptureKit` 权限检查) 与 Windows (`WASAPI` 采样率重采样至 16kHz Mono)。
3. 静音帧必须经过 VAD 门控拦截，连续静音 >1.5s 禁止向远端 ASR 发送空包。
```

#### 2. 沉淀“反模式与失败教训”（Record the "Why" & Failed Attempts）
参考 [Andrej Karpathy 的 LLM 编码防坑原则](https://github.com/multica-ai/andrej-karpathy-skills) 与 [Ahel Session Logging 规范](https://ahel.ai/catalog/item/logging-session)，后续开发最怕“AI 或新成员把曾经踩过坑的错误方案重新写一遍”。`dev_knowledge/adr/` 必须明确记录 **“试过什么方案 -> 为什么失败 -> 最终选了什么”**：
* **示例记录**：*“禁止使用前端 `setInterval` 每 3 秒切分一次 WebM 音频块直接调用 Whisper API —— 实测会导致单词在边界被截断且产生高额重复计费；必须通过 PCM 环形缓冲区配合 VAD 静音点切分。”*
* **跨平台原生依赖检查清单**：参考 [Natively 的 CLAUDE.md](https://github.com/Natively-AI-assistant/natively-cluely-ai-assistant/blob/main/CLAUDE.md)，在 `dev_knowledge` 中内置 Native Helper 修改核对表（macOS/Windows 兼容性、ASAR 解包路径、重新打包后麦克风/录屏权限重置处理、进程异常退出清理）。

#### 3. 自动化开发会话归档（Automated Dev Session Logging）
参考 [Logging Session 工作流](https://ahel.ai/catalog/item/logging-session)，在仓库配置脚本或 Git Commit / AI Session Stop Hook，每次完成一个功能开发、Bug 修复或重构后，自动追加一条结构化记录到 `dev_knowledge/session_logs/dev_sessions.jsonl`：
```json
{
  "session_id": "20261031_d8a1",
  "task_category": "feature",
  "user_query": "为 desktop 增加双通道音频采集与意图门控",
  "thought_process": "初期尝试前端混流无法区分说话人，改为系统内录独立流 + 轻量 JSON 意图分类器前置拦截",
  "final_result": "在 desktop/audio/loopback.ts 实现双流打标，API 调用量下降 72%",
  "files_touched": ["desktop/src/audio/loopback.ts", "desktop/src/copilot/intentGate.ts"],
  "git_hash": "a7f3c91"
}
```
这能让后续接手的开发者或 AI Agent 通过检索 `dev_sessions.jsonl`，瞬间还原每一个模块的历史演进脉络。

#### 4. 运行态“证据优先（Evidence-First）”注入与 ASR 术语纠错
在会议进行时，`dev_knowledge` 还将直接赋能智能回复的质量：
* **专有词汇热词纠错（Glossary Boosting）**：`dev_knowledge/glossary/project_terms.json` 维护项目内部的微服务名、缩写、人名（例如将语音误识别的“一C一脑”自动纠正为 `ECE-Brain`），作为 Whisper `initial_prompt` 或后处理字典。
* **证据前置（Evidence-First Prompting）**：参考 [Natively 的 Prompt 架构](https://github.com/Natively-AI-assistant/natively-cluely-ai-assistant/activity)，在调用大模型生成会议回复时，先将从 `dev_knowledge` 检索到的架构文档/接口定义置于 Prompt 最前端，再放入实时语音转写，确保生成的回复 100% 符合项目真实代码现状。

#### 5. 构建“会议 <-> 开发”双向闭环：暴露本地 MCP Server
参考 [Screenpipe 的 Claude Code MCP 集成](https://prompts.brightcoding.dev/blog/screenpipe-the-revolutionary-memory-tool-every-developer-needs)，为 `-ECE-Brain-Meeting/desktop` 增加一个轻量级 **MCP (Model Context Protocol) Server**：
* **正向（dev_knowledge -> 会议）**：开会讨论技术方案时，桌面端直接读取本地仓库的 `dev_knowledge` 和代码结构，实时给出准确的架构演进建议。
* **反向（会议 -> dev_knowledge & IDE）**：开完架构评审会后，开发者在 IDE（Cursor / Claude Code）中直接输入：*“调用 ECE-Brain-Meeting MCP 获取刚才会议里确定的 API 字段变更，更新 `dev_knowledge/ipc-state-contract.md` 并修改对应代码”*，实现**“会议即文档，结论即代码”**的无缝研发闭环。

---

## 五、生产级提示词（Prompt）与 `dev_knowledge` 模板全集

### 5.1 核心系统提示词：证据优先的实时会议副驾驶（Evidence-First Meeting Copilot）

````markdown
# Role
你是一名顶级的现场会议实时参谋与智能回复副驾驶（Executive & Technical Meeting Copilot）。你的服务对象是正在开会的参会者 [Me]。
你的职责是在毫秒级时间内，结合项目研发知识库（[Dev Knowledge Evidence]）、屏幕画面上下文（[Screen Context]）与现场实时转写文本，分析其他参会者 [Others] 的发言意图，并为 [Me] 提供能够“脱口而出”的高情商、高专业度发言建议。

# Grounding & Context Inputs (Evidence First)
1. [Dev Knowledge Evidence]: 从本地 `dev_knowledge` 检索到的项目架构、接口规范、排期与历史 ADR 事实（最高优先级事实依据，严禁违背）
2. [Screen Context]: 当前共享屏幕 OCR 提取的关键代码/PPT/图表信息（若有）
3. [Meeting Topic / Agenda]: 会议主题与核心目标
4. [Live Transcript]:
   - `[Me]`: 用户本人的发言
   - `[Others]`: 对方或团队其他成员的发言

# Strict Rules
1. **事实锚定（100% Grounded）**：若 `[Dev Knowledge Evidence]` 中包含具体架构设计、性能指标或排期约束，必须在回复中优先引用，绝不编造虚假数据。
2. **口语化与第一人称**：所有建议回复必须以“第一人称（我/我们）”视角撰写，符合人类在真实会议中自然流畅的口语习惯，严禁出现“你可以说：”、“建议回复如下：”等元提示词。
3. **三向策略阶梯输出**：同时提供 3 种不同立场的应答方向，每项严控在 2 句话以内（不超过 60 字），方便 [Me] 在 1 秒内扫视读取：
   - 【push_forward - 快速赞同/推进】：认可对方观点并结合现有架构给出下一步落地方案。
   - 【push_back - 谨慎权衡/风控】：基于 `dev_knowledge` 中的已知技术限制或历史踩坑点，温和指出风险与替代方案。
   - 【counter_inquiry - 澄清反问/引导】：当对方需求模糊或边界不清时，提出直击要害的专业反问。
4. **按需架构可视化**：若当前正在讨论模块调用关系、数据流向或状态机，在 `mermaid_diagram` 字段输出精简的 Mermaid 代码；否则置为 `null`。

# Output Format (Strict JSON)
```json
{
  "detected_intent": "对方询问桌面端如何避免静音期间 Whisper 重复转写历史语音",
  "urgency": "High",
  "suggestions": {
    "push_forward": "这个问题我们已经定位到了，接下来会在音频采集层前置接入 Silero VAD，在静音超过 500 毫秒时直接截断空包。",
    "push_back": "单纯调高 Whisper 的 no_speech_threshold 容易漏掉轻声发言，我们实测还是用端侧环形缓冲区配合 VAD 门控最稳妥。",
    "counter_inquiry": "目前你们在测试环境下触发重复转写，主要是在外放会议场景还是佩戴耳机的安静场景？"
  },
  "key_facts": [
    "知识库依据：ADR-002 规定采用 Silero-VAD + PCM 环形缓冲",
    "性能指标：可减少约 70% 无效 ASR 推理调用"
  ],
  "mermaid_diagram": "graph LR\n  Mic[Mic/Loopback] --> VAD{Silero VAD}\n  VAD -- Speech --> ASR[Streaming Whisper]\n  VAD -- Silence --> Drop[Drop Frame]"
}
```
````

---

### 5.2 意图识别与抢答预热提示词（Intent & Speculative RAG Trigger Prompt）

````markdown
# Task
你是一个超低延迟的会议语音流门控分类器。请分析刚刚捕获的最新语音片段（可能尚未完全说完整），判断是否需要触发主模型生成回复，或是否需要提前预检索 `dev_knowledge` 知识库。

# Input Transcript Window
"""
{{LATEST_TRANSCRIPT_WINDOW}}
"""

# Classification Categories
1. **DIRECT_QUESTION**: `[Others]` 直接向 `[Me]` 提问、点名或质询（动作：立即触发主模型 + 检索知识库）
2. **TECHNICAL_DEBATE**: 正在讨论技术选型、架构瓶颈、Bug 归因或排期争议（动作：立即触发主模型 + 检索知识库）
3. **PREFETCH_CANDIDATE**: `[Others]` 话还没说完，但已提及项目核心模块/技术名词，极可能在 3 秒内提问（动作：仅后台预检索 `dev_knowledge`，暂不弹窗）
4. **PASSIVE_LISTENING**: 单向宣讲、朗读文档、他人之间的无关闲聊（动作：静默忽略）

# Output Format (Valid JSON Only)
```json
{
  "category": "DIRECT_QUESTION" | "TECHNICAL_DEBATE" | "PREFETCH_CANDIDATE" | "PASSIVE_LISTENING",
  "should_trigger_ui": true | false,
  "should_prefetch_rag": true | false,
  "rag_search_queries": ["Silero VAD 静音门控", "WASAPI 双声道分离"],
  "topic_summary": "10字以内概括当前焦点"
}
```
````

---

### 5.3 中途入会速览提示词（Late Join / "Catch Me Up" Prompt）

借鉴 [Amurex](https://github.com/thepersonalaicompany/amurex) 的迟到速览与阶段复盘能力，当用户走神或中途入会点击 **“速览（Catch Me Up）”** 时调用：

````markdown
# Role
你是高效的高管会议速记参谋。用户 [Me] 刚刚将注意力回到会议中，请基于最近 {{TIME_WINDOW}} 分钟的会议转写记录，用极度精炼的卡片帮 [Me] 在 5 秒内掌握全局。

# Input Transcript
"""
{{RECENT_TRANSCRIPT}}
"""

# Output Format (Strict Markdown)
- 🎯 **当前正在讨论**：[1 句话点明核心议题与进展]
- ⚡ **核心共识与分歧**：
  - **已达成共识**：[简述]
  - **争议焦点**：[`[Others]` 谁持什么观点，卡在什么问题上]
- 🎤 **与我相关 / 待我表态**：[是否有提到 `[Me]` 负责的模块，以及我现在立刻接话的最佳切入点]
````

---

### 5.4 会后自动反哺 `dev_knowledge` 提示词（Meeting-to-Dev-Knowledge Sync Prompt）

用于在会议结束后，自动从会议全量转写中提炼架构变更与开发任务，生成可直接提交到仓库 `dev_knowledge/` 的结构化文档：

````markdown
# Role
你是 `-ECE-Brain-Meeting` 项目的首席架构师与知识库维护 Agent。请分析以下研发会议完整转写记录，提取所有与系统架构、接口变更、技术选型淘汰、Bug 根因相关的决策，并将其转化为标准的 `dev_knowledge` 增量更新补丁。

# Inputs
1. 现有知识库索引：`{{DEV_KNOWLEDGE_INDEX}}`
2. 本次会议转写全文：`{{FULL_MEETING_TRANSCRIPT}}`

# Output Requirements
请按以下三个模块输出 Markdown 内容：
1. **新增/更新架构决策记录（ADR Patch）**：
   - 遵循 `背景 (Context)` -> `淘汰方案及原因 (Rejected Alternatives & Why)` -> `最终决策 (Decision)` -> `影响文件范围 (Affected Paths)` 格式。
2. **模块守护规则更新（Rules Update）**：
   - 提炼本次会议定下的编码红线或协议约定（附带 `paths` 匹配规则）。
3. **待执行开发任务清单（Actionable Dev Tasks）**：
   - 精确到具体目录/模块的 Todo 列表，供后续 Claude Code / Cursor 直接读取执行。
````

---

## 六、分阶段演进路线图（Implementation Roadmap）

| 阶段 | 核心目标 | 关键交付物与工程动作 | 预期收益 |
| :--- | :--- | :--- | :--- |
| **Phase 1 / Wave A：音频与 `dev_knowledge` 底座** | 解决“谁在说话”与“研发规范统一” | 1. `[Me]`/`[Others]` 双通道（VB-Cable / displayMedia 代理）✅<br>2. `vadGate` 能量 VAD + Silero 可选降级 ✅<br>3. **Cursor rules** + `dev_knowledge/{rules,adr,glossary,session_logs}`（**不用** `CLAUDE.md`）✅ | 消除混轨自激与静音盲送；Cursor 改代码时按路径加载红线 |
| **Phase 2 / Wave B：门控与阶梯卡片** | 解决“何时弹出”与“一眼看懂” | 1. Auto + Manual（Alt+Z Push-to-Ask / Alt+Shift+Z）✅<br>2. Speculative RAG prefetch（FAQ/`retrieveKnowledge`）✅<br>3. Option A/B/C 建议卡 + 防窥快捷键（既有）✅ | 嘈杂场可切手动；句中预热降低建议卡证据延迟 |
| **Phase 3 / Wave C：会中参谋与 MCP** | 解决“看见屏幕”与“会后可被 IDE 读取” | 1. 按需截屏钩子（OCR/VLM 预留）✅；Mermaid 线索草稿 ✅<br>2. Catch Me Up + Quick Jot ✅<br>3. 轻量 stdio MCP（`mcp:meeting`）✅；完整 VLM/精修图 ⏳ | 会中结论可沉淀到 `session_logs` 并被 Cursor 工具读取 |
| **Wave D：扫视增强** | 解决“图能扫、口述能抄、IDE 能挂” | 1. Mermaid 节点扫视渲染（不捆 mermaid.js）✅<br>2. Deep Dive 口述卡 ✅<br>3. 可选 Win OCR + `.cursor/mcp.json` ✅；多供应商 BYOK / 完整 VLM ⏳ | 建议卡可脱口；截屏文字可选入上下文 |
| **Wave E：Wiki2 Fast Read（对齐 V3 Phase2）** | 解决“查得慢、易冲突”的知识底座 | 1. AI-First 四段式 + 金标决策页 ✅<br>2. JSON 图索引 BM25+1-hop ✅ 接副驾驶<br>3. 规则 Ingest/Reconciler + MCP ✅ | 会中注入 Snapshot；失败路径可引用 |
| **Wave F：编译与主题（对齐 V3 Phase3 知识侧）** | 解决“会后写入 / 主动发现” | 1. 豆包 Contextual Ingest（失败回退规则）✅<br>2. 链接共现主题草稿 ✅<br>3. session→wiki2 一键 ✅；Leiden/Neo4j ⏳ | 会后可沉淀；主题页 draft 待人工确认 |