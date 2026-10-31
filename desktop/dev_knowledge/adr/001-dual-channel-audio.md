# ADR-001：双通道音频（Me / Others）

## 背景

会场需要区分「本机说话人」与「会场他人」，以便：策略/巡检只听他人、本机口令标定、避免回声自激。

## 试过什么

1. **单轨混音再 ASR**：Me/Others 叠在同一 PCM → 无法归因，口令与巡检互相污染。
2. **Electron 原生 WASAPI loopback addon**：ABI/重建成本高，与主进程绑定过深（见 ADR-003 同类结论）。
3. **仅靠腾讯会议「仅听」账号**：他人轨可通，但本机麦仍需独立捕获才能做 Me 标签。

## 决策

- **Others**：优先 `CABLE Output`（VB-Cable）；降级 `getDisplayMedia` 系统音频。
- **Me**：本机默认麦克风，独立上行。
- 主进程维护双 ASR session / 双转写缓冲；**禁止**混成单轨再送策略。
- Renderer：`capture.js` / `uplink.js` 按轨打标；IPC `pcm-chunk` 带 `track: me|others`。

## 后果

- 依赖用户装 VB-Cable 或授权屏幕音频；缺轨时 UI 提示，不静默退化成单轨策略。
- 文档：`VIRTUAL_AUDIO_BRIDGE.md`、`rules/desktop-audio-capture.md`。
