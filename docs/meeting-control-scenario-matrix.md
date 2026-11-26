# 会议控制 · 场景矩阵（阶段 3）

关联：`docs/meeting-control-mvp.md` · `docs/tasklist-meeting-control-2026-11-26.md`

| ID | 场景 | 期望 | 自动/手工 | 冒烟 |
|----|------|------|-----------|------|
| S01 | 小星唤醒提问 | `wake` → consult | 自动 | `smoke` / `smoke:meeting-host` |
| S02 | 小星打断口令 | `interrupt` → `speaking=false` | 自动 | `smoke:meeting-host` |
| S03 | 下一议程 / 进度 | host 口播提示 | 自动 | `smoke:meeting-host` |
| S04 | Others 只记转写 | 不抢麦口播 | 自动 | `smoke` |
| S05 | 半双工播报中忽略咨询 | `skipped_speaking` | 自动 | meeting handle |
| S06 | MeetingEvent 幂等 | 重复 event_id 拒绝 | 自动 | `smoke:meeting-events` |
| S07 | RTC join/kick/interrupt API | 服务端闭环 | 手工+联调 | 驾驶舱 RTC 卡 |
| S08 | Bot dry-run 转写 | `speakInMeeting=false` | 自动 | `smoke:meeting-bot` |
| S09 | 驾驶舱拉 Bot 转写 | 进屏幕转写区，非会议发言 | 手工 | 驾驶舱 Bot 卡 |
| S10 | 摘要带说话人 + 草稿标记 | summary md 含 `[草稿]/[speaker]` | 自动 | `smoke:meeting-summary-speaker` |
| S11 | 审计脱敏 + 按会议删除 | 审计无全文；delete 不影响其他会 | 自动 | `smoke:meeting-ops` |

## 运行

```bash
npm run smoke:meeting-events
npm run smoke:meeting-bot
cd xiaoxing && npm run smoke:meeting-host && npm run smoke:meeting-summary-speaker
npm run smoke:meeting-control   # 根目录串联（若已加脚本）
```
