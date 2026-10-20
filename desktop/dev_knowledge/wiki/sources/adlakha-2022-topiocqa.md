# TopiOCQA: Open-domain Conversational Question Answering with Topic Switching（Adlakha 等，2022）

## 一句话
对话问答要分开「沿用上一题」和「切到相关新题」，切题后不能再靠旧段落作答。

## 要点
- 作者是 Vaibhav Adlakha、Shehzaad Dhuliawala、Kaheer Suleman、Harm de Vries、Siva Reddy。
- 信息寻求对话会在相关主题之间切换。此前多数对话 QA 数据没有 topic switch，而且假定阅读篇章已经给定。
- TopiOCQA：3,920 段对话，平均约 13 轮、约 4 个主题（维基文档）。问题来自真实信息寻求，答案是自由形式。
- 他们最好的基线（整段历史检索 + 阅读器）F1 55.8，比人低 14.2。说明切题后的检索仍然难。

## 对本仓库
- **部分对齐**：句中已有自己的专名时不把上一张卡焦点粘进去；实体槽只有指代或泛词时才补上一张卡的焦点。
- **不采用**开放域维基检索，也不放宽作答线去迁就切题。

## 改变的概念
- [[follow-up-interaction]]
- [[query-understanding]]

## 原文
- `raw/2110.00768-topiocqa.pdf` · arXiv:2110.00768
- 核对用：`raw/md/2110.00768-topiocqa.md`
