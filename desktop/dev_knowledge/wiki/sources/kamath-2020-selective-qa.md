# Selective Question Answering under Domain Shift（Kamath、Jia、Liang，2020）

## 一句话
域外问题上模型会过度自信；要在尽量多答的同时保持准确，必须会拒答。

## 要点
- 设定：源域训练，测试是源域与未知域外的混合。
- 只用 softmax 最大概率做拒答，在域外不够。
- 他们训练校准器预测「这次会不会错」；本文数字：在 80% 准确率下答到 56% 的题，而直接用模型概率只答到 48%。

## 对本仓库
- **已有**：后验不够、Bayes factor 不够、无证据 → 不开口或澄清，不编套话。
- **不采用**训练他们的随机森林校准器，也不放宽 0.42。

## 改变的概念
- [[selective-abstention]]
- [[bayesian-card-selection]]

## 原文
- `raw/2006.09462-selective-qa-domain-shift.pdf` · arXiv:2006.09462
- 核对用：`raw/md/2006.09462-selective-qa-domain-shift.md`
