# ADR-011 Wave L：胶囊双态 HUD + 原生防录屏

## 背景

会中常隐藏主控台，仅靠胶囊扫视；此前胶囊只能被动看卡，且窗口可被会议共享桌面捕获。

## 决策

1. `BrowserWindow.setContentProtection(true)` 默认开启（`STEALTH_PROTECT=0` 可关）；IPC `window:setStealthProtect` 同步主窗与胶囊；顶栏勾选接通。
2. `capsule:setCollapsed`：折叠 `420×56` Mini-Pill，展开 `440×420`；新 `smart-replies` 触发时自动展开。
3. 胶囊内独立：`Auto/Manual`、`⚡问AI`（本地转写缓存 + `strategyEvaluate`）、`📋速览`、Deep Dive、证据 pills。

## 后果

- 共享桌面时副驾驶窗对远端不可见（Windows WDA_EXCLUDEFROMCAPTURE）。
- 真流式 prefetch / LLM 精炼仍属 Wave H / I′。
