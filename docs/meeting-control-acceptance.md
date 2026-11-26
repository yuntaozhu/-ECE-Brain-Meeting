# 会议控制 · 运维验收短清单

方案：`meeting-control-mvp.md` · 勾选：`tasklist-meeting-control-2026-11-26.md`

## 自动（不需云密钥）

```bash
npm run smoke:meeting-control
```

须全绿：events / bot dry-run / xiaoxing host / summary speaker / ops（删除+审计脱敏）。

## 手工 · RTC（需 `.env` 火山配置）

1. `npm run dev`
2. 桌面驾驶舱 → RTC AI 成员：查状态 → 填 roomId/UserId → AI 入会 → 打断 → 请离会
3. 驾驶舱「审计摘要 / 费用计数 / 按会删除」，或 `GET /api/meeting-ops/audit`：可见 `rtc.*`，**无**转写全文
4. 「按会删除」或 `POST /api/meeting-ops/delete` `{ "meeting_id": "<roomId>" }` 后 events 清空该会

## 手工 · Bot（可选 `VEXA_API_KEY`）

1. 无密钥时 dry-run：驾驶舱「派 Bot / 拉转写」应成功且文案含不可发言
2. 有密钥：选定 Meet 或 Teams，真实入会后再拉转写；失败原因须可读
3. 确认 UI **不会**把「Bot 已入会」写成「AI 已可发言」

## 灰度与费用

| 变量 | 作用 |
|------|------|
| `MEETING_CONTROL_GRAY_PERCENT` | 0–100 声明灰度（健康接口回显） |
| `MEETING_FEATURE_RTC` / `MEETING_FEATURE_BOT` | 功能开关声明 |
| `MEETING_COST_WARN_*` | 进程内计数告警阈值（非云账单） |

## 管理台（专家 / 议题 / 会控条）

```bash
npm run smoke:meeting-admin
```

手工：大智/小星点「会议管理」→ 选顾问 → 进入会议 → 会前提醒/唤起/打断/静音/结束；两端 `product` 隔离。

## 退出本验收

- [x] `smoke:meeting-control` 绿（2026-11-26 本地全绿）  
- [ ] RTC 或 Bot 至少一条路径手工通过（或明确延期）  
- [x] 审计脱敏与按会删除抽查通过（`smoke:meeting-ops` 覆盖）  
- [x] LiveKit 仍按 ADR-013 暂缓，未误绑进发布  
- [x] `smoke:meeting-admin` 绿（两端种子与会话状态机）  
- [ ] 两端管理台控条手工走通一轮（需 `npm run dev`）  
