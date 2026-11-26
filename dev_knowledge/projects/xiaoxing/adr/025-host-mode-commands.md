# ADR-025 · 小星 host 模式最小主持口令

## 背景

`assistantMode: host|content` 仅为配置位；缺少可执行的控场口令。会议控制 MVP 要求小星独立实现主持节奏动作。

## 决策

在 `meeting-commands.json` 增加：

- `interruptPatterns` → 停播报（`session.setSpeaking(false)`）  
- `nextAgendaPatterns` → 下一议程提示  
- `hostWrapPatterns` → 进度提醒  

由 `handle.cjs` 直接返回口播文案；不引入大智策略引擎，不做专家人设包。

## 后果

- host 与 content 仍共用同一 handle；口令优先于普通 ask。  
- RTC 入会属服务端/大智驾驶舱路径；小星本阶段以本地半双工 + 口令为主。  
- 回归：`npm run smoke:meeting-host`。
