# ADR-006：Wave D Mermaid 扫视渲染 / 可选 OCR / Deep Dive

## 背景

Wave C 留下 Mermaid 仅源码、OCR/VLM 未接、建议卡缺 Tier-2 口述支撑。

## 试过什么

1. **捆绑完整 mermaid.js**：体积大，Electron 离线包变重。
2. **默认开启 WinRT OCR**：无语言包环境会拖慢截屏并刷错。
3. **Deep Dive 直接调 LLM**：与「豆包账号未齐 / 旁路可控」冲突。

## 决策

- Mermaid：解析本仓库 `flowchart` 模板为简易节点条，源码可复制；不捆绑 mermaid 运行时。
- OCR：`SCREEN_OCR=1|auto` 时对截屏跑可选 PowerShell WinRT OCR；默认关。
- Deep Dive：模板拼装 thesis / bullets / speak_script，挂在 `smart-replies` 旁路。
- Cursor：仓库 `.cursor/mcp.json` 指向 `meeting-context-mcp.cjs`。

## 后果

- 复杂 Mermaid（subgraph/class）只显示源码。
- OCR 依赖系统语言包；失败静默。
- Deep Dive 非模型生成，口径质量取决于 FAQ/prefetch。
