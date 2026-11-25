# ADR-009：双轨设备枚举与听会中按住说话

## 背景

驾驶舱出现：设备下拉空白、TTS 停在「检测中」、听会中按住说话无响应。

## 根因

1. `xiaoxing:status` 调用未导入的 `othersAsrStatus` → IPC 抛错 → 初始化中断，不枚举设备。  
2. Electron 未放行 `media` 权限 + `sandbox:true`，`getUserMedia` 易失败。  
3. 按住说话在 `meetingOn` 时直接 return，听会态无法 PTT。

## 决策

1. 正确导入 `othersAsrStatus`；status 失败不阻断后续初始化。  
2. `setPermissionRequestHandler` / `PermissionCheckHandler`；`sandbox: false`（对齐大智）。  
3. `meForceAskFlag` + `meAsrForceAsk`：听会中按住 / Push 临时强制咨询。  
4. UI「刷新设备」+ `devicechange` 重枚举；Others 优先匹配 CABLE 标签。

## 后果

- 需重启 Electron 生效。  
- 版本：`0.4.6-device-ptt`。
