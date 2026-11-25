# 小星 Wiki Schema

对齐 `desktop/knowledge/wiki/schema.md`：会中/线上只做 Query；Ingest / Lint 会后或班后执行。

## 概念页模板

```markdown
# 标题

## 口播
可直接回复的短句（建议 ≤120 字）

## 事实
可核对规则；必须能回溯 raw / 公开出处

## 边界
禁止承诺、易混概念

## 相关
- [[other-slug]]

## 出处
- …

## 常见问法
- …
```

## 硬规则

1. 数字只能来自事实段或已标注出处的 raw
2. FAQ 的 A 应从词条「口播」派生
3. raw 只追加不改写
4. 冲突入 inbox，人工审定后再改事实
