# ADR-017：小星系统调试日志

## 背景

开发会议 / ASR / 行情时缺少统一落盘日志；大智已有 `debugLog`（文件 + 控制台 + UI）。小星需同等能力且**禁止** `require('../desktop/...')`。

## 决策

1. 独立实现 `xiaoxing/lib/platform/debugLog.cjs`：UTF-8 日切文件、内存环、脱敏、WARN/ERROR 限流。  
2. 路径：Electron → `userData/logs` + 镜像 `xiaoxing/logs/xiaoxing-YYYY-MM-DD.log`；纯 Node → 仅项目 `logs/`。  
3. 主进程 IPC：`logPath` / `logRecent` / `logOpenDir` / `logUi`；UI 经 `system-log` 事件上屏（`skipUi` 防双刷）。  
4. 驾驶舱 `#sysLog` 与对话气泡 `#log` 分离。  
5. 埋点：App / Meeting / Ask / ASR / Market / HTTP / Hotkey / Perm。

## 后果

- `npm run smoke:log`  
- `*.log` 已在 `.gitignore`；仓库旁可打开 `xiaoxing/logs/` 调试。
