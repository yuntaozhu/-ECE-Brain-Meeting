# Open-Domain Question Answering Goes Conversational via Question Rewriting（Anantha 等，2020）

## 一句话
对话式开放域 QA 的关键是把省略主语的追问改写成独立问句。

## 要点
- 追问常缺主语、指代上一轮。
- 改写后的问句再检索，比直接用残缺追问稳。
- 与本仓库「零交集短追问 + unspokenProgress / peelMeta」问题同族。

## 对本仓库
- **已有对齐**：FAQ 问法别名 + progress 旁路；不另起在线 LLM 改写器作为必经路径。
- 豆包只重组检索原句，不独自发明改写后的事实。

## 改变的概念
- [[query-understanding]]
- [[follow-up-interaction]]

## 原文
- `raw/2010.04898-conversational-qa-question-rewriting.pdf` · arXiv:2010.04898
