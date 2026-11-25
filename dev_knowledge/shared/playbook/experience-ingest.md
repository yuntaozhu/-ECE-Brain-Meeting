# Playbook：开发经验入库（知识飞轮）

## 何时

每完成一个 Feature、Bugfix 或架构取舍之后。

## 写什么

1. **必写**：`session_logs/dev_sessions.jsonl` 一行 JSON：

```json
{
  "session_id": "YYYYMMDD-short",
  "project": "desktop|xiaoxing|<name>",
  "task_category": "feature|bugfix|refactor|migration",
  "user_query": "一句话任务",
  "thought_process": "试过什么 / 为何失败",
  "final_result": "最终方案",
  "reusable_pattern": true,
  "files_touched": []
}
```

2. **项目独有** → `projects/<name>/adr/`（试过什么 → 失败 → 最终）。  
3. **跨项目通用** → 脱敏后 `shared/adr/` 或 `shared/patterns/`，并更新根 `INDEX.md`。  
4. 更新 `_template/`（若影响新项目基线）。

## 禁止

业务 FAQ、用户会议录音、未脱敏的产品承诺数字写入 `dev_knowledge`。
