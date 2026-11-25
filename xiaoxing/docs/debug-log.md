# 小星 · 系统调试日志

对照大智 `desktop/lib/platform/debugLog.cjs` **独立落地**（禁止跨项目 require）。

## 位置

| 场景 | 路径 |
|------|------|
| Electron | `%APPDATA%`/`userData`/logs + 镜像 `xiaoxing/logs/xiaoxing-YYYY-MM-DD.log` |
| Node 脚本 / `serve` | `xiaoxing/logs/xiaoxing-YYYY-MM-DD.log` |

## 用法

```js
const { debugLog } = require("./lib/platform/debugLog.cjs");
debugLog.info("Ask", "命中", { layer: "market" });
debugLog.warn("ASR", "重连", err, { rateKey: "asr-reconnect" });
debugLog.error("Meeting", "摘要失败", err);
```

- 密钥类字段自动 `***`  
- `rateKey` 抑制刷屏  
- 驾驶舱「系统日志」面板：清空 / 复制 / 打开目录  

## ASR 熔断（ADR-018）

网络不可达时：连续失败 → `circuit_open` → 退避重连；窗内 `circuit_hold` 聚合。  
成功咨询会打 `Meeting consult`（layer / tts / source_label）；ASR final 打截断文本。

## 命令

```bash
npm run smoke:log
npm run smoke:asr:circuit
```

详见 ADR-017 / ADR-018。
