# Playbook：AI 会议助手能力栈

大智（`desktop/`）与小星（`xiaoxing/`）**均需具备 AI 会议能力**。差异在人设与领域知识，不在「要不要开会」。

## 能力清单（应对齐）

| 能力 | 参考 ADR / 规则 | 说明 |
|------|-----------------|------|
| 双轨听写 `[Me]`/`[Others]` | `shared/adr/001` | 禁止混轨自激 |
| VAD / 静音门控 | `shared/adr/002` | 含预卷，防吞字 |
| 云端流式 ASR（推荐） | 小星 `lib/asr/` · 大智 HostAsr | 豆包 SAUC；小星**不默认本地 Whisper** |
| 本地 Whisper 外挂（可选） | `shared/adr/003` | 效果一般时可跳过；不绑 Electron native |
| 唤醒 / 半双工 / 口播 | 产品 schema + 大智实现参考 | 唤醒词各产品独有 |
| FAQ→Wiki→坦诚 | `shared/playbook/knowledge-layers.md` | 会中不改库 |
| 会话沉淀 / inbox | 各产品 `knowledge/sessions` · `inbox` | 会后升格 |
| 胶囊 / 防录屏（可选） | `shared/adr/011` | HUD |
| Focus / 副驾驶（进阶） | `projects/desktop/adr/017`～`023` | 按里程碑裁剪引入 |
| RTC AI 成员 / 会议事件 | `docs/meeting-control-mvp.md` · `shared/patterns/meeting-event-contract.md` | 火山 VoiceChat；统一 MeetingEvent；Bot 转写阶段 2 |
| 外部会议 Bot（Vexa） | `server/lib/meetingBot/` · `/api/meeting-bot/*` | 转写优先；`speakInMeeting=false`；dry-run 可无密钥 |
| AI 主持口令（小星） | `xiaoxing` meeting-commands interrupt/next_agenda | host 模式节奏优先，非专家人设包 |

## 落地铁律

1. **读 shared，写本项目**：禁止 `require('../desktop/lib/...')`。  
2. 业务词只进本产品 `knowledge/` / `schema/`。  
3. 新坑先记 `projects/<name>/adr/`，通用再升 `shared/`。
