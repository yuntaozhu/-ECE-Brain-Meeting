# 大地 ECE-Brain AI 智能会议系统 — 全流程开发提示词 Master Blueprint (v4.0)

> **文档性质**: 全栈端到端开发提示词 (Master System Prompt) 与架构接口规范说明书  
> **面向对象**: AI Coding Agent / 全栈开发工程师  
> **适用项目**: 大地 ECE-Brain AI 协同教研会议系统 (`DadiAIMeeting`)  
> **版本定位**: 相对 v3.5（腾讯会议 + TRTC 主通道）的**更新方案**；以**火山引擎 RTC + 豆包语音（ASR/TTS）+ 火山方舟 Doubao（LLM/Embedding）** 作为实时会议与 AI 主席主栈，ECE-Brain 业务壳（React / Node / KaibanJS / 议程 / RAG）保留并演进。  
> **设计核心**: 解决传统人类会议中「人情揣测大于议题推进」的低效痛点，实现会前 RAG 挂载与分钟级议程、会中真人互通 + AI 虚拟主席双向控场 + 实时字幕、会后纪要归档的全闭环。

---

## 📋 开发者核心指令 (Master Developer Directive)

你是一名高级全栈架构师与 Node.js / TypeScript 专家。请**严格按本 v4 规范**为大地 ECE-Brain 做端到端落地。

### 必须遵守的架构红线

1. **主媒体通道 = 火山引擎 RTC**，禁止继续用 TRTC mock / 占位密钥伪装「已连接」。
2. **AI 主席主路径 = 火山 RTC 实时对话式 AI（ASR + 方舟 LLM + TTS）**，禁止仅靠浏览器本地 TTS 冒充全员可听的会议音频。
3. **腾讯会议 OpenAPI = 可选外链 / 会后归档**，不是网页内实时互通的前提；禁止把腾讯会议号与火山 RTC `RoomId` 混用。
4. **业务信令与媒体分离**：媒体走火山 RTC；议程 / 聊天 / RBAC / A2A 事件走自建 `RealtimeChannel`（WebSocket 优先，HTTP 轮询降级）。
5. **实时后端必须常驻**（Railway / 火山 ECS / 自建 Node）；禁止把多方会议状态长期放在 Vercel Serverless 进程内存 `Map` 中。
6. **Vercel 无 RTC 媒体服务**：前端可部署 Vercel；音视频媒体与 AI Bot 不依赖 Vercel Functions。
7. **单一主媒体**：MVP 不并行维护 TRTC + 火山 RTC + 腾讯会议客户端三套主通道。
8. **成功判据可见**：仅当 RTC 真实 `join` + `publish` 成功才显示「已连接」；失败必须显式报错，禁止 sandbox 成功文案。

---

## 一、系统核心流程与架构概览

### 1.1 四阶段闭环

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│ 阶段一：会前教研资源挂载与 RAG 大纲设计                                              │
│ - TOS 上传资料 → Doubao Embedding → VikingDB（或过渡期向量存储）                     │
│ - 分钟级议程编辑（UI 显示分钟，Store 存 durationSec）+ Doubao 智能生成议程            │
└────────────────────────┬─────────────────────────────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│ 阶段二：本站会场组建与分享链接                                                       │
│ - 生成 roomId；分享 /?role=attendee&roomId=...                                    │
│ - 签发火山 RTC Token；可选额外生成腾讯会议外链（不替代本站 RTC）                      │
└────────────────────────┬─────────────────────────────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│ 阶段三：数字研讨大室（火山 RTC 真人互通 + 实时字幕）                                  │
│ - 火山 RTC Web SDK 入房 / 推拉流                                                   │
│ - startSubtitle 实时字幕写入 transcript                                            │
│ - RealtimeChannel：WS 优先 / HTTP Poll 降级同步议程与聊天                          │
└────────────────────────┬─────────────────────────────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│ 阶段四：KaibanJS A2A + 火山 RTC AI 主席控场                                        │
│ - StartAIConversation：AI Bot 入会（听 ASR / 说 TTS）                              │
│ - DirectorAgent 冷场/偏题 → HostAgent 控场 → ResearcherAgent RAG → Secretary 纪要  │
│ - 议程超时 / [ACTION: AGENDA_NEXT] 驱动 Kanban                                     │
└──────────────────────────────────────────────────────────────────────────────────┘
```

### 1.2 目标技术架构

```
┌────────────── 前端（React 19 + Zustand + Vite）──────────────────┐
│ MeetingSetup / MainRoom / AgendaKanban / Chat / Subtitle Overlay │
│ SDK：火山 RTC Web SDK（替换 trtc-js-sdk 主路径）                 │
└────────────────────────────┬─────────────────────────────────────┘
                             │ 业务事件：WS 优先 / HTTP Poll 降级
┌────────────────────────────▼─────────────────────────────────────┐
│ 业务后端（Express/tsx 演进；部署 Railway 或火山 ECS）              │
│ - 会议 / 房间 / RBAC / 议程 Store                                  │
│ - RAG：Embedding + VikingDB（或过渡抽象层）                       │
│ - RealtimeChannel 网关 + Redis Stream                              │
│ - 火山 RTC OpenAPI：Token / StartAIConversation / 结束会议         │
│ - KaibanJS A2A：Director / Host / Secretary / Researcher           │
│ - （可选）腾讯会议 OpenAPI：外链建会 / 纪要回写                    │
└──┬──────────┬──────────────┬───────────────┬─────────────────────┘
   ▼          ▼              ▼               ▼
火山 RTC   豆包 ASR 2.0   火山方舟 Doubao   豆包 TTS 2.0
(真人+AI     (字幕/控场     LLM + Embedding  (AI 主席发声)
 音视频)      输入)          (RAG/纪要/控场)
                                         │
                                         ▼
                              TOS / VikingDB / Redis
```

### 1.3 三层通道（必须分清）

| 层 | 职责 | 技术 |
|---|---|---|
| **Layer A 媒体通道** | 真人麦克风/摄像头 ↔ AI Bot 音频 | 火山 RTC（不做业务状态存储） |
| **Layer B 业务通道** | 议程、看板、聊天、RBAC、A2A 元事件 | RealtimeChannel：WS → HTTP Poll + Redis |
| **Layer C 管理通道** | 建会、上传、RAG、导出纪要、可选腾讯会议 | REST API |

### 1.4 能力映射

| 能力 | v4 采用服务 | 现仓库对应（演进点） |
|---|---|---|
| 页面与状态 | React + Zustand | 保留 `App` / `MeetingSetup` / `MainRoom` / `store` |
| 真人音视频 | **火山 RTC** | 替换 `useTrtcMultiUser.ts` → `useVolcRtc.ts` |
| AI 主席听/说 | **RTC AI Conversation + 豆包 ASR/TTS + 方舟 LLM** | 替换本地伪 TTS 推流 / Gemini Live 主路径 |
| 实时字幕 | RTC `startSubtitle` | 新增字幕层；写入 `transcript` |
| Embedding / RAG | 方舟 Embedding + VikingDB | 升级 `/api/rag/embed-resource` |
| 议程控场 | AgendaEngine + KaibanJS A2A | 保留 `useAgendaDriver` / Kanban，事件走统一总线 |
| 业务信令 | WS + Poll + Redis | 收敛 `ChatBox` / `websocketMeeting` / `meetingStates` |
| 部署 | 前端可 Vercel；**实时后端常驻** | 禁止纯 Serverless 内存状态扛多方会议 |
| 腾讯会议 | 可选外链 / 归档 | 保留 API，UI 标明非本站实时主通道 |

### 1.5 部署拓扑

```
推荐生产拓扑：

[Vercel]  静态前端 / 可选非实时 API
    │
    │  API_BASE → Railway（或火山 ECS）
    ▼
[Railway / ECS]  Express 常驻
          ├─ WS / Poll
          ├─ RAG / Agenda / Kaiban
          ├─ Redis
          └─ 调火山 RTC / Ark / ASR·TTS OpenAPI

[火山引擎]  RTC 媒体 + 方舟 + 豆包语音 + TOS + VikingDB

（可选）[腾讯会议 OpenAPI] 外链建会 / 纪要回写
```

**说明**：
- Vercel **没有** TRTC / 火山 RTC / Jitsi 类媒体服务；WebSocket（Fluid Compute）最多做业务事件，不能替代 SFU。
- Railway **适合**常驻 Node + Redis；**没有**官方托管 RTC；自建 LiveKit 受 UDP 限制，不作为本方案首选。
- 媒体与 AI 语音一律走火山托管服务。

---

## 二、阶段一：会前 RAG 与分钟级议程

### 2.1 需求

主办方上传教研课件（PDF / 文本 / 视频说明等），系统向量化入库，并生成可编辑议程（默认三段：开场 / 核心 / 收官）。前端议程时长以**分钟**输入，后端统一存 `durationSec`。

### 2.2 Embedding API（必须）

```bash
curl --location 'https://ark.cn-beijing.volces.com/api/v3/embeddings/multimodal' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer $ARK_API_KEY' \
--data '{
    "model": "doubao-embedding-vision-251215",
    "instructions": "Target_modality: text and video.\nInstruction:Compress the text/video into one word.\nQuery:",
    "input": [{ "type": "text", "text": "大地ECE托班数字化教学资料摘要..." }],
    "dimensions": 1024,
    "multi_embedding": { "type": "enabled" },
    "sparse_embedding": { "type": "enabled" },
    "encoding_format": "float"
}'
```

### 2.3 实现要点

1. 大文件优先 **TOS + STS** 直传，避免大 payload 打满 Express。
2. 文本抽取后按约 500 字滑窗切块；调用 Embedding 后写入 VikingDB（生产）。
3. 过渡期可保留内存 / pgvector，但必须抽象 `VectorStore` 接口，便于切换。
4. 端点：保留并演进 `POST /api/rag/embed-resource`；新增检索 `POST /api/rag/search`。
5. 有文档时用 Doubao Chat 生成 JSON 议程；无文档时使用三段 fallback。
6. `ResearcherAgent` 触发时：问题 Embedding → top_k 检索 → 拼入 system prompt。

### 2.4 议程分钟制（前端示例约定）

```tsx
// UI 显示分钟；写入 Store 用秒
<input
  type="number"
  min={1}
  value={Math.round(item.durationSec / 60)}
  onChange={(e) => update(i, { durationSec: Number(e.target.value) * 60 })}
/>
```

---

## 三、阶段二：本站会场与分享链接

### 3.1 分享链接（主入口）

```
主席:   https://<domain>/?roomId=<roomId>&role=creator
参会者: https://<domain>/?roomId=<roomId>&role=attendee
```

- `roomId` 全链路统一（字符串）；火山 RTC 入房使用同一业务 `roomId`（若 SDK 要求数字房间，用**明确映射表**，禁止 `parseInt` 失败静默落到 `10086`）。
- Attendee 打开链接自动入会；允许修改昵称；`userId` 必须为稳定唯一 ID：`user_<uuid>`，**禁止** `encodeURIComponent(中文名)`。

### 3.2 火山 RTC Token

- 后端新增 `POST /api/volc/rtc/token`，用 `VOLC_RTC_APP_ID` / `VOLC_RTC_APP_KEY` 签发。
- 前端仅拿 Token 入房，密钥不得下发浏览器。

### 3.3 腾讯会议（可选，非主通道）

- 保留「生成腾讯会议外链」按钮与现有 `/api/tencent/*` 代理。
- UI 文案必须区分：**本站实时会场（火山 RTC）** vs **腾讯会议邀请（外部客户端）**。
- 双房间音频桥接 Bot **不进 MVP**。

环境变量（腾讯侧可选）：

```env
TENCENT_MEETING_CORP_ID=
TENCENT_MEETING_APP_ID=
TENCENT_MEETING_SECRET_ID=
TENCENT_MEETING_SECRET_KEY=
TENCENT_MEETING_HOST_USER_ID=
TENCENT_MEETING_API_BASE=https://api.meeting.qq.com
```

---

## 四、阶段三：火山 RTC 真人互通与实时字幕

### 4.1 替换 TRTC 主路径

| 旧 | 新 |
|---|---|
| `trtc-js-sdk` + `/api/trtc/usersig` | 火山 RTC Web SDK + `/api/volc/rtc/token` |
| `useTrtcMultiUser.ts` | `useVolcRtc.ts`（建议新建，旧文件可开关兼容后删除） |
| mock_sig / 占位 AppId 显示已连接 | 真实 join/publish 失败则标红错误 |

### 4.2 入房与推流验收标准

两端打开同一 `roomId` 分享链接后必须满足：

1. 双方控制台可见真实 joined。
2. 本地音频已 publish。
3. 对端 `stream-added` / 等价事件后可播放远端音频。
4. UI 状态与真实媒体状态一致。

### 4.3 实时字幕

```js
engine.startSubtitle({
  mode: 'user_and_ai',
  targetLanguage: 'zh',
});
engine.on('onSubtitleMessageReceived', (msgs) => {
  // 写入 transcript + Redis 事件流，供控场与会后纪要
});
```

参考文档：
- [在应用中使用 RTC 实现 AI 实时对话](https://www.volcengine.com/docs/6348/1393085)（以控制台最新文档为准）
- [配置语音识别 ASR](https://www.volcengine.com/docs/6348/1581712)
- [实时字幕（对话记录）](https://www.volcengine.com/docs/6348/1337284)

### 4.4 RealtimeChannel（WS → Poll）

统一现有 Socket.IO / 原生 `ws` / 2s poll 为单一通道：

```ts
// 约定行为（实现时落地为 src/lib/realtimeChannel.ts）
class RealtimeChannel {
  // 1. 优先 WebSocket / Socket.IO 连接 /ws/meeting 或 /api/live/stream
  // 2. 2s 未 open → fallbackToPoll
  // 3. GET /api/live/poll?roomId=&since=<seq> 拉增量事件
  // 4. 上行统一 POST /api/live/send（与传输解耦）
  // 5. 事件类型固定：chat | agenda_switch | participant | ai_intervention | system | subtitle
}
```

后端要点：
- 事件持久化用 **Redis Stream**（或等价）；禁止仅依赖单进程内存 `meetingStates` 做生产多方同步。
- 轮询返回 `{ events, seq }`，保证不丢消息。
- Attendee **不得**被禁言；聊天与发声权限对 Creator / Attendee 均开放（议程强切等管理权仍 RBAC）。

---

## 五、阶段四：AI 主席与 KaibanJS A2A

### 5.1 AI 主席主路径（火山 RTC AI Conversation）

服务端在会议开始后调用 RTC OpenAPI（如 `StartAIConversation`），将 AI 作为虚拟用户加入同一 `RoomId`：

- ASR：豆包流式大模型（`Mode=bigmodel` 等控制台配置）
- LLM：火山方舟 `DOUBAO_CHAT_MODEL`（如 `doubao-seed-2-pro-*`）
- TTS：豆包 TTS 2.0（可选声音复刻，后置）

真人通过 RTC SDK 入同一房间即可听到 AI；AI 可听真人。**全双工打断**按火山 RTC AI 文档配置。

参考：
- [配置语音合成 TTS](https://www.volcengine.com/docs/6348/1581713)
- [火山方舟模型列表](https://www.volcengine.com/docs/82379/1330310)

### 5.2 KaibanJS Agent 职责（保留并接线字幕流）

```typescript
export const DirectorAgent = {
  name: "DirectorAgent",
  role: "议程心跳与偏题巡检员",
  goal: "基于字幕/ASR 文本检测冷场（>8s）与偏题，向 HostAgent 发 A2A_INTERVENTION"
};

export const HostAgent = {
  name: "HostAgent",
  role: "大地教研总督导 / AI 会议主席",
  goal: "无视人情顾虑打断非学术扯皮，定向点名，输出控场话术供 RTC AI/TTS 播放"
};

export const SecretaryAgent = {
  name: "SecretaryAgent",
  role: "学术纪要与 TODO 提取秘书",
  goal: "提取共识与待办；可选回写腾讯会议文档或本站导出"
};

export const ResearcherAgent = {
  name: "ResearcherAgent",
  role: "多模态 RAG 检索员",
  goal: "Doubao Embedding + 向量库检索，为 Host 提供硬核依据"
};
```

### 5.3 议程推进

- 倒计时到 0 / 检测到 `[ACTION: AGENDA_NEXT]` → 切换 `agendaStage` + Kanban 动画。
- 超时触发：总结当前环节 → 过渡下一议程 → 通过 AI Bot 播出 + `broadcast(agenda_switch)`。
- 已是最后议程则收官，不再强切。

### 5.4 会后纪要

会议结束时，将全程字幕/转写 + 议程结构 + RAG 摘要喂给 Doubao，输出结构化纪要（议题、要点、结论、待办、资料出处），存库并支持导出。

---

## 六、环境变量草案（v4 主栈）

```env
# 火山方舟
ARK_API_KEY=
DOUBAO_API_KEY=                 # 可与 ARK_API_KEY 统一，实现时只保留一套
DOUBAO_CHAT_MODEL=doubao-seed-2-pro-260215
DOUBAO_EMBED_MODEL=doubao-embedding-vision-251215

# 火山 RTC
VOLC_RTC_APP_ID=
VOLC_RTC_APP_KEY=

# 存储与状态
TOS_BUCKET=
TOS_ACCESS_KEY=
TOS_SECRET_KEY=
VIKINGDB_HOST=
REDIS_URL=

# 部署
APP_URL=
REALTIME_SERVER_URL=            # Railway / ECS 常驻后端地址

# 可选：腾讯会议外链
TENCENT_MEETING_CORP_ID=
TENCENT_MEETING_APP_ID=
TENCENT_MEETING_SECRET_ID=
TENCENT_MEETING_SECRET_KEY=
TENCENT_MEETING_HOST_USER_ID=
TENCENT_MEETING_API_BASE=https://api.meeting.qq.com

# 兼容开关（默认关闭旧 TRTC 主路径）
ENABLE_LEGACY_TRTC=false
TRTC_SDK_APP_ID=
TRTC_SECRET_KEY=
```

---

## 七、迁移实施步骤（Agent 执行顺序）

按阶段提交，**禁止**一次大爆炸改完所有文件。

| 阶段 | 目标 | 验收标准 |
|---|---|---|
| **P0** | 业务后端常驻部署说明 + Redis 会议状态抽象 | 两终端文字聊天稳定互通（不依赖单实例内存） |
| **P1** | 接入火山 RTC，替换 TRTC 入房主路径 | 两终端真实听到对方麦克风 |
| **P2** | `StartAIConversation` AI Bot 入会 | 全员能听到 AI 主席 |
| **P3** | `startSubtitle` + 字幕入 `transcript` | 会中有实时字幕并落库 |
| **P4** | RAG → TOS/VikingDB（或抽象层）；议程分钟制固化 | 挂载资料后生成议程并可检索 |
| **P5** | AgendaEngine + Kaiban 接字幕流 | 静默/超时/切议程可触发 AI |
| **P6** | RealtimeChannel 统一 WS/Poll | 断 WS 后状态仍同步 |
| **P7** | 腾讯会议改为可选外链；清理 mock「已连接」文案 | UI 不再暗示腾讯=本站实时 |

### MVP（优先）

1. 火山 RTC 双端互通  
2. AI Bot 能听会说  
3. 本站分享链接入会  
4. 议程倒计时 + 至少一次 AI 切段  
5. WS/Poll 业务同步  
6. 常驻后端 + Redis  

### 后置

- 声音复刻  
- VikingDB 完整替换（可先抽象）  
- 腾讯会议双房间桥接  
- 屏幕共享理解  
- 小程序 / Electron  

---

## 八、关键代码落点清单（供 Agent 改文件时对照）

| 区域 | 路径 | 动作 |
|---|---|---|
| RTC Hook | `src/hooks/useTrtcMultiUser.ts` | 新建 `useVolcRtc.ts` 并切换调用方 |
| Token API | `server.ts` `/api/trtc/usersig` | 新增 `/api/volc/rtc/token`；旧接口可兼容开关 |
| 入会 / 分享 | `src/App.tsx` / `MeetingSetup.tsx` | 统一 roomId；Attendee 可改名；唯一 userId |
| 状态 | `src/store.ts` | Redis 同步字段；去掉「假连接」依赖 |
| 聊天总线 | `src/components/ChatBox.tsx` / `server/websocketMeeting.ts` | 收敛为 RealtimeChannel |
| 议程 | `src/hooks/useAgendaDriver.ts` | 接字幕/ASR 事件与 AI Bot 控场 |
| RAG | `server.ts` `/api/rag/*` | TOS + VectorStore 抽象 |
| 腾讯会议 | `server/routes/tencentMeeting.ts` | 降为可选外链 |
| 遥测文案 | `TelemetryPanel` / `AudioConnectionMonitor` | 文案改为火山 RTC |

---

## 九、与 v3.5 文档关系

- `ECE_BRAIN_MEETING_DEVELOPMENT_PROMPT.md`（v3.5）描述的是 **腾讯会议 + TRTC** 主通道历史方案。  
- **本文件 `DADI_AI_MEETING_UPDATE_DEVELOPMENT_PROMPT.md`（v4.0）为当前权威实施规范。**  
- Agent 执行新功能时：**以本 v4 为准**；仅在 `ENABLE_LEGACY_TRTC=true` 或明确要求兼容时触碰旧 TRTC 路径。

---

## 十、官方文档入口（对接时翻阅）

- 实时对话式 AI：[火山引擎 RTC 文档中心](https://www.volcengine.com/docs/6348)（搜索「AI 实时对话」「StartAIConversation」）
- ASR 配置 / TTS 配置 / 实时字幕：以火山控制台当前文档版本为准  
- 方舟模型与 Embedding：[火山方舟](https://www.volcengine.com/docs/82379)  
- 豆包语音能力：[豆包语音](https://www.volcengine.com/docs/6561)

---

*请根据本 Master Blueprint v4.0，按 P0→P7 顺序执行功能升级。优先打通「火山 RTC 双端互通 + AI Bot 入会」，再接线议程控场与 RAG。构建可真实跨终端通信的大地 ECE-Brain 智慧教研会议系统。*
