# Document Expansion by Query Prediction（Nogueira、Yang、Lin、Cho，2019）

## 一句话
索引时预估这段资料能回答的问句，把问句挂回文档。

## 要点
- 方法名 Doc2Query：用序列到序列模型从文档生成可能被问的查询，再追加到文档后做 BM25。
- arXiv:1904.08375。后续 docT5query 用 T5 做同一件事。

## 对本仓库
- **采用**「离线预估问句」这一步。
- **不采用**训练他们的 Transformer；豆包或规则替代生成。

## 改变的概念
- [[offline-question-prediction]]

## 原文
- arXiv:1904.08375（PDF 尚未放入 `raw/`）
