# N-Gram Similarity and Distance（Kondrak，2005）

## 一句话
字符串相似有两类常用量：共有 n 元组个数，以及他把编辑距离、最长公共子序列嵌进去的 n 元组距离 / 相似度。

## 要点
- 编辑距离是 n 元组距离的特例；最长公共子序列长度是 n 元组相似度的特例。
- 另有一族基于 n 元组的词相似度量，实验上优于对应的 unigram。
- 与「集合交并」式的共有 n 元组计数不是同一公式。

## 对本仓库
- **已有**：`alignScore` / contentBigrams 是共有字二元组重叠，属于共有计数那一类。
- **不采用**把对齐主路径改成编辑距离或 Kondrak 递归距离，除非影子对比和评测一起证明更好。

## 改变的概念
- [[char-bigram-alignment]]

## 原文
- `raw/kondrak-2005-ngram-similarity.pdf`
- 核对用：`raw/md/kondrak-2005-ngram-similarity.md`
