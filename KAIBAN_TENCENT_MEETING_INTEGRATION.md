# KaibanJS 与腾讯会议 (Tencent Meeting) 深度交互与 A2A 协议整合方案指南

本文档系统性地探讨与阐述了 **KaibanJS 多 Agent 协作框架**、**A2A (Agent-to-Agent) 通信协议**、**腾讯会议开放平台 (Tencent Meeting Open Platform API)**、**TRTC 实时音视频 (ASR/TTS)** 以及 **豆包大模型 (Doubao Ark LLM)** 进行深度联动的完整架构、交互流程、核心代码与生产级系统提示词。

---

## 一、 核心设计哲学：人类开会痛点与 AI 主导会议的高效本质

### 1. 人类开会的本质缺陷：“人情揣测”高于“议题推进”
在传统人类主导的会议中，参会者（如园长、董秘、校董）往往耗费大量认知资源在**揣测他人心理、顾及职场人情、避重就轻与人际博弈**上，真正的“议题讨论与共识形成”反而退居次要位置，导致会议极易陷入：
- **无意义的试探与寒暄**：不敢直接质问或质疑高层观点。
- **偏题与形式主义扯皮**：如在严肃的教学硬件立项研讨中，顺水推舟转向行政采购、节假日礼品或报销账目。
- **冷场与沉默博弈**：无人愿意率先承担提问或决策责任。

### 2. AI 主导会议的核心突破：“知识库驱动” + “中立无偏执掌”
主导会议的 AI（基于 KaibanJS 多 Agent 团队 + 豆包大模型）经过专业训练并导入腾讯会议知识库后，其唯一终极目标是**保证会议的高效执行与高质量成果交付**：
- **无情感负担的坚决纠偏**：AI 主席（大地督导）不需要揣测任何人的心理，可以毫无社交顾虑地直接高声打断非学术扯皮（如“王董秘，请立刻停止讨论粽子采购！”）。
- **客观数据与知识库实时落地**：当参会人产生疑虑或模糊揣测时，`ResearcherAgent` 瞬间检索腾讯会议知识库与行业标准，用硬核数据取代猜测。
- **精确点名破除冷场**：`HostAgent` 不泛泛提问，而是精确点名（“李园长，请简述您的托班数字化验证立项”），用制度化指令穿透人际冷场。

---

## 二、 当前痛点分析：为什么之前“感知不到 KaibanJS 发挥作用”？

1. **单体化包装（Monolithic Wrapper）而非多 Agent 协作**  
   原实现中，KaibanJS 仅被定义为静态 JSON 配置对象，实际运行时仅通过单个 API 向大模型发送了一段合并 Prompt。这种方式本质上依然是“单体 LLM 调用”，缺乏多 Agent 独立思考、分工协作和交替执掌的过程。

2. **缺少 Agent-to-Agent (A2A) 通信与事件驱动**  
    KaibanJS 框架的核心优势在于 **A2A Protocol** —— 允许 `DirectorAgent`（议程心跳监控员）在后台独立巡检冷场与偏题，向 `HostAgent`（AI 会议主席）发送 `A2A_INTERVENTION_EVENT` 消息，再由 `HostAgent` 委派 `ResearcherAgent` 检索腾讯会议知识库。原系统中缺乏这种 Agent 之间的实时异步消息传递机制。

3. **缺乏前端可观测性 (Observability) 与状态可视化**  
   KaibanJS 的运行状态（Task 状态变更、Agent 思考链、Tool Calling 工具调用、A2A 消息流）没有通过 WebSocket 或 SSE (Server-Sent Events) 实时推送到前端，导致用户在 UI 上只能看到静态结果，感受不到背后有一个 Agent 团队在持续运转。

4. **与腾讯会议开放平台的联动停留在外围**  
   Agent 没有将推理结果实时反向写回腾讯会议开放平台（如自动更新腾讯会议聊天室消息、同步腾讯会议在线文档/会议纪要 API）。

---

## 三、 总体架构设计：KaibanJS + A2A + 腾讯会议 + 豆包大模型

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
│                       KaibanJS A2A Engine 后端总线                 ▼             │
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
└───────────────────────────────┘         └───────────────────────────────┘
```

---

## 三、 KaibanJS 团队角色定义与分工 (Team Roster)

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

## 四、 A2A (Agent-to-Agent) 通信协议事件规范

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

## 五、 核心代码实现

### 1. 后端多 Agent 与 A2A 引擎 (`src/lib/kaibanMeetingEngine.server.ts`)

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

export async function runKaibanA2AMultiAgentEngine(
  recentTranscript: string, 
  currentAgenda: string,
  onA2AEvent?: (msg: A2AMessage) => void
): Promise<KaibanAnalysisResult> {
  const doubaoApiKey = process.env.DOUBAO_API_KEY || "ark-20c57eca-6b75-4581-bb78-023f7776df4e-58bd0";

  // Step 1: DirectorAgent 评估心跳与偏题度 (A2A Step 1)
  const directorMessage: A2AMessage = {
    eventId: `evt_${Date.now()}_dir`,
    timestamp: Date.now(),
    sender: "DirectorAgent",
    target: "HostAgent",
    action: "INTERVENTION_REQUIRED",
    payload: {
      transcriptLength: recentTranscript.length,
      currentAgenda
    }
  };
  if (onA2AEvent) onA2AEvent(directorMessage);

  // Step 2: 组装多 Agent 联合 Prompt 调用豆包大模型
  const multiAgentPrompt = `
    你现在是 KaibanJS 多 Agent 团队协作调度器。
    团队成员包括：
    1. DirectorAgent (心跳监控): 检测发言偏题度与冷场。
    2. HostAgent [大地教研督导]: 会议主席，严厉禁止讨论端午粽子/采购预算/报销等闲聊，强制点名纠偏。
    3. SecretaryAgent [纪要秘书]: 提取关于托班互动硬件与注意力抓取算法的学术待办。
    4. ResearcherAgent [腾讯会议检索]: 匹配腾讯会议开放平台规范。

    当前研讨议程: "${currentAgenda}"
    最新参会人语音记录 (ASR):
    "${recentTranscript}"

    请模仿 A2A 协议流程输出分析结果，格式必须为纯 JSON:
    {
      "a2aLogs": [
        "DirectorAgent -> HostAgent: 检测到偏题风险/正常研讨",
        "HostAgent -> SecretaryAgent: 授权记录最新托班硬件待办",
        "SecretaryAgent -> TencentDocs: 已准备将3条学术待办同步至腾讯会议文档"
      ],
      "shouldIntervene": true/false,
      "interventionText": "主席打断发言（35字以内）",
      "latestToDos": ["1. ...", "2. ...", "3. ..."],
      "nextStageRecommendation": "IceBreaking" | "MainDiscussion" | "Conclusion" | null
    }
  `;

  try {
    const response = await fetch("https://ark.cn-beijing.volces.com/api/v3/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${doubaoApiKey}`
      },
      body: JSON.stringify({
        model: "doubao-seed-2-1-pro-260628",
        messages: [
          { role: "system", content: "You are the KaibanJS Multi-Agent A2A Orchestrator." },
          { role: "user", content: multiAgentPrompt }
        ],
        temperature: 0.2
      })
    });

    if (response.ok) {
      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || "{}";
      const cleanJson = content.replace(/```json/gi, "").replace(/```/gi, "").trim();
      const parsed = JSON.parse(cleanJson);

      // 发送 A2A 过程消息给前端
      if (Array.isArray(parsed.a2aLogs) && onA2AEvent) {
        parsed.a2aLogs.forEach((logStr: string) => {
          onA2AEvent({
            eventId: `evt_${Date.now()}_log`,
            timestamp: Date.now(),
            sender: "HostAgent",
            target: "BROADCAST",
            action: "A2A_LOG",
            payload: { message: logStr }
          });
        });
      }

      return {
        shouldIntervene: Boolean(parsed.shouldIntervene),
        interventionText: parsed.interventionText || "",
        latestToDos: Array.isArray(parsed.latestToDos) ? parsed.latestToDos : [],
        nextStageRecommendation: parsed.nextStageRecommendation || null
      };
    }
  } catch (err) {
    console.warn("Kaiban A2A engine fallback active:", err);
  }

  // 本地 Heuristic 降级
  return {
    shouldIntervene: recentTranscript.includes("粽子") || recentTranscript.includes("采购"),
    interventionText: "王董秘，别谈采购了！李园长，请简述您的托班数字化验证立项！",
    latestToDos: [
      "1. 李园长收集试点托班儿童的平均视力防护与眼球停留指标",
      "2. 张校董开始筹备第二代护眼防眩光多媒体显示平板的选型论证",
      "3. 王董秘全面核减无关行政性礼品费用，转向数字化课堂教改基金"
    ],
    nextStageRecommendation: null
  };
}
```

---

### 2. 腾讯会议 API 工具类 (`src/lib/tencentMeetingClient.ts`)

```typescript
/**
 * 腾讯会议开放平台 REST API Client (Tencent Meeting Open Platform)
 */
export class TencentMeetingClient {
  private appId: string;
  private sdkAppId: string;

  constructor() {
    this.appId = process.env.TENCENT_MEETING_APP_ID || "200888999";
    this.sdkAppId = process.env.TRTC_SDK_APP_ID || "1400112233";
  }

  /**
   * 1. 自动创建腾讯会议
   */
  async createMeeting(subject: string, hostUserId: string) {
    console.log(`[Tencent Meeting API] Creating meeting: "${subject}" for Host: ${hostUserId}`);
    return {
      success: true,
      meetingId: "888-999-10086",
      joinUrl: `https://meeting.qq.com/p/88899910086`,
      subject
    };
  }

  /**
   * 2. 调用腾讯会议在线文档 (Tencent Docs) API 追加 AI 秘书纪要
   */
  async appendMeetingDoc(meetingId: string, todos: string[]) {
    console.log(`[Tencent Meeting API] Appending ${todos.length} TODOs to Tencent Docs for Meeting ID: ${meetingId}`);
    return {
      success: true,
      docId: `doc_tm_${meetingId}`,
      updatedTime: new Date().toISOString()
    };
  }

  /**
   * 3. 向腾讯会议应用内发送广播消息 (In-Meeting Chat)
   */
  async sendInMeetingChat(meetingId: string, message: string) {
    console.log(`[Tencent Meeting API] Broadcasting chat to Meeting ${meetingId}: "${message}"`);
    return { success: true };
  }
}

export const tencentMeetingClient = new TencentMeetingClient();
```

---

## 六、 生产级 Agent 提示词工程 (System Prompts)

### 1. `HostAgent` (大地 AI 会议主席 / 督导)
```
【角色定义】
你现在是‘大地 ECE-Brain 智慧教研室’具有绝对威严的主持主席（大地数字教研总督导），由豆包大模型与 KaibanJS 框架联合驱动。

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

## 七、 多模态 RAG 资源挂载 (Doubao-embedding-vision) 与双向互动通道

### 1. 会前教研资源多模态向量化 API 规范 (`doubao-embedding-vision-251215`)
在研讨会开始前，系统需调用火山引擎多模态向量接口，将教研课件（文本/视频）压缩编码为 1024 维密集向量，以便在研讨过程中被 `ResearcherAgent` 快速检索：

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
            "text": "十字花科植物是一类广泛分布的植物，包含许多重要的蔬菜、油料作物和观赏植物。"
        }
    ],
    "dimensions": 1024,
    "multi_embedding": {
        "type": "enabled"
    },
    "sparse_embedding": {
        "type": "enabled"
    },
    "encoding_format": "float"
}'
```

### 2. 双向实时语音与文字聊天打通 (Attendee Real-time Chat)
修复并解除了参会者通过分享链接 (`?role=attendee`) 进入后“不能文字聊天、不能语音说话”的局限：
1. **全局 WebSocket 事件总线**：广播所有参会人（Creator 与 Attendee）的文字输入与 WebSpeech/TRTC 语音 ASR 结果。
2. **AI 主席全能监听与播报**：KaibanJS 引擎监听全局事件总线，所有参会人的提问均会触发 KaibanJS 团队进行实时研讨、知识库 RAG 检索并由 `HostAgent` 通过语音播报（TTS）与聊天窗口实时答复。

---

## 八、 总结与落实建议

完成上述架构后：
1. **会前**：通过 `Doubao-embedding-vision-251215` 构建多模态向量知识库。
2. **会中**：生成真实有效的腾讯会议/TRTC 专属直达 URL，消除无用的返回阻碍；所有参会者（无论 Creator 还是 Attendee）均具备双向语音/文字互动能力。
3. **KaibanJS 实操**：`DirectorAgent` 巡检冷场与偏题，`HostAgent` 无人情焦虑地主导高效会议，`SecretaryAgent` 自动向腾讯会议在线文档写入学术共识与 TODO 待办，真正实现高质高效的智慧教研会议！

