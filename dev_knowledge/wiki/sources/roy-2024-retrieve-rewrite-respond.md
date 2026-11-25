# Learning When to Retrieve, What to Rewrite, and How to Respond in Conversational QA（Roy、Ribeiro、Blloshmi、Small，2024）

## 一句话
对话问答里，模型要先判断这次追问要不要重新检索，再决定改写和作答。

## 要点
- 作者是 Nirmal Roy、Leonardo F. R. Ribeiro、Rexhina Blloshmi、Kevin Small。不是 Wu。
- 相对单轮问答，多轮更难把握上下文，也更难管理已经检索到的段落。
- 方法让 LLM 在对话上下文里决定何时检索；需要检索时再改写对话、判断段落是否相关，然后作答。

## 对本仓库
- **部分对齐**：有的追问不重新开检索，对应未播分句和零交集继承。
- **不采用**：把「何时检索 / 如何改写 / 是否相关」交给另一个 LLM 决策头替换 `decideSpeak`。

## 改变的概念
- [[follow-up-interaction]]
- [[retrieval-rerank-critique]]

## 原文
- `raw/2409.15515-retrieve-rewrite-respond-cqa.pdf` · arXiv:2409.15515
