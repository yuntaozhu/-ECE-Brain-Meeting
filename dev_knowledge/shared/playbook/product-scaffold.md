# Playbook：同级新项目脚手架

1. 在仓库根创建 `<name>/`（与 `desktop/`、`xiaoxing/` 同级）。  
2. 自带 `package.json`、`.cursorrules`、`knowledge/`、`lib/`、`scripts/`、冒烟。  
3. 在 `dev_knowledge/projects/<name>/` 建 `INDEX.md` + `adr/001-scope.md`。  
4. 需要 AI 会议 → 按 `meeting-assistant.md` 独立落地。  
5. 加 `.cursor/rules/<name>-architecture.mdc`（`globs: <name>/**`）。  
6. 根 `package.json` 增加启动脚本编排。  
7. **禁止**嵌进已有产品目录；**禁止**跨产品 require。

可从 `projects/_template/` 拷贝清单。
