# Multi-Task Learning of Query Generation and Classification for Generative Conversational Question Rewriting（Kongyoung、Macdonald、Ounis，2023）

## 一句话
改写追问之前，先判断这句是不是在延续上一题。

## 要点
- 作者是 Sarawoot Kongyoung、Craig Macdonald、Iadh Ounis。
- 对话检索里，问句含糊要靠历史消歧。此前工作把「是否同一话题」和「改写成查询」分开做。
- 他们用 BART / T5 同时做：识别 follow-up，以及生成改写。在 LIF 三个测试集上，相对单任务 F1 / Micro-F1 提高约 3.5 到 10.5 个百分点，并提高 OR-QuAC 上的段落检索。

## 对本仓库
- **部分对齐**：延续与换题要先分开，再决定是否把上一张卡焦点接上本轮疑问尾。
- **不采用** BART / T5 多任务模型，也不用生成模型替换 `decideSpeak`。

## 改变的概念
- [[follow-up-interaction]]
- [[query-understanding]]

## 原文
- `raw/kongyoung-2023-followup-query-rewrite.pdf` · EMNLP Findings 2023
- 核对用：`raw/md/kongyoung-2023-followup-query-rewrite.md`
