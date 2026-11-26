# Pattern · 统一会议事件契约（MeetingEvent）

跨产品共享**语义与字段**，各产品独立实现适配器。禁止跨目录 `require` 运行时模块。

## 状态机

```text
idle → joining → listening → armed → speaking → interrupting → ending → idle
                 └─ reconnecting ⇄ listening
```

小星既有 `idle|listening|armed|speaking` 可映射；大智策略内部枚举经适配层对齐，不强制改引擎。

## 事件类型

| type | 含义 |
|------|------|
| `meeting.started` / `meeting.ended` | 会话起止 |
| `participant.joined` / `participant.left` | 参会者 |
| `transcript.partial` / `transcript.final` | 转写 |
| `ai.speaking.started` / `ai.speaking.completed` / `ai.interrupted` | AI 口播 |
| `bot.joined` / `bot.failed` | 外部 Bot |
| `provider.disconnected` | 提供方断连 |

## JSON Schema（逻辑）

```json
{
  "meeting_id": "string",
  "provider": "volc_rtc | vexa | desktop_local | xiaoxing_local",
  "event_id": "string",
  "seq": 0,
  "ts": "ISO-8601",
  "type": "meeting.started",
  "speaker": { "id": "", "display_name": "", "role": "user|ai|guest|host" },
  "track": "me|others|mixed|unknown",
  "text": "",
  "is_final": true,
  "connection": { "state": "connected|reconnecting|failed", "reason": "" },
  "ext": {}
}
```

## 适配器职责

1. **VolcRtcAdapter**：Start/Stop/Interrupt VoiceChat + 回调 → MeetingEvent。  
2. **ExternalMeetingBotAdapter**（阶段 2）：create/stop/status + 转写流 → MeetingEvent。  
3. 本地双轨：desktop / xiaoxing 现有 ASR 路径可发 `provider=*_local` 事件，便于统一测试。

## 幂等

- `event_id` 全局去重；同 `meeting_id` 下 `seq` 乱序可缓冲重排。  
- 同 `roomId` 重复 join 不得双开任务（火山侧已幂等）。
