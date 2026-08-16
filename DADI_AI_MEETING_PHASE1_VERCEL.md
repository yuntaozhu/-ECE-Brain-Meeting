# 大地 ECE-Brain — 阶段一（仅 Vercel）执行说明

> 权威总规：`DADI_AI_MEETING_UPDATE_DEVELOPMENT_PROMPT.md`（v4）  
> 本文件约束 **当前已落地的 Phase-1**：只部署 Vercel，不做火山 RTC 真人麦克风互通。

## 已实现能力

1. **Redis / Memory meetingStore**（`server/lib/meetingStore.ts`）
   - Upstash：`UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`
   - 未配置时本地内存 fallback（单实例可用，多实例 Vercel 必须配 Redis）
2. **RAG roomId 隔离**：`/api/rag/embed-resource`、`/api/rag/search-knowledge`（余弦相似度）
3. **多终端分享链接**：`/?role=attendee&roomId=` + 昵称门禁 + 稳定 `userId`
4. **HTTP Poll 同步**：`GET /api/live/poll?roomId=&since=`
5. **AI 控场 + Kaiban**：`POST /api/ai/intervene`（silence / timeout / manual / chat）
6. **诚实 UX**：Phase-1 文本同步模式，不再伪装 TRTC 已连通

## Vercel 必配环境变量

```
DOUBAO_API_KEY 或 ARK_API_KEY
UPSTASH_REDIS_REST_URL
UPSTASH_REDIS_REST_TOKEN
APP_URL=https://dadimeeting.minervaedu.app
```

在 Vercel 控制台 → Storage / Marketplace 添加 **Upstash Redis**，再 Redeploy。

## 验收清单

| 项 | 操作 |
|---|---|
| Health | `GET /api/health` 返回 `storeBackend: upstash`（生产） |
| RAG | 筹备页上传资料 → search 命中同 roomId |
| 分享 | A 创建会并复制链接，B 填昵称进入同 room |
| 聊天 | A 发言，B 约 2s 内看到 |
| AI | 点「正式开始会议」或故意偏题（粽子/采购），两端出现 AI 主席 |
| 议程 | 超时或 `[ACTION: AGENDA_NEXT]` 推进 Kanban |

## Seeduplex 全双工语音（本地常驻 Node）

浏览器无法设置 `X-Api-Key`，因此由服务端 `/api/live/stream` 代理到：

`wss://openspeech.bytedance.com/api/v3/duplex/realtime/dialogue`

环境变量：

```
DOUBAO_SPEECH_API_KEY=   # 语音控制台 API Key（与方舟 Ark Key 不同）
DOUBAO_DUPLEX_MODEL=1.2.6.1
DOUBAO_DUPLEX_VOICE=zh_female_vv_jupiter_bigtts
```

本地：`npm run dev`（常驻 Node + WS）。  
纯 Vercel Serverless **无法**稳定维持会议时长的双向 Seeduplex 连接；生产语音需常驻后端或后续 Railway。

参考：[接入必读 / 全双工协议](https://www.volcengine.com/docs/6561/2549732)
