# Improving Multi-turn Dialogue Modelling with Utterance ReWriter（Su 等，2019）

## 一句话
中文多轮里，指代和省略先改写成完整话语，下游再处理。

## 要点
- 作者是 Hui Su、Xiaoyu Shen、Rongzhi Zhang、Fei Sun、Pengwei Hu、Cheng Niu、Jie Zhou。
- 日常对话经常省略信息、使用指代，单轮模型看不懂真实意图。
- 做法：每句先恢复指代和省略，再做后续建模。
- 架构是带指针网络的 Transformer 改写器，配人工标注语料。改写器可接到不同领域的在线对话，而不是替换下游决策。

## 对本仓库
- **部分对齐**：改写是检索前的预处理，开口仍由后验决定。
- **不采用**训练他们的指针网络，也不让改写器决定开口。

## 改变的概念
- [[query-understanding]]
- [[follow-up-interaction]]

## 原文
- `raw/1906.07004-utterance-rewriter.pdf` · arXiv:1906.07004 · ACL P19-1003
- 核对用：`raw/md/1906.07004-utterance-rewriter.md`
