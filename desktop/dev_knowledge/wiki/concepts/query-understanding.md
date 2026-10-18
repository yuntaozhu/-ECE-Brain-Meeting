# 问句理解

## 主张
Agent QA 综述把槽位、焦点、改写、HyDE 放在检索之前。会场转写短、常省略主语。

## 取舍
- **已有**：高信息焦点片段、疑问骨架 `peelMeta`、FAQ 标题问法别名。
- **不采用在线 HyDE**（每问 Embedding）。
- 结巴只在焦点抽空时退回，不进检索对齐主路径。

## 流程

```mermaid
flowchart TD
  T[转写] --> F[高信息焦点]
  F -->|抽空| J[结巴退回]
  F --> P[peelMeta 去掉疑问骨架]
  J --> P
  P --> A[字二元组对齐]
  H[在线 HyDE] -.->|不进入| A
```

## 落点
- `universalOperators.cjs` → extractHighEntropyFocus
- `linguistic-operators.json` → interrogative / dropWords
- `relevance.cjs` → peelMeta、asksNewQuestion

## 相关
- [[follow-up-interaction]]
- [[gao-2022-hyde]]
- [[anantha-2020-cqa-rewrite]]
- [[misu-2005-speech-ir-clarification]]
- [[clarifying-vs-menu]]
- [[yue-2025-llm-agent-qa]]

## 出处
- [[yue-2025-llm-agent-qa]]
- [[anantha-2020-cqa-rewrite]]
- [[gao-2022-hyde]]
- [[misu-2005-speech-ir-clarification]]
