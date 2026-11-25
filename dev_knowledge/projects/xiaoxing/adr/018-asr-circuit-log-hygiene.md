# ADR-018：ASR 熔断与日志降噪

## 背景

实网日志出现 `ENOTFOUND openspeech.bytedance.com` / `connect_timeout` 时，虽有 8s rateLimit，仍每数秒打 ERROR；同时 consult 成功路径缺少 layer/tts 埋点，「打开日志目录」双写。

## 决策

1. `lib/asr/circuit.cjs`：网络类错误连续 ≥3 次 → `circuit_open`，退避 30s～120s；窗内 `circuit_hold` 聚合（首条 + 每 10 条）。  
2. `CloudAsrSession` 重连服从熔断剩余时间；恢复成功发 `circuit_closed`。  
3. 主进程 `logAsrError` 区分 open/hold/closed；UI hint 提示 DNS/网络。  
4. `Meeting consult` / `ASR Me|Others final` 成功 INFO；打开日志目录仅主进程写一条。

## 后果

- `npm run smoke:asr:circuit`  
- 断网时日志不再线性刷 ERROR。
