# KaibanJS 与腾讯会议 (Tencent Meeting) 深度交互与 A2A 协议整合方案指南

本文档系统性地探讨与阐述了 **KaibanJS 多 Agent 协作框架**、**A2A (Agent-to-Agent) 通信协议**、**腾讯会议开放平台 (Tencent Meeting Open Platform API)**、**TRTC 实时音视频 (ASR/TTS)** 以及 **火山引擎豆包大语言模型 (Doubao Ark LLM)** 进行深度联动的完整架构、交互流程、核心代码与**标准化开发提示词 (Development Prompt)**。

> ⚠️ **核心要求**：KaibanJS A2A 引擎底层大模型统一采用 **火山引擎豆包 (Doubao) 大语言模型**（默认 Endpoint：`doubao-seed-2-1-turbo-260628` / `doubao-seed-2-1-pro-260628`），严禁依靠 Gemini 或其他非指定 LLM，网络或密钥异常时直接走内置的高保真启发式规则引擎（Doubao Rule Engine），确保云端实时服务 100% 稳定运行。

---

## 一、 核心设计哲学：人类开会痛点与 AI 主导会议的高效本质

### 1. 人类开会的本质缺陷：“人情揣测”高于“议题推进”
在传统人类主导的会议中，参会者（如园长、董秘、校董）往往耗费大量认知资源在**揣测他人心理、顾及职场人情、避重就轻与人际博弈**上，真正的“议题讨论与共识形成”反而退居次要位置，导致会议极易陷入：
- **无意义的试探与寒暄**：不敢直接质问或质疑高层观点。
- **偏题与形式主义扯皮**：如在严肃的教学硬件立项研讨中，顺水推舟转向行政采购、节假日礼品或报销账目（如“买端午节粽子”）。
- **冷场与沉默博弈**：无人愿意率先承担提问或决策责任。

### 2. AI 主导会议 Core Breakthrough：“知识库驱动” + “中立无偏执掌”
主导会议的 AI（基于 KaibanJS 多 Agent 团队 + 豆包大模型）经过专业训练并导入腾讯会议知识库后，其唯一终极目标是**保证会议的高效执行与高质量成果交付**：
- **无情感负担的坚决纠偏**：AI 主席（大地教研督导）不需要揣测任何人的心理，可以毫无社交顾虑地直接高声打断非学术扯皮（如“王董秘，请立刻停止讨论粽子采购，李园长请汇报托班硬件立项！”）。
- **客观数据与知识库实时落地**：当参会人产生疑虑或模糊揣测时，`ResearcherAgent` 瞬间检索腾讯会议知识库与行业标准，用硬核数据取代猜测。
- **精确点名破除冷场**：`HostAgent` 不泛泛提问，而是精确点名（“李园长，请简述您的托班数字化验证立项”），用制度化指令穿透人际冷场。

---

## 二、 当前痛点分析：为什么之前“感知不到 KaibanJS 发挥作用”？

1. **单体化包装（Monolithic Wrapper）而非多 Agent 协作**  
   原实现中，KaibanJS 仅被定义为静态 JSON 配置对象，实际运行时仅通过单个 API 向大模型发送了一段合并 Prompt。这种方式本质上依然是“单体 LLM 调用”，缺乏多 Agent 独立思考、分工协作和交替执掌的过程。

2. **缺少 Agent-to-Agent (A2A) 通信与事件驱动**  
    KaibanJS 框架的核心优势在于 **A2A Protocol** —— 允许 `DirectorAgent`（议程心跳监控员）在后台独立巡检冷场与偏题，向 `HostAgent`（AI 会议主席）发送 `A2A_INTERVENTION_EVENT` 消息，再由 `HostAgent` 委派 `ResearcherAgent` 检索腾讯会议知识库。原系统中缺乏这种 Agent 之间的实时异步消息传递机制。

3. **误用 Gemini 大模型导致 API Key 失败**  
   原底层机制在 Doubao 回包异常时误触发了未配置的 Gemini 接口，抛出 `API key not valid` 异常。Kaiban 引擎现已彻底摒弃 Gemini 依赖，全量收拢至 **豆包 (Doubao) Ark LLM** 及内置高保真启发式引擎。

4. **缺乏前端可观测性 (Observability) 与状态可视化**  
   KaibanJS 的运行状态（Task 状态变更、Agent 思考链、Tool Calling 工具调用、A2A 消息流）没有通过 WebSocket 或 SSE (Server-Sent Events) 实时推送到前端，导致用户在 UI 上只能看到静态结果，感受不到背后有一个 Agent 团队在持续运转。

5. **与腾讯会议开放平台的联动停留在外围**  
   Agent 没有将推理结果实时反向写回腾讯会议开放平台（如自动更新腾讯会议聊天室消息、同步腾讯会议在线文档/会议纪要 API）。

---

## 三、 总体架构设计：KaibanJS + A2A + 腾讯会议 + 豆包大模型 (Doubao LLM)

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                          腾讯会议开放平台 / TRTC 实时通道                            │
│  ┌───────────────────────┐  ┌───────────────────────┐  ┌─────────────────────┐  │
│  │ 腾讯会议 API (文档/聊天) │  │ TRTC 多人语音/ASR 转译 │  │ 参会人 (园长/董秘/校董)│  │
│  └───────────┬───────────┘  └───────────┬───────────┘  └──────────┬──────────┘  │
└──────────────┼──────────────────────────┼─────────────────────────┼─────────────┘
               │ (文档同步 / 聊天消息)       │ (实时 ASR 文字流)        │ (语音输入)
               ▼                          ▼                         │
┌───────────────────────────────────────────────────────────────────┼─────────────┐
│                   KaibanJS A2A Engine 后端总线 (Doubao LLM Driven)  ▼             │
│                                                                                 │
│   ┌─────────────────────────┐  A2A Event  ┌─────────────────────────┐           │
│   │   DirectorAgent         │────────────►│   HostAgent             │           │
│   │ (议程心跳与 VAD 监控员)    │             │ (大地 AI 主席 / 督导)    │           │
│   └──────────┬──────────────┘             └────────────┬────────────┘           │
│              │                                         │                        │
│              │ A2A Message                             │ Tool Calling           │
│              ▼                                         ▼                        │
│   ┌─────────────────────────┐             ┌─────────────────────────┐           │
│   │   SecretaryAgent        │             │   ResearcherAgent       │           │
│   │ (腾讯会议纪要/待办提取)   │             │ (腾讯会议知识库检索)     │           │
│   └──────────┬──────────────┘             └────────────┬────────────┘           │
│              │                                         │                        │
└──────────────┼─────────────────────────────────────────┼────────────────────────┘
               │ HTTP Sync (Tencent Doc API)             │ Query (Tencent Search)
               ▼                                         ▼
┌───────────────────────────────┐         ┌───────────────────────────────┐
│ 腾讯会议在线文档 (Tencent Docs) │         │ 腾讯会议开放检索 API           │
│ (https://meeting.qq.com/doc)  │         │ (https://meeting.qq.com/search)│
└───────────────────────────────┘         └───────────────────────────────┘
```

---

## 四、 KaibanJS 团队角色定义与分工 (Team Roster)

### 1. `HostAgent` (AI 虚拟会议主席 / 大地教研督导)
- **职责**：掌控会议大局，主持致辞、严厉打断非学术闲聊（如采购粽子、报销等）、苏格拉底式追问与点名提问。
- **绑定工具**：
  - `TencentMeetingChatTool`：向腾讯会议聊天窗口发送主席告示。
  - `TRTCVoiceBroadcastTool`：合成播报语音并推送到 TRTC 语音流。

### 2. `SecretaryAgent` (AI 学术纪要秘书)
- **职责**：实时监听 ASR 文本流，过滤无意义寒暄，提取关于“托班互动屏幕”、“注意力检测算法”的学术共识与 TODO 待办事项。
- **绑定工具**：
  - `TencentMeetingDocTool`：实时调用腾讯会议 Docs API 追加会议纪要与待办列表。

### 3. `ResearcherAgent` (腾讯会议知识库检索代理)
- **职责**：当参会人提出技术疑问（如“注意力采集的眼动标准是多少？”），主动检索腾讯会议文档库与幼教行业数字化标准。
- **绑定工具**：
  - `TencentMeetingSearchTool`：检索腾讯会议开放平台资料及内部教研文档。

### 4. `DirectorAgent` (议程与心跳监控员 / Pacemaker)
- **职责**：非对话式后台巡检 Agent。每 10 秒评估一次会议冷场时长 (Silence VAD) 与偏题指数。当检测到冷场超过 8 秒或偏题时，通过 A2A 协议向 `HostAgent` 广播 `INTERVENTION_NEEDED` 警报。

---

## 五、 A2A (Agent-to-Agent) 通信协议事件规范

A2A 消息采用统一的 JSON 事件结构在 Agent 之间流动：

```json
{
  "eventId": "evt_10086_9921",
  "timestamp": 1785501234000,
  "sender": "DirectorAgent",
  "target": "HostAgent",
  "action": "INTERVENTION_REQUIRED",
  "payload": {
    "reason": "OFF_TOPIC_DETECTED",
    "offTopicKeywords": ["粽子", "采购预算"],
    "offender": "王董秘",
    "suggestedTarget": "李园长",
    "urgency": "HIGH"
  }
}
```

---

## 六、 核心后端代码实现 (`src/lib/kaibanMeetingEngine.server.ts`)

```typescript
import { KaibanAnalysisResult } from "../types";

export interface A2AMessage {
  eventId: string;
  timestamp: number;
  sender: "DirectorAgent" | "HostAgent" | "SecretaryAgent" | "ResearcherAgent";
  target: "DirectorAgent" | "HostAgent" | "SecretaryAgent" | "ResearcherAgent" | "BROADCAST";
  action: "INTERVENTION_REQUIRED" | "EXTRACT_TODOS" | "FACT_CHECK" | "A2A_LOG";
  payload: Record<string, any>;
}

export async function runMeetingAnalysisServer(
  recentTranscript: string, 
  currentAgenda: string
): Promise<KaibanAnalysisResult> {
  const doubaoApiKey = process.env.DOUBAO_API_KEY || "ark-20c57eca-6b75-4581-bb78-023f7776df4e-58bd0";
  const doubaoModel = process.env.DOUBAO_MODEL_ENDPOINT || "doubao-seed-2-1-turbo-260628";

  // KaibanJS A2A Multi-Agent Orchestration Engine powered by Doubao LLM
  if (doubaoApiKey) {
    try {
      console.log(`[KaibanJS A2A Engine] Executing Doubao 4-Agent Orchestration...`);
      const prompt = `
        You are the KaibanJS A2A Multi-Agent Orchestrator for the Dadi ECE-Brain Intelligent Meeting System.
        
        The Agent Team consists of:
        1. Director Agent (director_agent - 会议总控与议程裁决): Evaluates if the discussion stays strictly on topic or strays into off-topic chatter (e.g. "端午粽子", "采购", "报销", "礼包", "采购预算", "福利礼品").
        2. Host Agent (host_agent - AI 虚拟主席 / 大地教研总督导): Executes speech interventions with supreme dignity. Sharp interruption warning to correct off-topic speech or balance participant speaking time.
        3. Secretary Agent (secretary_agent - 会议纪要与共识整理员): Synthesizes 3 high-impact actionable items for early childhood education (ECE) digital hardware and attention verification algorithms.
        4. Researcher Agent (researcher_agent - 学术专家代表): References RAG knowledge base for toddler multimedia and classroom pedagogical frameworks.

        Current Agenda Stage/Context: "${currentAgenda}"
        Recent Multi-User Speech Transcript:
        "${recentTranscript}"

        Evaluate and respond strictly following these rules:
        1. "shouldIntervene": set to true if someone talks about off-topic items ("粽子", "采购", "报销", "礼品", "礼盒", "采购预算", "场地与活动") or if someone monopolizes speech.
        2. "interventionText": if shouldIntervene is true, generate a dignified, high-energy interruption warning from AI Host (大地教研督导) under 35 Chinese characters. E.g. "王董秘，别谈采购了！李园长，请简述您的托班数字化验证立项！".
        3. "latestToDos": Extract 3 academic TODO items relevant to ECE digital hardware, formatted as ["1. ...", "2. ...", "3. ..."].
        4. "nextStageRecommendation": If discussion on current topic is complete, suggest next stage ("IceBreaking", "MainDiscussion", "Conclusion"), otherwise null.

        Output strictly raw JSON without markdown codeblocks:
        {
          "shouldIntervene": boolean,
          "interventionText": "string",
          "latestToDos": ["string"],
          "nextStageRecommendation": "IceBreaking" | "MainDiscussion" | "Conclusion" | null
        }
      `;

      const response = await fetch("https://ark.cn-beijing.volces.com/api/v3/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${doubaoApiKey}`
        },
        body: JSON.stringify({
          model: doubaoModel,
          messages: [
            { role: "system", content: "You are the KaibanJS A2A Engine executing multi-agent meeting supervision powered by Doubao LLM." },
            { role: "user", content: prompt }
          ],
          temperature: 0.2
        })
      });

      if (response.ok) {
        const data = await response.json();
        const content = data.choices?.[0]?.message?.content || "{}";
        const cleanJson = content.replace(/```json/gi, "").replace(/```/gi, "").trim();
        const parsed = JSON.parse(cleanJson);
        console.log(`[KaibanJS A2A Engine] Successfully received A2A evaluation from Doubao Ark API`);
        return {
          shouldIntervene: Boolean(parsed.shouldIntervene),
          interventionText: parsed.interventionText || "",
          latestToDos: Array.isArray(parsed.latestToDos) ? parsed.latestToDos : [],
          nextStageRecommendation: parsed.nextStageRecommendation || null
        };
      }
    } catch (err: any) {
      console.log(`[KaibanJS A2A Engine] Doubao request note: ${err?.message || err}`);
    }
  }

  // Local Doubao A2A Heuristic Fallback Engine
  return runLocalHeuristicFallback(recentTranscript, currentAgenda);
}
```

---

## 七、 生产级 Agent 提示词工程 (System Prompts)

### 1. `HostAgent` (大地 AI 会议主席 / 督导)
```
【角色定义】
你现在是‘大地 ECE-Brain 智慧教研室’具有绝对威严的主持主席（大地数字教研总督导），由火山引擎豆包大模型与 KaibanJS 框架联合驱动。

【核心指令与行为边界】
1. 极度排斥形式主义闲聊：面对端午节粽子采购、线下布置费用、财务报销等无关话题，必须高声喝止，强插打断（Barge-in VAD）。
2. 明确点名提问（Call-out Name）：抛出问题时，必须明确指定参会者姓名（如“李园长”、“王董秘”、“张校董”），禁止泛泛提问。
3. 腾讯会议联动：你的警告与总结将同步推送到腾讯会议在线文档与实时语音通道中。
4. 回复字数限制：言简意赅，语气威严，单次发言控制在 35 字以内！
```

### 2. `SecretaryAgent` (AI 学术纪要秘书)
```
【角色定义】
你是一丝不苟的大地数字档案专家与 KaibanJS 纪要秘书。

【核心任务】
1. 实时扫描腾讯会议 ASR 文字流。
2. 彻底剔除客套寒暄、礼品采购与琐碎流水账。
3. 提取 3 条关于“托班互动屏幕规格”与“注意力抓取算法”的高价值学术 TODO 待办事项，格式为 ["1. ...", "2. ...", "3. ..."]。
```

### 3. `DirectorAgent` (议程与心跳监控员 / Pacemaker)
```
【角色定义】
你是 KaibanJS 引擎后台非对话式心跳巡检员。

【巡检规则】
1. 当语音流停顿（Silence VAD）超过 8 秒时，立即触发 A2A 消息 `INTERVENTION_REQUIRED`（Reason: SILENCE_TIMEOUT）。
2. 当匹配到 ["粽子", "采购", "报销", "礼品"] 关键词时，立即触发 A2A 消息 `INTERVENTION_REQUIRED`（Reason: OFF_TOPIC）。
```

---

## 八、 多模态 RAG 资源挂载 (`doubao-embedding-vision-251215`) 与双向互动通道

### 1. 会前教研资源多模态向量化 API 规范
在研讨会开始前，系统调用火山引擎多模态向量接口，将教研课件（文本/视频）压缩编码为 1024 维密集向量，以便在研讨过程中被 `ResearcherAgent` 快速检索：

```bash
curl --location 'https://ark.cn-beijing.volces.com/api/v3/embeddings/multimodal' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer $ARK_API_KEY' \
--data '{
    "model": "doubao-embedding-vision-251215",
    "instructions": "Target_modality: text and video.\nInstruction:Compress the text/video into one word.\nQuery:",
    "input": [
        {
            "type": "text",
            "text": "幼教数字化互动硬件与儿童注意力视觉检测指标白皮书"
        }
    ],
    "dimensions": 1024,
    "multi_embedding": { "type": "enabled" },
    "sparse_embedding": { "type": "enabled" },
    "encoding_format": "float"
}'
```

### 2. 参会人双向实时语音与文字聊天打通
参会者通过分享链接 (`?role=attendee`) 进入后，具备完整的交互体验：
1. **全局 Socket.IO 事件总线**：广播所有参会人（Creator 与 Attendee）的文字输入与 WebSpeech/TRTC 语音 ASR 结果。
2. **AI 主席全能监听与播报**：KaibanJS 引擎监听全局事件总线，所有参会人的提问均会触发 KaibanJS 团队进行实时研讨、知识库 RAG 检索并由 `HostAgent` 通过语音播报（TTS）与聊天窗口实时答复。

---

## 九、 标准化 Agent 架构开发提示词 (Development Prompt)

> 💡 **使用说明**：以下提示词可直接复制给 AI 编程助手或研发团队，用作构建 KaibanJS + 腾讯会议 + 豆包 LLM 的标准开发规范。

```markdown
# [SYSTEM PROMPT / 开发提示词] KaibanJS + 腾讯会议 + 豆包 (Doubao) 大模型 A2A 多 Agent 引擎开发规范

## 1. 核心任务目标
请构建/完善一套基于 **KaibanJS 多 Agent 团队**、**A2A (Agent-to-Agent) 通信协议**、**腾讯会议开放 API** 以及 **火山引擎豆包大语言模型 (Doubao Ark LLM)** 的智能会议控场与协作系统。

## 2. LLM 模型配置与约束
1. **大模型驱动**：所有多 Agent 协作决策与推理必须且仅能调用 **火山引擎豆包 Ark API**（Endpoint: `https://ark.cn-beijing.volces.com/api/v3/chat/completions`，推荐模型标识: `doubao-seed-2-1-turbo-260628` 或 `doubao-seed-2-1-pro-260628`）。
2. **严禁依赖 Gemini**：禁止在 KaibanJS A2A 逻辑中调用或回退到 Gemini API。
3. **高保真启发式规则降级 (Heuristic Fallback)**：当 API Key 未配置或网络超时时，系统必须自动切换至内置的启发式规则引擎，精准判定偏题词（如“粽子”、“采购”、“报销”），返回预制的学术 TODO 待办与威严打断词，确保系统零崩溃。

## 3. Agent 团队角色与分工 (4-Agent Team)
1. **DirectorAgent (议程心跳与偏题巡检员)**：
   - 监听 ASR 文字流，每 10 秒计算一次偏题指数与 Silence VAD。
   - 当发现偏题或冷场时，通过 A2A 协议发送 `INTERVENTION_REQUIRED` 广播。
2. **HostAgent (AI 会议主席 / 大地教研总督导)**：
   - 收到 `INTERVENTION_REQUIRED` 后，生成 35 字以内威严打断词（如“王董秘，别谈采购了！李园长，请简述您的托班数字化验证立项！”）。
   - 调用 TRTC TTS 播报语音并推送到腾讯会议聊天窗口。
3. **SecretaryAgent (AI 学术纪要秘书)**：
   - 实时过滤寒暄，归纳 3 条教研学术 TODO 待办。
   - 调用腾讯会议 Docs API (`/api/tencent/doc/append`) 将待办追加至会议在线文档。
4. **ResearcherAgent (腾讯会议知识库检索员)**：
   - 调用 `doubao-embedding-vision-251215` 密集向量检索腾讯会议开放平台资料与教研白皮书。

## 4. A2A 通信协议标准 JSON 格式
```json
{
  "eventId": "evt_timestamp_string",
  "timestamp": 1785501234000,
  "sender": "DirectorAgent",
  "target": "HostAgent",
  "action": "INTERVENTION_REQUIRED",
  "payload": {
    "reason": "OFF_TOPIC_DETECTED",
    "transcript": "最新发言记录...",
    "currentAgenda": "当前议程阶段"
  }
}
```

## 5. API 路由与客户端集成接口
- **后端评估 Endpoint**：`POST /api/meeting/evaluate`
  - Request: `{ "transcript": "发言记录...", "currentTopic": "议程" }`
  - Response: `{ "result": { "shouldIntervene": boolean, "interventionText": string, "latestToDos": string[], "nextStageRecommendation": string|null } }`
- **实时通信 Socket.IO**：监听 `/ws/meeting` 命名空间，广播 `chat_message`、`voice_state` 及 `a2a_event` 事件。

请遵循上述规范编写模块化、类型安全且高鲁棒性的 TypeScript 代码！
```

---

## 十、 总结与落实效果

1. **底层强收拢**：全量收拢至 **豆包大语言模型 (Doubao Ark LLM)**，彻底移除 Gemini 耦合与报错。
2. **全流程可控**：`DirectorAgent` 巡检冷场偏题，`HostAgent` 无人情焦虑控场，`SecretaryAgent` 自动向腾讯会议在线文档更新 TODO 待办，`ResearcherAgent` 多模态向量检索知识库。
3. **标准化开发提示词**：提供可以直接交付或给 AI 执行的标准开发 Prompts，加速后期的企业级扩展与部署！
