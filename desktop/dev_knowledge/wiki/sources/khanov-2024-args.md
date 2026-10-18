# ARGS: Alignment as Reward-Guided Search（Khanov 等，2024）

## 一句话
用奖励模型在解码时逐步搜下一 token，免微调，计算更重。

## 要点
- 对齐做成搜索问题。
- 开销以该文实验表为准，本页不转写未核对的倍数。
- 与本仓库单次生成、只重组检索原句冲突。

## 对本仓库
- **不采用**。

## 改变的概念
- [[decode-time-search]]

## 原文
- `raw/2402.01694-args-reward-guided-search.pdf` · arXiv:2402.01694
