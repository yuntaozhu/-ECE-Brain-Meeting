---
paths:
  - desktop/main/capsule*
  - desktop/renderer/**/*capsule*
---

# 悬浮胶囊

- 胶囊只做状态展示与轻交互，不承载策略决策。
- 不抢焦点、不挡会中主窗关键控件（见产品说明）。
- 策略改动仍走主进程 `decideSpeak` / copilot 旁路，不在胶囊 renderer 里写意图。
