# 会议控制与 AI 主持 · MVP 方案（可执行）

> SSOT 摘要。勾选清单见 `docs/tasklist-meeting-control-2026-11-26.md`。  
> 事件契约见 `dev_knowledge/shared/patterns/meeting-event-contract.md`。

## 一句话

**先把火山 RTC AI 成员做成稳定的双向语音 MVP，再通过独立适配器接入线上会议 Bot；共享会议事件与评测，不重写现有语音链路，不合并小星与大智业务实现。**

## 两种接入

| 路径 | 目标 | 首期边界 |
|------|------|----------|
| **RTC AI 成员** | AI 作为房间参与者：听、说、可打断 | 复用 `docs/DAZHI_RTC_VOICECHAT.md` + `server/lib/dazhiVoiceChat.ts` |
| **线上会议 Bot** | 入会 + 说话人转写 | 转写优先；**Bot 入会 ≠ 会议内可发言** |

```text
小星 / 桌面大智
        │
会议会话与策略层（唤醒、打断、知识问答、摘要、主持动作）
        │
统一会议事件契约 MeetingEvent
        │
┌───────┴────────────────┐
VolcRtcAdapter             ExternalMeetingBotAdapter
同房间双向语音             入会 / 状态 / 实时转写
```

## 阶段

| 阶段 | 内容 | 退出条件摘要 |
|------|------|----------------|
| **0** | 范围冻结、契约、隐私、基线样本 | 文档与 schema 入库；基线脚本可跑 |
| **1** | RTC AI 成员 MVP 接到驾驶舱 | join/kick/interrupt 闭环；回调→事件；未授权不可控房 |
| **2** | Bot 适配器 + 单平台 PoC（Vexa 候选） | 授权会可入可停；转写进核心；失败原因可见 |
| **3** | 两端统一体验（契约对齐，代码不合并） | 场景矩阵绿；摘要带说话人 |
| **4** | 加固与扩平台 | 灰度/费用/审计；LiveKit 仅独立评估 |

## 开源取舍（摘要）

- LiveKit Agents / Pipecat：**不迁入生产**，学生命周期与打断测试。
- Vexa：**阶段 2 PoC**，Meet/Teams/Zoom 转写；不假设可发言。
- MeetEval：**离线评测**。
- OpenAI Realtime Meeting Assistant：**设计参考**。

## 仓库落点

| 区域 | 路径 |
|------|------|
| RTC 服务端 | `server/lib/dazhiVoiceChat.ts`、`server/lib/meetingEvents.ts`、`server/routes/dazhiVoiceChat.ts` |
| Bot 适配器 | `server/lib/meetingBot/`、`server/routes/meetingBot.ts`（`/api/meeting-bot/*`） |
| 运维加固 | `server/lib/meetingOps.ts`、`/api/meeting-ops/health|audit|cost|delete` |
| LiveKit | `dev_knowledge/shared/adr/013-livekit-agents-evaluation.md`（暂缓） |
| 大智接线 | `desktop/lib/rtc/voiceChatClient.cjs`、`main.cjs` / `preload.cjs` / 驾驶舱 RTC 卡 |
| 小星主持 | `xiaoxing/lib/meeting/*`、`knowledge/schema/meeting-commands.json` |
| 契约 | `dev_knowledge/shared/patterns/meeting-event-contract.md` |
| 清单 | `docs/tasklist-meeting-control-2026-11-26.md` |

## 产品决策（阶段 0 默认冻结）

1. RTC AI **允许**主动身份开场白（可关）；用户与主持人可 Interrupt / Kick。  
2. 外部 Bot 默认 **转写 + 屏幕建议**；会议内发言单独立项。  
3. Bot 首发平台待 PoC：**Meet 或 Teams 二选一**（Zoom 为第二候选）。  
4. 凭证服务端化；客户端仅短期 room token / 业务 API。  
5. 默认不落原始音频；转写留存与删除策略按部署环境配置。

## 铁律

- 禁止 `xiaoxing` ↔ `desktop` 互相 `require` 业务源码。  
- 共享只走契约、测试夹具与 `dev_knowledge/shared/`。  
- 不重写桌面双轨采集；不把 Bot 入会写成「AI 已可发言」。
