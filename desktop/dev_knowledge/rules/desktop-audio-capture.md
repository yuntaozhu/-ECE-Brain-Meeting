---
paths:
  - desktop/renderer/audio/**
  - desktop/main/listenSession.js
---

# 双通道采音守护

- Others / Me 分轨采集与上行；禁止混轨后送策略 ASR。
- 缺 Others 设备时提示用户，不要静默改成「只听麦」。
- 改采集逻辑时对照 `adr/001-dual-channel-audio.md`。
