# A Survey of Large Language Model Agents for Question Answering（Yue 等，2025）

## 一句话
把 Agent QA 拆成规划→问句理解→检索→作答→追问，与会场流水线同构。

## 要点
- 问句理解：槽位、改写、HyDE / Step-back 等扩展。
- 检索后可重排或批判；LLM 不宜当首检器。
- 追问与多轮交互单独成块。
- FireAct 式微调规划、多专家编排、重工具链属于另一类系统。

## 对本仓库
- **高价值必收**：用来对照现有 `meetingSession → 知识库 → decideSpeak → compose`。
- **不采用**：微调规划器、多 Agent 编排、PoT/HuggingGPT 式工具链。

## 改变的概念
- [[llm-agent-qa-pipeline]]
- [[query-understanding]]
- [[retrieval-rerank-critique]]
- [[follow-up-interaction]]

## 原文
- `raw/2503.19213-llm-agent-qa-survey.pdf` · arXiv:2503.19213
