# 大地 ECE-Brain AI 智能会议系统 — 腾讯会议 (Tencent Meeting API) 全栈深度集成开发提示词 (Prompt)

> **文档版本**：v2.0.0 (全系统深度融合版)  
> **面向对象**：AI Coding Agent / 全栈开发工程师  
> **适用项目**：大地 ECE-Brain AI 协同教研会议系统 (`DadiAIMeeting`)  
> **设计核心**：将腾讯会议 (Tencent Meeting) REST API 与开放平台事件机制，**深度融入 ECE-Brain 的会前筹备、会中 ECE-Brain 数字主理人（AI 虚拟主席）实时互动控场、KaibanJS 动态议程看板以及会后学术成果归档的全生命周期中**。

---

## 📋 提示词指令 (Master System Prompt)

你是一名高级全栈架构师与 Node.js / TypeScript 专家。请严格按照以下架构规范与开发步骤，为 **大地 ECE-Brain AI 协同教研会议系统** 实现 **腾讯会议 (Tencent Meeting) 开放平台 REST API 的全系统深度融合**，将腾讯会议从单纯的 API 服务转化为 ECE-Brain 数字主理人与教研员实时交互的核心载体。

---

## 一、 系统与产品架构定位 (Architectural Vision)

在 ECE-Brain 系统中，腾讯会议不单是一个三方工具，而是 **“ECE-Brain 数字主理人”** 触达真实教研员的音视频接入网关。
深度融合后的系统架构满足以下三阶段闭环：

1. **会前 (Pre-Meeting)**：高管在 ECE-Brain 筹备后台配置议程与 RAG 知识库，一键同步预定腾讯会议，生成包含**腾讯会议号 + Web 入口 + 小程序码**的复合邀请卡。
2. **会中 (In-Meeting)**：
   * **数字主理人参会控制**：顶部展示“腾讯会议实时协同”绿色状态灯与实时腾讯会议号。
   * **动态席位与定向点名**：定期轮询或通过 Webhook 同步腾讯会议入会成员列表，数字主理人（AI 虚拟主席）根据真实入会名单进行**定向点名与学术提问**（例如：“张园长已通过腾讯会议上线，请针对子议题二发表看法”）。
   * **8秒冷场起搏器**：当腾讯会议音视频通道静默超过 8 秒，AI 数字主理人主动发声打断冷场。
   * **KaibanJS 看板同步**：数字主理人发音包含 `[ACTION: AGENDA_NEXT]` 时，驱动 KaibanJS 看板切段，并同步更新腾讯会议的主题/议程。
3. **会后 (Post-Meeting)**：将 KaibanJS 提炼的学术决议与待办事项（To-Dos），一键写入腾讯会议官方文档与待办中心。

---

## 二、 密钥与环境凭证配置 (Environment Configuration)

请确保服务端 `.env` 及 `.env.example` 包含腾讯会议企业自建应用凭证：

```env
# 腾讯会议企业自建应用凭证 (DadiAIMeeting)
TENCENT_MEETING_CORP_ID=557124324
TENCENT_MEETING_APP_ID=3284013264
TENCENT_MEETING_SECRET_ID=3bmfDha2HIKuGLgtBXaJwzFfarW04XAU
TENCENT_MEETING_SECRET_KEY=mk1n3rh4sfdXrLMtPs3T3oUR5Ek6LacXZTw6CuhafnWQhXyl
TENCENT_MEETING_HOST_USER_ID=daid_it
TENCENT_MEETING_API_BASE=https://api.meeting.qq.com
```

---

## 三、 全栈融合开发实施路线图 (Step-by-Step Implementation Blueprint)

### 步骤 1：全局状态扩展 (`src/store.ts` & `src/types.ts`)

在 `src/types.ts` 与 `src/store.ts` 中加入腾讯会议全生命周期状态：

```typescript
// src/types.ts 扩展
export interface TencentMeetingState {
  meetingId: string;
  meetingCode: string;
  joinUrl: string;
  status: string;
  isSyncEnabled: boolean;
  participants: Array<{ userId: string; userName: string; userRole: string; isMuted?: boolean }>;
}

// Zustand Store 扩展
interface MeetingState {
  // ... 原有字段
  tencentMeeting: TencentMeetingState | null;
  setTencentSyncEnabled: (enabled: boolean) => void;
  setTencentMeetingInfo: (info: Partial<TencentMeetingState>) => void;
  updateTencentParticipants: (participants: Array<{ userId: string; userName: string; userRole: string; isMuted?: boolean }>) => void;
}
```

---

### 步骤 2：后端 API 代理与 Webhook 回调路由 (`server/routes/tencentMeeting.ts`)

在现有的 Express 路由基础上，完善以下四个核心融合接口：

1. **`POST /api/tencent/meetings/create`**：
   * 接收会前筹备数据（主题、开始/结束时间、子议程大纲）。
   * 调用 `meetingService.createMeeting()` 创建腾讯会议，返回 `meetingCode` 与 `joinUrl`。
2. **`GET /api/tencent/meetings/:meetingId`**：
   * 获取腾讯会议当前生命周期（`MEETING_STATE_STARTED` / `ENDED`）。
3. **`GET /api/tencent/meetings/:meetingId/participants`**：
   * 获取腾讯会议在线成员清单（用户名、角色、麦克风状态）。
4. **`POST /api/tencent/webhook`**：
   * 监听腾讯会议事件推送（如 `user.joined` / `user.left` / `meeting.ended`），实现实时事件推送到 ECE-Brain 前端。

---

### 步骤 3：会前筹备 UI 融合 (`src/components/MeetingSetup.tsx`)

1. **“腾讯会议联动”开关**：在会议筹备表单添加可切换开关“开启腾讯会议同步 (Tencent Meeting Bridge)”。
2. **异步创建与异常降级**：点击“开始会议”时，若开启同步，则请求 `POST /api/tencent/meetings/create`；如果腾讯 API 响应异常，自动降级为 ECE-Brain 本地模拟会场，弹出轻提示而不阻塞会议开幕。
3. **复合邀请卡片展示**：生成包含以下元素的视觉卡片：
   * 腾讯会议号（如 `328-401-326`）与“一键复制”按钮。
   * 腾讯会议直达链接（`https://meeting.qq.com/s/...`）。
   * ECE-Brain 数字教研室 Web 专属链接。
   * 已挂载 RAG 知识库文件特征标签。

---

### 步骤 4：会中 ECE-Brain 数字主理人深度交互 (`src/components/MainRoom.tsx` & `src/hooks/useAgendaDriver.ts`)

1. **顶栏状态标识**：
   * 当 `tencentMeeting.isSyncEnabled === true` 时，在界面顶部栏呈现绿色高亮 Badge：`[腾讯会议在线: 328-401-326 | 在线 4 人]`。
2. **数字主理人上下文感知与定向点名**：
   * 定时（每 10 秒）或通过事件刷新腾讯会议参会人列表。
   * 将当前在线教研员姓名（如“张园长”、“李专家”）实时拼接注入到 Gemini Live 的 System Prompt 与 `useAgendaDriver.ts` 中。
   * **数字主理人语气契约**：“检测到张园长已在腾讯会议上线，有请张园长就【防眩光网关指标】发表意见。”
3. **8秒冷场起搏器联动**：
   * 若腾讯会议音频通道无发言满 8 秒，起搏器被激活，数字主理人使用高敏发声策略主动向腾讯会议在线人员抛出教研问答。
4. **KaibanJS 议程看板位移**：
   * 数字主理人发言识别到 `[ACTION: AGENDA_NEXT]` 时，KaibanJS 议程卡片产生滑移动效，并在顶部状态栏更新当前讨论小节。

---

### 步骤 5：会后学术成果与腾讯会议归档同步 (`src/components/KaibanBoard.tsx`)

1. **学术决议一键归档**：
   * 会议结束时，KaibanJS 会议智能代理提炼出“学术共识”与“行动待办”。
2. **腾讯会议同步按钮**：
   * 提供“一键写入腾讯会议文档/待办”功能，调用 API 将学术总结推送到腾讯会议全员日程与文档中心。

---

## 四、 交互与防御性设计规范 (Quality & Security Rules)

1. **密钥保护 (Zero Secrets Leaked)**：所有 HMAC-SHA256 签名计算必须严格保留在服务器端 (`server/` / `src/lib/meetingService.ts`)，客户端仅通过 `/api/tencent/*` 进行安全交互。
2. **平滑降级 (Resilient Fallback)**：当腾讯会议接口调用失败或未配置 ApiKey 时，系统需维持 ECE-Brain 本地双全工 AI 主席与 KaibanJS 看板的独立可用性。
3. **全流程 TypeScript 类型约束**：确保 `TencentMeetingState`、`CreateMeetingParams` 等在 `src/types.ts` 中获得无死角类型检查。

---

*请根据本提示词中的指导，将腾讯会议服务完整融入 ECE-Brain 开会流与数字主理人交互中。*
