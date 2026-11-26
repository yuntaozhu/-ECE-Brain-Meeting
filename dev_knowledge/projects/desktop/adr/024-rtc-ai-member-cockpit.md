# ADR-024 · RTC AI 成员接入驾驶舱（阶段 1）

## 背景

火山 VoiceChat join/kick/interrupt 已在根 `server/` 实现，但桌面驾驶舱此前未接线；会议控制与知识库投入失衡。

## 决策

1. 桌面通过 `desktop/lib/rtc/voiceChatClient.cjs` HTTP 调用业务后端，**不持** RTC AK/SK。  
2. 服务端将回调与控房动作规范化为 `MeetingEvent`（`server/lib/meetingEvents.ts`）。  
3. 驾驶舱提供 RTC 控场卡：查状态 / AI 入会 / 打断 / 请离会。  
4. 与小星仅共享契约文档与 schema 镜像，不共享运行时模块。

## 后果

- 联调依赖 `npm run dev` + `DAZHI_SERVER_URL`。  
- 腾讯会议虚拟网桥路径仍独立；RTC 路径为「同房间 AI 成员」另一入口。  
- 阶段 2 Bot 适配器另立，不在本 ADR 范围。
