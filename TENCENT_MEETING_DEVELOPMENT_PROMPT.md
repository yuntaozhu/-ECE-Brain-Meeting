# 大地 ECE-Brain AI 智能会议系统 — 接入腾讯会议 (Tencent Meeting API) 全栈开发提示词 (Prompt)

> **版本**：v1.0.0  
> **面向对象**：AI Coding Agent / 全栈开发工程师  
> **适用项目**：大地 ECE-Brain AI 协同教研会议系统 (`DadiAIMeeting`)  
> **目标**：基于腾讯会议企业自建应用 REST API，构建从“会前同步一键拉起”、“会中成员/事件监控”、“双全工 AI 智能体/KaibanJS 看板联动”到“会后纪要待办回传”的全流程闭环。

---

## 📋 提示词指令 (Master System Prompt)

你是一名高级全栈架构师与 Node.js / TypeScript 专家。请严格按照以下架构规范与开发步骤，为 **大地 ECE-Brain AI 协同教研会议系统** 实现 **腾讯会议 (Tencent Meeting) 开放平台 REST API** 的深度集成。

---

### 1. 密钥与环境配置 (Environment & Credentials)

请在服务端环境变量 `.env` 及 `.env.example` 中安全配置以下从腾讯会议开放平台获取的企业自建应用凭证（严禁泄露至前端 Client 侧）：

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

### 2. 腾讯会议 REST API 鉴权与签名算法模块 (`server/services/tencentAuth.ts`)

根据腾讯会议开放平台 REST API 签名计算规范（[官方文档](https://cloud.tencent.com/document/product/1095/51253)），REST API 要求所有 HTTP 请求必须包含特定的 Header，并使用 **HMAC-SHA256** 算法计算签名 `X-TC-Signature`。

#### Header 参数要求：
*   `X-TC-Key`: Secret ID (`TENCENT_MEETING_SECRET_ID`)
*   `X-TC-Timestamp`: 当前 UNIX 时间戳（秒级）
*   `X-TC-Nonce`: 随机正整数（如 `Math.floor(Math.random() * 100000)`）
*   `X-TC-Signature`: HMAC-SHA256 签名串
*   `X-TC-Registered-Corp-Id`: 企业 ID (`TENCENT_MEETING_CORP_ID`)
*   `AppId`: 应用 ID (`TENCENT_MEETING_APP_ID`)
*   `SdkId`: （可选）企业 AppId

#### 签名字符串拼接规则 (Signature Header String):
```text
HTTP_METHOD + "\n" +
X-TC-Key + "\n" +
X-TC-Timestamp + "\n" +
X-TC-Nonce + "\n" +
RequestURI (例如 /v1/meetings) + "\n" +
RequestBody (POST/PUT 时为 JSON 字符串，GET 时为空字符串)
```
*使用 Secret Key 对上述拼接字符串进行 HMAC-SHA256 加密，并将结果进行 Base64 编码，即得到 `X-TC-Signature`。*

---

### 3. 后端服务 API 路由定义 (`server/routes/tencentMeeting.ts`)

请在 Express 后端路由处理层创建 `/api/tencent/*` API 代理路由，代理前端请求并附加安全的签名 Header：

#### 接口 1: 创建/预定腾讯会议 (`POST /api/tencent/meetings/create`)
*   **对应腾讯 API**：`POST /v1/meetings`（[官方文档](https://cloud.tencent.com/document/product/1095/42414)）
*   **业务逻辑**：当发起人在 `MeetingSetup.tsx` 中创建会议时，同步调用此接口。
*   **请求 Body**：
    ```json
    {
      "userid": "daid_it",
      "instanceid": 1,
      "subject": "大地 ECE-Brain 学术教研研讨会",
      "type": 0,
      "start_time": "1785500000",
      "end_time": "1785503600",
      "settings": {
        "allow_in_before_host": true,
        "auto_in_waiting_room": false,
        "allow_unmute_self": true
      }
    }
    ```
*   **响应处理**：提取返回的 `meeting_id`、`meeting_code` (会议号) 和 `join_url` (入会链接)，存入 Zustand Store 并返回前端。

#### 接口 2: 查询会议状态 (`GET /api/tencent/meetings/:meetingId`)
*   **对应腾讯 API**：`GET /v1/meetings/{meeting_id}?userid=daid_it&instanceid=1`（[官方文档](https://cloud.tencent.com/document/product/1095/42413)）
*   **业务逻辑**：实时轮询或点播获取会议当前的生命周期状态（未开始、进行中、已结束）。

#### 接口 3: 获取实时参会成员列表 (`GET /api/tencent/meetings/:meetingId/participants`)
*   **对应腾讯 API**：`GET /v1/meetings/{meeting_id}/participants?userid=daid_it&instanceid=1`（[官方文档](https://cloud.tencent.com/document/product/1095/83667)）
*   **业务逻辑**：获取已入会的园长、高管与教研员列表，将参会人同步到 ECE-Brain `MainRoom` 虚拟席位，供 AI 虚拟主席进行**定向点名**（如：“张园长已上线，请您就子议题二发言”）。

#### 接口 4: 腾讯会议 Webhook 事件回调监听 (`POST /api/tencent/webhook`)
*   **业务逻辑**：接收腾讯会议推送的事件消息（如：成员入会/离会事件 `user.joined` / `user.left`、会议结束事件 `meeting.ended`、云端录制/转写完成事件）。
*   **联动动作**：
    *   当监听到新成员入会，AI 虚拟主席自动发出欢迎耳返提醒。
    *   当监听到会议结束，触发后台全量文本的 **KaibanJS 会议纪要与待办事项自动提炼**。

---

### 4. 前端组件与业务流融合 (`src/components/*`)

#### A. 会前筹备与拉起 (`src/components/MeetingSetup.tsx`)
*   增加 **“同步创建腾讯会议 (Tencent Meeting Sync)”** 切换开关。
*   点击“开启会议”时，并发调用 `/api/tencent/meetings/create`。
*   成功后生成并展示包含**腾讯会议号**、**小程序快捷通道**与 **ECE-Brain Web 链接**的复合邀请卡片，支持一键复制。

#### B. 会中席位与 AI 主席点名联动 (`src/components/MainRoom.tsx`)
*   在界面顶部状态栏增加 **“腾讯会议已协同连接 (Tencent Sync Active)”** 的绿色 Badge 标识及腾讯会议号。
*   调用 `/api/tencent/meetings/:meetingId/participants` 定期更新在线参会者。
*   将实时参会人员名单注入 `useAgendaDriver.ts` 与 Gemini WebSocket 上下文中，驱动 AI 虚拟主席精准识别参会人。

#### C. 会后学术成果同步
*   在会议结束时，利用 KaibanJS 生成总结纪要，并提供“一键导出并同步至腾讯会议文档/待办”功能按钮。

---

### 5. 代码质量与安全要求 (Requirements)

1.  **Strict Security**: 所有的 API Key 与 HMAC 签名计算必须仅在 Server 侧 (`server.ts` 或 API Routes) 执行，绝不能将 `Secret Key` 透露到客户端。
2.  **Graceful Fallbacks**: 如果腾讯会议 API 返回网络超时或凭证异常，系统应平滑降级为 ECE-Brain 本地仿真模式，并弹出清晰提示，不影响本地 AI 主席与 KaibanJS 看板的正常运转。
3.  **Type Safety**: 在 `src/types.ts` 中定义完整的 `TencentMeetingInfo` 与 API Response 接口类型。

---

请确认上述提示词后开始编写或重构相应模块代码。
