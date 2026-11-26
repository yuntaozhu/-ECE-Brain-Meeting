# ADR-026 · 小星会议管理台

- 状态：Accepted
- 日期：2026-11-26

## 决策

独立落地与领航控制台同构的管理壳；导航称「领域顾问」，绑定知识库与音色，**不做专家人设包**（延续 meeting-commands `assistantMode`）。API `product=xiaoxing`。

## 后果

- 控条：会前提醒（TTS preAnswer）/ 唤起（需唤醒）/ 打断（ingest 口令）/ 静音旁听 / 结束听会。
- 与大智仅共享 HTTP 与 `meeting-admin-console` pattern。
