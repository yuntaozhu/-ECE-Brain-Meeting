---
paths:
  - desktop/lib/copilot/**
  - desktop/renderer/ui/meetingAid.js
  - desktop/scripts/meeting-context-mcp.cjs
---

# 会中参谋旁路

- Catch Me Up / Quick Jot / 截屏 / MCP **不得**写入 `decideSpeak` 或口播责任链。
- 速记与 bridge 落在 `dev_knowledge/session_logs/`，业务口径仍进 `knowledge/faq-meeting.txt`。
- 截屏仅按需；默认不跑 OCR/VLM。
- MCP 用 `npm run mcp:meeting`；改工具面时同步 ADR-005。
