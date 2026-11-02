# ADR-010 Wave J/K：三栏驾驶舱 + 作战信息密度

## 背景

后端 A–G 已提供双通道、建议卡、Catch Me Up、Wiki2 Evidence，但 `renderer/` 仍是调试台双列长滚，转写纯文本、速览只渲染 digest、建议卡同质化。

## 决策

1. **Wave J**：`index.html` 改为 Topbar + `#preflightDrawer` + 三栏 `.cockpit-main`；右栏 Tabs；保留全部既有 DOM id；`cockpit.js` 管抽屉/Tabs。
2. **Wave K**：转写气泡 + 贴底滚动 + 单句问AI/速记；建议卡三色语义 + 证据胶囊 + 键盘 1/2/3；Catch Me Up 结构化看板；Jot 使用 `S.meetingIdUi || "live"`。
3. `#winStealthProtect` 仅占位，原生 `setContentProtection` 留给 Wave L。

## 后果

- 听会成功自动收起会前抽屉，视口让给作战三栏。
- 胶囊窗未改（Wave L）。
- 验收：`npm run smoke:wave-jk`。
