# 问句理解

## 主张
Agent QA 综述把槽位、焦点、改写、HyDE 放在检索之前。会场转写短、常省略主语。

## 取舍
- **已有**：高信息焦点片段、疑问骨架 `peelMeta`、FAQ 标题问法别名。
- **不采用在线 HyDE**（每问 Embedding）。
- 结巴只在焦点抽空时退回，不进检索对齐主路径。

## 落点
- `universalOperators.cjs` → extractHighEntropyFocus
- `linguistic-operators.json` → interrogative / dropWords
- `relevance.cjs` → peelMeta、asksNewQuestion

## 相关
- [[follow-up-interaction]]
- [[gao-2022-hyde]]
- [[anantha-2020-cqa-rewrite]]
- [[yue-2025-llm-agent-qa]]

## 出处
- [[yue-2025-llm-agent-qa]]
- [[anantha-2020-cqa-rewrite]]
- [[gao-2022-hyde]]
