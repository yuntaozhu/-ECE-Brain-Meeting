# Self-RAG: Learning to Retrieve, Generate, and Critique through Self-Reflection（Asai 等，2023）

## 一句话
模型学会何时检索、如何生成、如何用批判 token 挑更好的段落。

## 要点
- 检索—生成—批判闭环。
- 需要特殊训练与反思 token。
- 「先有证据再开口、证据不足则不答」与槽位门 / offlineFollow 同向。

## 对本仓库
- **取思想、不取训练**：运行时不做 Self-RAG 微调；批判对应槽位与原句对齐检查。
- LLM 不做首检；首检仍是 FAQ / corpus。

## 改变的概念
- [[retrieval-rerank-critique]]
- [[llm-agent-qa-pipeline]]

## 原文
- `raw/2310.11511-self-rag.pdf` · arXiv:2310.11511
