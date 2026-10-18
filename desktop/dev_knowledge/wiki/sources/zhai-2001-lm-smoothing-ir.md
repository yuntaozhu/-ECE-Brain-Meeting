# A Study of Smoothing Methods for Language Models Applied to Ad Hoc Information Retrieval（Zhai、Lafferty，2001）

## 一句话
按文档语言模型给查询打似然时，平滑决定没见过的词给多少概率；检索成绩对平滑参数很敏感。

## 要点
- 检索：为每篇文档估语言模型，再按查询似然排序。
- 平滑至少保证未见词不是 0。
- 比较 Dirichlet、Jelinek-Mercer 等；成绩随参数变化大。

## 对本仓库
- **已有**：正式马尔可夫表保持全 1，等于均匀平滑，评测不掉点前不扶正。
- **影子路径**：若从日志估 `shadowMarkov`，用本文命名的平滑族，并记下参数；不得直接替换开口线。

## 改变的概念
- [[markov-smoothing]]

## 原文
- `raw/zhai-2001-lm-smoothing-ir.pdf`
- 核对用：`raw/md/zhai-2001-lm-smoothing-ir.md`
