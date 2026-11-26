# ADR-025 · 外部会议 Bot（Vexa）转写适配器

## 背景

阶段 2 需要 Meet/Teams/Zoom 入会转写，且不得与火山 RTC 语音链路混绑。

## 决策

1. 引入 `ExternalMeetingBotAdapter`，首个实现为 Vexa（`server/lib/meetingBot/vexaAdapter.ts`）。  
2. HTTP：`/api/meeting-bot/create|stop|bots|transcripts|events|status`。  
3. **产品语义冻结**：`speakInMeeting: false`；转写进 `MeetingEvent`，默认供屏幕建议。  
4. 无 `VEXA_API_KEY` 或 `VEXA_DRY_RUN=1` 时走 dry-run，便于 CI。  

## 后果

- 真实 PoC 需组织授权与平台选择（Meet/Teams 优先）。  
- Zoom 可能因 web client / RTMS 策略失败，错误需透出 `bot.failed`。  
- 驾驶舱消费与摘要说话人归属属阶段 3。
