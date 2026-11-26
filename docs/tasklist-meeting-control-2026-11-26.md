# Tasklist · 会议控制与 AI 主持（2026-11-26）

状态：`[ ]` 未开始 · `[~]` 进行中 · `[x]` 完成 · `[-]` 后置

关联：`docs/meeting-control-mvp.md` · `dev_knowledge/shared/patterns/meeting-event-contract.md`

---

## 阶段 0 · 决策与基线

| ID | 任务 | 交付 |
|----|------|------|
| M0-1 | MVP 方案入库 | `docs/meeting-control-mvp.md` |
| M0-2 | 事件契约 + 状态机 | `shared/patterns/meeting-event-contract.md` + schema |
| M0-3 | 隐私与告知默认策略 | 方案文档「产品决策」节 |
| M0-4 | 基线/契约 smoke | `scripts/smoke-meeting-events.cjs`（或 server 侧） |
| M0-5 | Playbook / INDEX 挂链 | `meeting-assistant.md`、`INDEX.md` |

## 阶段 1 · RTC AI 成员 MVP

| ID | 任务 | 交付 |
|----|------|------|
| M1-1 | MeetingEvent 规范化 + 回调环形缓冲 | `server/lib/meetingEvents.ts` |
| M1-2 | VoiceChat 回调写入事件；`GET .../events` | `dazhiVoiceChat` 路由 |
| M1-3 | 大智 HTTP 客户端（join/kick/interrupt/status） | `desktop/lib/rtc/voiceChatClient.cjs` |
| M1-4 | IPC + preload 暴露 | `desktop/main.cjs`、`preload.cjs` |
| M1-5 | 驾驶舱 RTC 控场卡（入会/打断/离会） | `renderer/index.html` + `app.js` |
| M1-6 | 小星 host 最小动作（议程提示/打断口令） | `meeting-commands` + `handle.cjs` |
| M1-7 | 联调说明与失败路径 | 更新 `DAZHI_RTC_VOICECHAT.md` |

## 阶段 2 · Bot 适配器

| ID | 任务 | 说明 |
|----|------|------|
| M2-1 | 选平台 + Vexa PoC | 接口与 dry-run 已落；真实密钥联调待组织授权 |
| M2-2 | `ExternalMeetingBotAdapter` 接口 | `server/lib/meetingBot/*` + `/api/meeting-bot/*` |
| M2-3 | 产品默认「转写→屏幕建议」 | API 固定 `speakInMeeting: false` |

## 阶段 3–4

| ID | 任务 |
|----|------|
| M3-1 | 两端场景矩阵（唤醒/打断/多轨/Bot 转写） |
| M3-2 | 摘要带说话人；模型草稿 vs 用户确认 |
| M3-3 | 驾驶舱消费 Bot 转写（屏幕建议） |
| M4-1 | 灰度/费用告警/审计/删除 | `/api/meeting-ops/*` · `server/lib/meetingOps.ts` |
| M4-2 | LiveKit 独立评估（不与 Bot 捆绑） | `shared/adr/013-livekit-agents-evaluation.md`（暂缓迁移） |

---

## 快速勾选

- [x] M0-1  
- [x] M0-2  
- [x] M0-3  
- [x] M0-4  
- [x] M0-5  
- [x] M1-1  
- [x] M1-2  
- [x] M1-3  
- [x] M1-4  
- [x] M1-5  
- [x] M1-6  
- [x] M1-7  
- [x] M2-1（dry-run / 接口；真实平台联调仍待授权）  
- [x] M2-2  
- [x] M2-3（API 语义冻结；驾驶舱消费可后续）  
- [x] M3-1（`docs/meeting-control-scenario-matrix.md` + `smoke:meeting-control`）  
- [x] M3-2（summary 说话人 + 草稿/已确认）  
- [x] M3-3（驾驶舱 Bot 卡）  
- [x] M4-1  
- [x] M4-2（评估结论：暂缓迁移）  

*完成后追加 `dev_knowledge/session_logs/dev_sessions.jsonl`（可含 `"project": "shared"` 或分产品）。*

## 后置（不阻塞 MVP）

| ID | 说明 |
|----|------|
| P-1 | 真实火山 RTC 联调（需组织 `.env`） |
| P-2 | 真实 Vexa 入会（需 `VEXA_API_KEY` + 授权会） |
| P-3 | 驾驶舱运维按钮已补（健康/审计/费用/按会删除）；手工勾选见 `meeting-control-acceptance.md` |

## 管理台对齐（领航控制台）

| ID | 状态 | 说明 |
|----|------|------|
| A-1 | [x] | `shared/patterns/meeting-admin-console.md` + `/api/meeting-admin/*` |
| A-2 | [x] | 大智：会议管理壳（专家/议题/记录）+ 会中控条 |
| A-3 | [x] | 小星：领域顾问/议题/会控条（独立代码，product=xiaoxing） |
| A-4 | [x] | `npm run smoke:meeting-admin` |
