# -ECE-Brain-Meeting 桌面端（/desktop/）深度分析与智能回复优化方案

> **落地进度（2026-10-31）**  
> 产品形态差异：现网是「VB-Cable 单轨 + 大智口播顾问」；方案画的是「给 Me 的副驾驶建议卡」。已按架构宪法用**旁路**增量落地，**未**整段重写 `decideSpeak`。  
>
> | 方案能力 | 状态 | 落点 |
> |----------|------|------|
> | 意图门控四分类 + should_trigger | ✅ | `knowledge/schema/copilot-gate.json` + `lib/copilot/gate.cjs` |
> | Option A/B/C 分级建议卡 | ✅ | `lib/copilot/suggest.cjs` → IPC `smart-replies` |
> | 扫视化 UI + 复制/试播 | ✅ | `renderer/ui/smartReplies.js` + 悬浮胶囊 |
> | 置顶 / 透明度 / Ctrl+Shift+H 防窥 | ✅ | 主窗 + 无边框胶囊；快捷键一并隐藏 |
> | 双通道 Others/Me 采集 + ASR | ✅ | CABLE/系统内录=Others；本机麦=Me；策略只吃 Others |
> | 原生 WASAPI 内核 Loopback | ⚠️ 代理实现 | Electron 无原生 WASAPI；用 VB-Cable 或 `displayMedia` 系统内录实验 |
> | 本地 Whisper | ✅ | `HOST_ASR_MODE=local` + `WHISPER_SERVER_URL` 或 `WHISPER_BIN`；`npm run whisper:model` |
> | Wave A：Cursor rules + ADR/glossary | ✅ | `.cursor/rules/*.mdc` + `dev_knowledge/{INDEX,rules,adr,glossary,session_logs}`；**不**依赖 `CLAUDE.md` |
> | Wave A：VAD 门控 | ✅ | `lib/asr/vadGate.cjs`（能量默认；Silero 可选降级）接入 `whisperLocal` |
> | Wave A：术语纠错 | ✅ | `glossaryCorrect` → Whisper / Host ASR / `displayCorrectAsr` |
> | Wave B：Speculative RAG | ✅ | `lib/copilot/prefetch.cjs`；巡检时预热 FAQ/知识块，出卡可复用 |
> | Wave B：Auto / Manual + Push-to-Ask | ✅ | `COPILOT_TRIGGER_MODE` / Alt+Shift+Z；Alt+Z 强制建议卡（近 60s） |
> | Wave C：Catch Me Up / Quick Jot | ✅ | `lib/copilot/recap.cjs` + `jot.cjs`；UI「会中参谋」 |
> | Wave C：按需截屏钩子 | ✅ | `desktopCapturer` → `screenContext`（OCR/VLM 预留） |
> | Wave C：轻量 MCP | ✅ | `npm run mcp:meeting`（stdio）；读 `meeting_bridge.json` / jots |
> | Wave C：实时 Mermaid 精修 / 完整 VLM | ⚠️ 部分 | Mermaid 扫视节点图 ✅；完整 mermaid.js / VLM ⏳ |
> | Wave D：Deep Dive 口述卡 | ✅ | `lib/copilot/deepDive.cjs` 挂建议卡旁路 |
> | Wave D：可选屏幕 OCR | ✅ | `SCREEN_OCR=1` → WinRT OCR（无语言包则跳过） |
> | Wave D：Cursor MCP 配置 | ✅ | `.cursor/mcp.json` → `mcp:meeting` |
> | Wave E：Wiki2 目录与金标页 | ✅ | `desktop/knowledge_wiki/` 四段式 + ADR-007 |
> | Wave E：Fast Read 混合检索 | ✅ | `lib/wiki2` JSON 图索引 BM25+1-hop；接 prefetch/建议卡 |
> | Wave E：Ingest + Reconciler | ✅ | 规则抽取 episode；最小合入 + changelog；MCP `ece_wiki_*` |
> | BYOK（豆包） | ✅ | `LLM_PROVIDER=doubao` + `LLM_API_KEY`/`DOUBAO_API_KEY`；其它供应商仅预留 |
> | BYOK（OpenAI/DeepSeek/…） | ⏳ | 账号申请后接入 |
> | Wave F：豆包编译 Ingest | ✅ | `compileLlm.cjs`；`WIKI2_INGEST_LLM` / `wiki2:ingest:llm`；失败回退规则 |
> | Wave F：共现主题合成 | ✅ | `themes.cjs`（轻量，无 Leiden）；`wiki2:themes` |
> | Wave F：session→wiki2 | ✅ | `wiki2:from-session` + MCP `ece_wiki_from_session` |
> | Leiden / Neo4j / Graphiti | ⏳ | 共现草稿已够用；重图库后置 |
>
> 开关：`COPILOT_ENABLED=0`；`COPILOT_TRIGGER_MODE=manual`；`SCREEN_OCR=1`；`WIKI2_INGEST_LLM=1`。冒烟：`smoke:wave-a…f`；索引：`wiki2:index`。

## 一、项目架构与桌面端（/desktop/）核心模块拆解

### 1.1 典型桌面端设计架构梳理
在 AI 实时会议与多模态脑力辅助系统（如 `-ECE-Brain-Meeting/desktop` 及同类项目）中，桌面端通常作为核心客户端交互与端侧流转中心。整体技术分层主要包含：

```
┌───────────────────────────────────────────────────────────────┐
│               桌面端用户界面 (Frontend / UI Layer)             │
│   • 悬浮窗 / 胶囊形态 (Floating Widget / Stealth Overlay)      │
│   • 实时转写流 (Live Transcript View)                         │
│   • 智能建议建议流 (Smart Reply Stream / Action Cards)         │
│   • 会议议程与上下文看板 (Agenda / Topic Tracker)               │
└───────────────────────────────┬───────────────────────────────┘
                                │ IPC (Tauri Events / Electron IPC / WebSocket)
┌───────────────────────────────▼───────────────────────────────┐
│               端侧核心服务层 (Desktop Native Core)            │
│   • 音频捕获 (Audio Capture: 麦克风 + 系统内录双声道分离)       │
│   • VAD 语音断句 (Silero-VAD / Energy-based Chunking)         │
│   • 本地会话缓存 & 动态滑动窗口 (Sliding Window Context Cache) │
│   • 意图侦测与触发器 (Trigger Engine: 提问/分歧/冷场检测)      │
└───────────────────────────────┬───────────────────────────────┘
                                │ Async Network / Local Inference
┌───────────────────────────────▼───────────────────────────────┐
│               AI 智能回复引擎 (AI Copilot Engine)             │
│   • 实时语音转写 (ASR: Whisper / Parakeet / SenseVoice)       │
│   • 说话人分离 (Speaker Diarization / Pyannote)               │
│   • 实时智能建议生成 (Smart Reply / CoT / Few-Shot LLM)       │
│   • 知识检索增强 (Meeting RAG / MCP 知识库检索)                 │
└───────────────────────────────────────────────────────────────┘
```

### 1.2 当前常见痛点与局限性诊断
结合开源同类项目与常见实现，该类系统通常存在以下核心瓶颈：
1. **音频捕获与分离问题**：
   - 麦克风语音（User/Me）与扬声器系统声音（Others/Remote）混杂，缺少硬件级或驱动级双声道独立切分（缺少对 Loopback/WASAPI/ScreenCaptureKit 的精准隔离）。
   - 说话人无区分（No Diarization），LLM 无法明确区分“对方提问”还是“自己发言”，导致经常出现“自己回复自己”的混乱现象。
2. **生成延迟与时机控制失衡**：
   - 全量轮询机制：频繁将转写结果丢给大模型，导致 API 费用暴增、Token 耗尽且界面刷屏。
   - 缺乏精准的 VAD（静音检测）与意图识别（Question Intent Classifier），无法在说话者句尾停顿的瞬间精准触发，失去即时建议的最佳“黄金 3 秒”。
3. **回复生成质量与形态单一**：
   - 传统提示词大多只指令“请总结会议”或“针对上述内容回答”，生成一长篇段落文本。
   - 会议进行中，用户根本没有时间阅读长篇大论；缺乏**短语级即时应答（Quick Bites）**、**深度观点拓展（Deep Dive）**与**专业反问/引导问题（Counter-Questions）**的多梯度分层输出。
4. **缺乏上下文记忆与外部知识沉淀**：
   - 滑动窗口丢失历史关键议题，缺少会议大纲（Agenda）、专业术语表（Glossary）和专有文档 RAG 注入。

---

## 二、结合前沿开源项目的优化方案借鉴

目前开源社区在实时会议助手与实时应答领域有多个标杆项目值得吸收借鉴：
- [Meetily](https://github.com/Zackriya-Solutions/meetily)：采用 Rust (Tauri) + Next.js，支持端侧轻量化实时转写与本地隐私安全。
- [Ecoute / cue](https://github.com/Blueturboguy07/cue)：通过虚拟音频环回（WASAPI / ScreenCaptureKit）实现麦克风与对方发言的双流分离。
- [Natively](https://github.com/Natively-AI-assistant/natively-cluely-ai-assistant)：引入 TinyPrompts 状态机引擎与分级即时建议卡片，专为极简悬浮视窗设计。
- [Devleed/meeting-copilot](https://github.com/Devleed/meeting-copilot)：将系统音频与本地 RAG 相结合，利用终端/轻悬浮层进行极低延迟推理。

### 2.1 架构优化：三层流式响应流水线（Pipeline）
构建“音频捕获 -> 流式分词转写 -> 意图门控拦截 -> 分级多路由回复生成”的闭环架构：

1. **双通道独立音频流（Dual-Track Audio Pipeline）**：
   - **Track A (Input/Mic)**：用户自身发言，标记为 `[Me]`。
   - **Track B (Output/System Loopback)**：远端参会人员发言，标记为 `[Others/Speaker]`。
   - 配合 WebRTC AEC（声学回声消除），消除扬声器被麦克风二次录入的串音。

2. **智能意图门控机制（Intent Gating & Trigger Engine）**：
   - 避免无脑调用大模型。通过轻量规则/端侧小模型（Small Classifier / Flash LLM）判断当前片段是否包含：
     - **Direct Question**（直接提问用户）：高优先级立即触发。
     - **Disagreement / Open Debate**（讨论分歧/方案选型）：中优先级触发观点支撑。
     - **Meeting Deadlock**（停顿冷场/话题发散）：低优先级触发破冰/话题收敛提示。
     - **Casual Chitchat**（寒暄客套）：静默过滤，不浪费算力。

3. **分级流式回复卡片（Tiered Response Cards）**：
   - **Tier 1 (Instant Pill - 1秒内)**：1~2 句直接应答口径（“完全赞同这个方向，目前最大的瓶颈在交付周期...”）。
   - **Tier 2 (Key Bullets - 2秒内)**：3 个核心支撑要点（数据指标、方案利弊、关联风险）。
   - **Tier 3 (Follow-up Question - 启发式反问)**：把话语权转回对方的专业反问句（“关于第二阶段的资源排期，目前研发团队的容量是如何评估的？”）。

---

## 三、生产级提示词（Prompt）工程体系设计

针对实时会议场景的特殊性，提示词必须遵循：**极度精炼、说话人口径清晰、多选项策略输出、严禁机械客套**。

### 3.1 核心系统提示词：实时会议副驾驶（Real-time Meeting Copilot）

```markdown
# Role
你是一名顶级的现场会议实时参谋与智能回复副驾驶（Executive Meeting Copilot）。你的服务对象是正在开会的参会者 [Me]。
你的职责是在毫秒级时间内，根据现场实时转写文本，分析其他参会者 [Others] 的发言意图，并为 [Me] 提供能够“脱口而出”的高情商、高专业度发言建议。

# Context Inputs
1. [Me]: 用户本人的发言
2. [Others]: 对方或团队其他成员的发言
3. [Meeting Topic / Agenda]: 会议主题与核心目标（若有）
4. [Custom Background / Knowledge]: 用户的角色立场与私有知识库要点

# Strict Rules
1. **口语化与即时性**：输出内容必须是人类日常在商务/技术会议中自然讲出的中文（或对应会议语言），杜绝 AI 腔、套话和冗长排比。
2. **角色视角固定**：所有建议回复必须以“第一人称（我/我们）”视角撰写，严禁使用“你可以说：”、“建议回复如下：”等元提示词包裹。
3. **多策略阶梯输出**：必须同时提供 3 种不同立场的应答方向，以结构化格式输出：
   - 【Option A - 快速赞同/推进】：认可对方观点并迅速切入下一步实施。
   - 【Option B - 谨慎权衡/质疑】：指出现有方案的潜在风险、成本或替代方案。
   - 【Option C - 澄清反问/引导】：当对方表述不清或需要更多信息时，将问题踢回给对方。
4. **控制字数**：每个选项建议控制在 2 句话以内（不超过 60 字），方便 [Me] 在 1 秒内扫视读取并无缝发言。

# Output Format (JSON or Strict Markdown)
```json
{
  "detected_intent": "对方提出了关于项目上线延迟的质询",
  "urgency": "High",
  "suggestions": {
    "push_forward": "我们目前的排期确实比较紧凑，如果本周五能锁定核心 API 协议，核心功能可以按期交付。",
    "push_back": "考虑到近期第三方的联调稳定性，我建议留出 3 天缓冲期，优先保核心交易链路上线。",
    "counter_inquiry": "关于测试环境延迟的问题，目前运维团队定位到的具体瓶颈是在网络层还是数据库配置？"
  },
  "key_facts": ["核心风险：第三方联调", "关键时间点：本周五锁定协议"]
}
```
```

---

### 3.2 意图识别与触发门控提示词（Intent Classifier - 极速轻量模型专用）

```markdown
# Task
分析以下刚刚结束的语音片段，判断是否需要唤醒 AI 生成智能回复。

# Input Transcript
"""
{{LATEST_TRANSCRIPT_SEGMENT}}
"""

# Classification Categories
1. **DIRECT_QUESTION**: 对方直接向我提问或点名，需要立即解答（触发等级：HIGHEST）
2. **OPINION_SEEKING**: 团队正在征集观点、技术方案评审或决策（触发等级：HIGH）
3. **INFORMATION_SHARING**: 对方在单向陈述汇报、朗读 PPT、无需打断（触发等级：IGNORE）
4. **CHITCHAT**: 闲聊、设备调试、问候（触发等级：IGNORE）

# Output Format
Return valid JSON only:
{"category": "DIRECT_QUESTION" | "OPINION_SEEKING" | "INFORMATION_SHARING" | "CHITCHAT", "should_trigger": true | false, "target_topic": "简洁概括主题"}
```

---

### 3.3 会议知识问答与追问提示词（On-Demand Deep Dive Prompt）

当用户在桌面端手动按下快捷键（如 `Ctrl + Enter` 或点击胶囊卡片）要求对某一争议点进行深挖时使用：

```markdown
# Role
技术与战略架构师，负责深度支撑 [Me] 的发言说服力。

# Context
- 最近 5 分钟会议记录：
{{RECENT_TRANSCRIPT_5MIN}}
- 用户检索词/追问问题：
{{USER_QUERY}}

# Output Requirements
1. **核心论点（The Punchline）**：1 句话直接给出结论。
2. **论据支撑（Supporting Points）**：2~3 点核心事实/业界标准/对比数据。
3. **推荐发言话术（Verbatim Script）**：一段可以直接口述的连贯发言（100字左右）。
```

---

## 四、桌面端具体功能改造与工程实施步骤

### 阶段一：音频底层改造（Audio Pipeline Refactor）
1. **系统内录（Loopback Audio）支持**：
   - Windows 平台接入 WASAPI Loopback 录音。
   - macOS 平台使用 ScreenCaptureKit 或集成虚拟音频驱动。
2. **双通道独立标定**：
   - 麦克风音频打标为 `Local (Me)`。
   - 扬声器音频打标为 `Remote (Others)`。
   - 彻底解决 ASR 无法识别“谁在说话”的问题。

### 阶段二：前端 UI 悬浮胶囊化（Stealth & Glancable UI）
1. **极简悬浮条设计**：
   - 桌面端常驻置顶（Always-on-top），透明度可调（Opacity Slider）。
   - 快捷键静音/隐藏（`Ctrl+Shift+H` 一键防窥屏/防共享屏幕抓取）。
2. **扫视化呈现（Glanceable UX）**：
   - 大字号关键词高亮展示，避免大段无衬线小字。
   - 一键点击复制或语音朗读（TTS 试听）。

### 阶段三：端云协同与隐私安全（Local-First & BYOK）
1. **本地模型优先**：
   - 本地端侧支持运行 Whisper.cpp / SenseVoice-Small，保证即使在无网或内网涉密会议中也能正常实时转写。
2. **BYOK（Bring Your Own Key）与多供应商适配**：
   - 支持 OpenAI、DeepSeek、Claude、Ollama 等接口热插拔，平衡成本与响应速度（首选极速推理模型如 DeepSeek-V3 / Groq / GPT-4o-mini）。
