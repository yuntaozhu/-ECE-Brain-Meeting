# ADR-005：Wave C 会中参谋与轻量 MCP

## 背景

Phase 3：需要中途入会速览、人机速记、按需看见屏幕，并让 Cursor 能读到会中结论。

## 试过什么

1. **会中实时调 VLM OCR**：成本高、依赖账号，本阶段不做默认路径。
2. **完整 `@modelcontextprotocol/sdk` 服务**：依赖重；先用 stdio JSON-RPC 最小实现。
3. **把截屏/速览写进口播链**：违反旁路原则。

## 决策

- **Catch Me Up**（`recap.cjs`）：近 5 分钟转写启发式提取议题 / 分歧 / 待拍板；可选 Mermaid 草稿。
- **Quick Jot**（`jot.cjs`）：短记写入 `dev_knowledge/session_logs/jots_*.jsonl`，可扩写 Markdown。
- **屏幕上下文**（`screenContext.cjs` + `desktopCapturer`）：按需截屏落盘；OCR/VLM 预留字段。
- **MCP**（`scripts/meeting-context-mcp.cjs`）：stdio 工具读 bridge / jots / screen；桥接态写在 `meeting_bridge.json`。

## 后果

- 速览为规则启发式，嘈杂转写下可能漏检；可后续接豆包摘要。
- 截屏需系统权限；无 OCR 时仅路径注入。
- MCP 为最小兼容实现，若 Cursor 协议升级可能需补 initialize 握手字段。
