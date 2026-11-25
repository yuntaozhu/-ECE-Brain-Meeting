# Cursor 聊天 → Obsidian 一键导入

本机 Obsidian：`G:\Program Files\Obsidian\Obsidian.exe`  
默认库：`%USERPROFILE%\OneDrive\Documents\Obsidian Vault`

## 一键

在仓库根目录：

```bash
npm run chat:obsidian
```

或在 `xiaoxing/`：

```bash
npm run chat:obsidian
```

效果：

1. 读取本仓库最新 Cursor agent 会话（jsonl）  
2. 写成 Markdown → `Obsidian Vault/Cursor Chats/ECE-Brain-Meeting/日期-会话id.md`  
3. 唤起 Obsidian 打开该笔记  

## 选项

```bash
npm run chat:obsidian              # 默认最近 80 轮（用户+助手文本）
npm run chat:obsidian:full         # 全量（工具调用折叠为一行）
node scripts/export-chat-obsidian.cjs --recent=40
node scripts/export-chat-obsidian.cjs --no-open
```

## 环境变量

| 变量 | 含义 |
|------|------|
| `OBSIDIAN_VAULT` | 库路径（默认 OneDrive Documents\Obsidian Vault） |
| `OBSIDIAN_EXE` | 可执行文件（默认 `G:\Program Files\Obsidian\Obsidian.exe`） |
