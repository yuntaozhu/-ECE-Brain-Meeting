# 大地 ECE-Brain AI 智能会议系统 — 全流程开发提示词 Master Blueprint (v3.5)

> **文档性质**: 全栈端到端开发提示词 (Master System Prompt) 与 架构接口规范说明书  
> **面向对象**: AI Coding Agent / 全栈开发工程师  
> **适用项目**: 大地 ECE-Brain AI 协同教研会议系统 (`DadiAIMeeting`)  
> **设计核心**: 解决传统人类会议中“人情揣测大于议题推进”的低效痛点，通过 **KaibanJS 多 Agent 协作引擎** + **豆包大模型 (Doubao Ark LLM & Embedding)** + **腾讯会议开放平台 (Tencent Meeting Open Platform API)** + **TRTC 实时音视频**，实现会前 RAG 资源挂载、合法腾讯会场生成、数字主理人（AI 虚拟主席）双向控场与会后成果一键归档的全闭环。

---

## 📋 开发者核心指令 (Master Developer Directive)

你是一名高级全栈架构师与 Node.js / TypeScript 专家。请严格按照本规范中的架构与实施路线图，为 **大地 ECE-Brain AI 协同教研会议系统** 进行端到端代码落地，彻底打通腾讯会议 API 深度集成、多模态 RAG 资源索引、KaibanJS A2A 多 Agent 控场与全员双向互动通信。

---

## 一、 系统核心流程与架构概览 (End-to-End Workflow)

整个系统由四大核心闭环阶段构成：

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│ 阶段一：会前教研资源挂载与 RAG 大纲设计                                              │
│ - 调用 Doubao-embedding-vision-251215 多模态向量化模型挂载教研课件/视频            │
│ - 生成结构化教研议程与内存/向量数据库知识索引                                         │
└────────────────────────┬─────────────────────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│ 阶段二：腾讯会议 API 真实会场组建与直达 Link 路由                                  │
│ - 鉴权并调用腾讯会议开放平台 REST API (/v1/meetings) 创建真实合法会场            │
│ - 废除静态硬编码无效链接，生成包含腾讯会议号 + Web 直达入口 + 小程序码的复合卡片   │
└────────────────────────┬─────────────────────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│ 阶段三：数字研讨大室接入 (Creator 主席 / Attendee 参会人模式)                      │
│ - 建立 WebSocket 全局广播总线 (/ws/meeting)，消除 Attendee 模式下不能聊天的限制    │
│ - 开放 Text & WebSpeech/TRTC 实时音视频双通道，支持参会人随时打字/发声互动          │
└────────────────────────┬─────────────────────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│ 阶段四：KaibanJS 多 Agent 真实主控与 A2A 协议循环                                   │
│ - DirectorAgent: 8秒 VAD 冷场巡检与偏题检测，广播 A2A_INTERVENTION 事件          │
│ - HostAgent: 消除人情顾虑，高声打断非学术扯皮，定向点名提问                        │
│ - SecretaryAgent: 提取学术共识与 To-Dos，调用腾讯会议 Docs API 自动写入在线文档     │
│ - ResearcherAgent: 调用 Doubao-embedding-vision 向量检索，用硬核数据回应疑问       │
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

## 二、 阶段一开发规范：会前教研资源挂载与 RAG 大纲设计

### 1. 需求说明
在会议召开前，主办方（大地督导）可上传教研课件（PDF、文本、视频）。系统需调用豆包多模态向量模型 `doubao-embedding-vision-251215` 将资源向量化存储，并基于文档内容智能生成三阶段教研议程大纲（`IceBreaking` 预热、`MainDiscussion` 核心讨论、`Conclusion` 总结）。

### 2. 多模态 Vector Embedding API 规范
必须使用以下标准的 CURL / HTTP 规范向火山引擎 (Doubao Ark) 发起多模态 Vector Embedding 请求：

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
            "text": "大地ECE托班数字化教学：包含新一代互动显示屏、儿童注意力眼动捕捉算法及教研数据看板。"
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

### 3. 开发实现逻辑 (Developer Directive)
- 在服务端 `server.ts` 新增 POST 端点 `/api/rag/embed-resource`。
- 将生成的 1024 维 `dense_embedding` 与 `sparse_embedding` 索引存储在内存向量表或 Cloud 数据库中。
- 当研讨过程中 `ResearcherAgent` 被触发时，将参会者的提问计算 Embedding 并进行余弦相似度（Cosine Similarity）检索，返回最相关的教研片段。

---

## 三、 阶段二开发规范：腾讯会议 API 联动与会场组建

### 1. 环境变量与凭证配置 (`.env` & `.env.example`)
```env
# 腾讯会议企业自建应用凭证 (DadiAIMeeting)
TENCENT_MEETING_CORP_ID=557124324
TENCENT_MEETING_APP_ID=3284013264
TENCENT_MEETING_SECRET_ID=3bmfDha2HIKuGLgtBXaJwzFfarW04XAU
TENCENT_MEETING_SECRET_KEY=mk1n3rh4sfdXrLMtPs3T3oUR5Ek6LacXZTw6CuhafnWQhXyl
TENCENT_MEETING_HOST_USER_ID=daid_it
TENCENT_MEETING_API_BASE=https://api.meeting.qq.com
```

### 2. 腾讯会议开放平台 API 调用逻辑
- **接口地址**: `POST https://api.meeting.qq.com/v1/meetings`
- **鉴权签名**: HMAC-SHA256 计算包含 `X-TC-Key`, `X-TC-Nonce`, `X-TC-Timestamp`, `X-TC-Signature`。
- **请求体 (Request Payload)**:
```json
{
  "userid": "daid_it",
  "instanceid": 1,
  "subject": "【大地 ECE-Brain 智慧教研】托班双核互动硬件与注意力算法研讨会",
  "type": 0,
  "hosts": [{ "userid": "daid_it" }],
  "settings": {
    "allow_in_before_host": true,
    "auto_in_waiting_room": false,
    "allow_multi_device": true
  }
}
```
- **真实 Link 路由与优雅降级**:
  废除任何无效死链接（如 `https://meeting.qq.com/s/811199910`）。API 成功返回后，生成真正的 `meetingCode`（如 `328-401-326`）与专属 URL：
  - **主席入口**: `https://<domain>/?roomId=328401326&role=creator`
  - **参会者入口**: `https://<domain>/?roomId=328401326&role=attendee`
  - 若 API 调用异常或未配置秘钥，自动降级为 TRTC 虚拟会场，弹出轻提示而不阻塞开会。

---

## 四、 阶段三开发规范：数字研讨大室与双向多人交互系统

### 1. 解决 Attendee 模式“不能聊天/发声”的 Bug
- **WebSocket 全局广播总线 (`/ws/meeting`)**: 后端使用 `ws` 维护房间 `roomId` 集合，所有参会者（Creator 或 Attendee）发送的消息均广播至全房间及 KaibanJS 引擎。
- **开放输入通道**: 移除对 `role=attendee` 的组件禁言/遮罩限制，提供打字框与 WebSpeech/TRTC 语音按键。
- **全员播报 (TTS Audio Broadcast)**: 当 `HostAgent` 打断或发言时，TTS 音频流通过 TRTC/WebSpeech 自动在所有参会者端播放。

---

## 五、 阶段四开发规范：KaibanJS 多 Agent 真实控场与 A2A 协议

### 1. 人类开会痛点与 AI 主导哲学
人类开会时常将 70% 的精力用于**揣测心理、顾及人情、避重就轻与试探博弈**。AI 主导的会议以**议程高效推进与共识产出**为唯一衡量标准：
- **无社交负荷的高声强插 (Barge-in VAD)**: 一旦识别到偏题（如讨论“粽子采购”、“财务报销”），`HostAgent` 立即切断：“王董秘，请立刻停止无关讨论！李园长，请针对托班屏幕规格发表看法！”
- **定向点名打破冷场**: `DirectorAgent` 监测到 8 秒无有效发言时，广播 `A2A_INTERVENTION_REQUIRED` 事件，指挥 `HostAgent` 点名具体参会人。

### 2. KaibanJS A2A 多 Agent 团队配置
```typescript
// 1. DirectorAgent (心跳与偏题监控员)
export const DirectorAgent = {
  name: "DirectorAgent",
  role: "议程心跳与 VAD 偏题巡检员",
  goal: "实时检测语音流冷场时间 (VAD Silence > 8s) 与偏题指数，向 HostAgent 发送 A2A 事件"
};

// 2. HostAgent (大地 AI 会议主席 / 督导)
export const HostAgent = {
  name: "HostAgent",
  role: "大地教研总督导 / AI 会议主席",
  goal: "主持会议，无视人类人情顾虑，高声打断非学术扯皮，定向点名提问参会者"
};

// 3. SecretaryAgent (学术纪要秘书)
export const SecretaryAgent = {
  name: "SecretaryAgent",
  role: "学术纪要与 TODO 提取秘书",
  goal: "提取托班互动硬件与算法的学术共识，调用腾讯会议 Docs API 自动写入"
};

// 4. ResearcherAgent (知识库检索代理)
export const ResearcherAgent = {
  name: "ResearcherAgent",
  role: "腾讯会议与多模态 RAG 检索员",
  goal: "调用 Doubao-embedding-vision 向量检索与腾讯会议 API 答疑"
};
```

---

## 六、 腾讯会议 (Tencent Meeting) 全栈集成实施步骤

### 步骤 1：状态与类型扩展 (`src/types.ts` & `src/store.ts`)
```typescript
export interface TencentMeetingState {
  meetingId: string;
  meetingCode: string;
  joinUrl: string;
  status: string;
  isSyncEnabled: boolean;
  participants: Array<{ userId: string; userName: string; userRole: string; isMuted?: boolean }>;
}
```

### 步骤 2：后端 API 代理与 Webhook 路由 (`server/routes/tencentMeeting.ts`)
1. `POST /api/tencent/meetings/create`：创建腾讯会议会场。
2. `GET /api/tencent/meetings/:meetingId`：查询会议状态。
3. `GET /api/tencent/meetings/:meetingId/participants`：获取真实入会人列表。
4. `POST /api/tencent/webhook`：监听腾讯会议事件推送 (`user.joined` / `user.left` / `meeting.ended`)。

### 步骤 3：会后学术成果归档 (`src/components/KaibanBoard.tsx`)
提供 **“一键写入腾讯会议文档/待办”** 按钮，触发 `SecretaryAgent` 调用腾讯会议 Docs API，将提炼的 To-Dos 自动推送至腾讯会议在线文档与待办中心。

---

*请根据本 Master Blueprint，按阶段执行功能升级，构建极致高效的大地 ECE-Brain 智慧教研会议系统！*
