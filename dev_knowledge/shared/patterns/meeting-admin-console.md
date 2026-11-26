# Pattern · 会议管理台（专家 / 议题 / 会控）

对标「大智 AI 领航会议系统」控制台能力，两端独立落地、共享契约与 HTTP。

## 信息架构

| 导航 | 职责 |
|------|------|
| 会议 | 选顾问/专家 → 填名称/类型/参会对象 → 匹配议题 → 进入会前等待 → 开始 |
| 专家/顾问 | CRUD；知识库绑定；音色；启用开关。小星称「领域顾问」，**不做专家人设包** |
| 议题 | 按项目标签筛选；标题/讨论说明/参会对象 |
| 记录 | 本场会话列表（会话 JSON）；详细录音仍在各产品 `knowledge/sessions` |
| 系统 | 灰度/运维健康（复用 `/api/meeting-ops`） |
| 用户 | 首期只读展示当前操作者（不落权限中心） |

## 会中控条（统一语义）

| 按钮 | 语义 | 大智落点 | 小星落点 |
|------|------|----------|----------|
| 会前提醒 | 口播开场提示 / 议程 | `hostSpeak(opening)` | TTS 开场 |
| 唤起 | 武装助手可答 | 听会 + 唤醒态 | `需唤醒` 开 + 口令等价 |
| 打断 | 停播报 | RTC interrupt 或 host 停播 | `interrupt` 口令路径 |
| 静音 | 本端不抢麦/停听本机 | 关「本机同时听」或停 Host | 旁听态 |
| 结束 | 散会 / 停听会 | `listen:stop` + session ended | `meeting stop` |

状态机：`prep → waiting → live → ended`（见 `/api/meeting-admin/sessions`）。

## API（共享服务端）

- 前缀：`/api/meeting-admin/*`
- **必填** `product=dazhi|xiaoxing`（query 或 body）
- 资源：`experts` · `topics` · `sessions`
- 落盘：`server/data/meeting-admin/<product>/`（运行态，勿写入 `dev_knowledge/`）

## 隔离红线

- 禁止 `desktop` ↔ `xiaoxing` 互相 `require`。
- UI 可相似，代码各自维护；模式只升格本文件。
- Bot 入会 ≠ 可发言（仍遵守 meeting-control MVP）。
