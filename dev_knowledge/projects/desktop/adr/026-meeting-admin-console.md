# ADR-026 · 大智会议管理台（领航控制台对齐）

- 状态：Accepted
- 日期：2026-11-26

## 决策

在驾驶舱内嵌「会议管理」壳（非独立 SPA）：专家 / 议题 / 记录 / 会中预览 / 系统；会中控条语义对齐领航产品。数据经根服务 `/api/meeting-admin?product=dazhi`，不把密钥写入桌面。

## 后果

- UI 可与小星相似，但代码在 `desktop/renderer/ui/adminConsole.js`，禁止 import 小星。
- 系统页复用 meeting-ops；流量查看映射进程内费用计数（非正式云账单）。
