# 大地 ECE-Brain — 阶段一 / E1 部署说明

> 权威总规：`DADI_AI_MEETING_UPDATE_DEVELOPMENT_PROMPT.md`（v4）  
> **E1**：会议 API 跑在常驻 Node（Railway），状态只写 Upstash。Vercel 只托管静态前端，并把 `/api/*` 反代到 Railway。

## 已实现能力

1. **Upstash Redis meetingStore**（`server/lib/meetingStore.ts`）
   - 生产必须配置 `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`
   - 未配置时仅本地内存 fallback；生产 health 返回 503
2. **RAG roomId 隔离**：`/api/rag/embed-resource`、`/api/rag/search-knowledge`
3. **多终端分享链接**：`/?role=attendee&roomId=` + 姓名职务门禁
4. **HTTP Poll 同步**：`GET /api/live/poll?roomId=&since=`
5. **AI 控场 + Kaiban**：`POST /api/ai/intervene`、`POST /api/meeting/start`
6. **诚实 UX**：Phase-1 文本同步；真语音互通是后续 E2 火山 RTC

## 必配环境变量

Railway（常驻 API）与 Vercel 构建都需要：

```
DOUBAO_API_KEY 或 ARK_API_KEY
UPSTASH_REDIS_REST_URL
UPSTASH_REDIS_REST_TOKEN
APP_URL=https://dadimeeting.minervaedu.app
FRONTEND_ORIGIN=https://dadimeeting.minervaedu.app
```

Vercel 额外（可选，rewrite 已覆盖同源 `/api`）：

```
VITE_API_BASE=https://<railway-host>
```

## 验收清单

| 项 | 操作 |
|---|---|
| Health | `GET https://api-production-6cca.up.railway.app/api/health` → `runtime: railway`, `storeBackend: upstash`, `wsEnabled: true` |
| 分享 | A 创建会并复制链接，B 填信息进入同 room |
| 聊天 | A 发言，B 约 2s 内看到 |
| AI | 管理员点「开始会议」，两端出现 AI 开场 |

纯 Vercel Serverless 无法维持双向语音。E1 常驻 Railway 后 `/api/live/stream` 可在 Node 上工作；产品级多方真互通仍属 E2 火山 RTC。
