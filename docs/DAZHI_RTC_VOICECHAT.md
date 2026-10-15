# 大智接入配置（RTC VoiceChat · P0）

业务后端：Node.js + TypeScript + Express（`server.ts`）。  
本接入只拉起火山 RTC 实时对话式 AI，不改桌面网桥，也不引入全双工 3.0、声音复刻、VikingDB 或联网 RAG。

密钥只放本地 `.env` 或部署环境变量。`.env` 已在 `.gitignore`。`.env.example` 里 `ARK_API_KEY` / AK/SK 必须留空。

## 已实现接口

| 方法 | 路径 | 作用 |
|------|------|------|
| GET | `/api/dazhi/voicechat/status` | 环境变量、AppId 一致性、当前任务数 |
| POST | `/api/dazhi/voicechat/join` | `joinDazhiToRoom`，同一 `roomId` 幂等 |
| POST | `/api/dazhi/voicechat/kick` | `kickDazhiFromRoom`，用户离房必须调用 |
| POST | `/api/dazhi/voicechat/interrupt` | `UpdateVoiceChat` + `Command: "Interrupt"` |
| POST | `/rtc/voicechat/callback` | 控制台 VoiceChat 事件回调 |
| GET/POST | `/rtc/callback` | 预留回调入口（先回 200 `{}`，公网地址联调后再完善验签） |

真人加房 Token（已有，勿新建平行接口）：

| 方法 | 路径 | 作用 |
|------|------|------|
| POST | `/api/volc/rtc/token` | 签发 RTC Token（`VOLC_RTC_APP_ID` + `VOLC_RTC_APP_KEY`） |

Join 请求体：

```json
{ "roomId": "房间号", "targetUserId": "真人 userId" }
```

同一房间再次 join 会直接返回已有 `taskId`，不会再调一次 StartVoiceChat。  
`targetUserId` 必须与客户端 `joinRoom` 的 UserId 完全一致。

## 环境变量

```bash
# VoiceChat / StartVoiceChat
RTC_APP_ID=
VOLC_REGION=cn-north-1
VOLC_ACCESSKEY=
VOLC_SECRETKEY=
ARK_API_KEY=
ARK_ENDPOINT_ID=ep-20260928112753-fqzc7
RTC_VOICECHAT_CALLBACK_SECRET=
DAZHI_BOT_USER_ID=dazhi-ai-bot

# 真人客户端加房 Token（须与 RTC_APP_ID 为同一应用）
VOLC_RTC_APP_ID=
VOLC_RTC_APP_KEY=
```

- `ARK_API_KEY`：方舟密钥 `dazhi-server-key`。部署时注入，禁止写入源码或提交 Git。
- `ARK_ENDPOINT_ID`：`ep-20260928112753-fqzc7`（`doubao-seed-2-1-pro`）。
- `VOLC_ACCESSKEY` / `VOLC_SECRETKEY`：IAM 子用户 `dazhi-rtc-server` 的 AK/SK（禁止主账号），只用于 RTC OpenAPI 的 V4 签名。
- `RTC_APP_ID`：应用 `dazhiMeeting` 的 AppId（StartVoiceChat）。2026-10-15 起勿再用旧 AppId `6ab9e873…`。
- `VOLC_RTC_APP_ID` / `VOLC_RTC_APP_KEY`：客户端 Token 签发。**必须与 `RTC_APP_ID` 相同应用**，否则真人与 `dazhi-ai-bot` 不在同一应用空间，联调必失败。
- 桌面控场 LLM/Embedding 读 `DOUBAO_API_KEY`；VoiceChat 服务端路径读 `ARK_API_KEY`。两个 Key 分开，不要混用。
- **不要**为 `dazhi-ai-bot` 签发 Token（Bot 由 RTC 服务端自动入房）。

若配置了 `RTC_VOICECHAT_CALLBACK_SECRET`，回调请求需带头：

`X-Rtc-Signature: hex(HMAC-SHA256(secret, JSON.stringify(body)))`

未配置则不校验。

## StartVoiceChat Body（实测通过，禁止改层级）

接口版本固定 `2025-06-01`。ASR/TTS/LLM **必须**包在 `Config` 下：

```json
{
  "AppId": "<RTC_APP_ID>",
  "RoomId": "<roomId>",
  "TaskId": "<taskId>",
  "AgentConfig": {
    "TargetUserId": ["<真人 userId>"],
    "UserId": "dazhi-ai-bot",
    "IdleTimeout": 180
  },
  "Config": {
    "ASRConfig": {
      "Provider": "volcano",
      "ProviderParams": {
        "Mode": "bigmodel",
        "Credential": { "ApiResourceId": "volc.seedasr.sauc.duration" },
        "StreamMode": 2
      }
    },
    "TTSConfig": {
      "Provider": "volcano_bidirection",
      "ProviderParams": {
        "Credential": { "ResourceId": "seed-tts-2.0" },
        "Voice": "zh_female_vv_uranus_bigtts"
      }
    },
    "LLMConfig": {
      "Mode": "ArkV3",
      "APIKey": "<ARK_API_KEY>",
      "ModelName": "<ARK_ENDPOINT_ID>",
      "EndPointId": "<ARK_ENDPOINT_ID>"
    }
  }
}
```

硬约束：

- `TargetUserId` 必须是**字符串数组**
- TTS 字段名是 `Voice`（不是 `Speaker`）
- LLM 用 `Mode: "ArkV3"`，APIKey/ModelName/EndPointId 扁平放在 `LLMConfig` 下
- 禁止把 ASR/TTS/LLM 放在顶层；禁止 `Provider: "ark"`；禁止给 ASR/TTS 传自定义 AppId/AccessToken
- 单账号 OpenAPI 限流约 60 次/秒

## 控制台手动步骤

1. 打开 [AI 音视频互动 AppId](https://console.volcengine.com/conversational-ai/devTools/appIdManage)，选「软件应用」，把 AppId 填进 `RTC_APP_ID`，并保证 `VOLC_RTC_APP_ID`/`VOLC_RTC_APP_KEY` 指向同一应用。
2. 功能配置 → 回调设置 → 添加 VoiceChat 回调。  
   URL：`https://<你的域名>/rtc/voicechat/callback`  
   业务标识留空。若填写签名密钥，同步写入 `RTC_VOICECHAT_CALLBACK_SECRET`。
3. 豆包语音控制台确认已开通：
   - 豆包流式语音识别模型 2.0（小时版），资源 ID `volc.seedasr.sauc.duration`
   - 豆包语音合成大模型 2.0（`seed-tts-2.0`），音色 `zh_female_vv_uranus_bigtts`

## IAM

AK/SK 对应子用户需要：

```json
{
  "Statement": [{
    "Effect": "Allow",
    "Action": [
      "rtc:StartVoiceChat",
      "rtc:StopVoiceChat",
      "rtc:UpdateVoiceChat",
      "rtc:ListVoiceChat"
    ],
    "Resource": ["*"]
  }]
}
```

方舟和豆包语音公共资源不走这套 IAM。

## 联调

1. 填好 `.env` 后启动：`npm run dev`
2. `GET /api/dazhi/voicechat/status` 应为 `"ready": true`，且 `"appIdMatch": true`
3. 客户端 `POST /api/volc/rtc/token` 加房（`roomId` + `userId`）
4. 加房成功后 `POST /api/dazhi/voicechat/join`（`targetUserId` = 加房 userId），日志出现 `rtc.api_ok`
5. 自动订阅远端 `dazhi-ai-bot` 音频；对着目标用户说话，确认 ASR → 方舟 → TTS
6. 打断：`POST /api/dazhi/voicechat/interrupt`
7. 离房：`POST /api/dazhi/voicechat/kick`。不要只靠 `IdleTimeout` 180 秒，空等会继续计费

## 费用（Caution）

- RTC：每月约 10000 分钟免费额度，用尽后按分钟计费
- ASR 2.0：后付费约 1 元/小时（控制台赠送与并发以账单为准）
- TTS 2.0：按字符、小时结算
- 方舟 `doubao-seed-2-1-pro`：按 Token 后付费；免费额度用尽后即计费；欠费后约 2 小时缓冲，超期停服

建议在费用中心预充值并打开预算告警。每次测试后务必 `kick`。
