# ADR-003：本地 Whisper 外挂（不绑 Electron native）

## 背景

需要离线/低成本 ASR。Electron 主进程直接链 whisper.cpp node addon 会随 Electron ABI 破碎，打包与 CI 成本高。

## 试过什么

1. **Electron 内嵌 native whisper**：版本锁定痛苦，拒绝。
2. **纯云端 Host ASR**：可用，但无本地旁路。

## 决策

- `HOST_ASR_MODE=local` → `LocalWhisperSession`。
- 后端二选一（或并存优先 server）：
  - `WHISPER_SERVER_URL`：HTTP multipart 转写服务；
  - `WHISPER_BIN` + `WHISPER_MODEL`：外挂 CLI。
- 模型下载：`npm run whisper:model`；冒烟：`npm run whisper:smoke`。
- 文档：`WHISPER_LOCAL.md`。

## 后果

- 用户需自备 binary/server；应用只做 PCM→WAV→调用→纠错后上抛。
- 禁止在本仓库引入绑定当前 Electron 的 whisper native addon。
