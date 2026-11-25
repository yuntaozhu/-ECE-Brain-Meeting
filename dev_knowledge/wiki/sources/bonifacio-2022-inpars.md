# InPars: Data Augmentation for Information Retrieval using Large Language Models（Bonifacio 等，2022）

## 一句话
用大模型从文档生成合成问句，再过滤成检索训练数据。

## 要点
- few-shot 提示生成 (query, document) 对；InPars-v2 用 reranker 过滤。
- arXiv:2202.05144 / 2301.01820。

## 对本仓库
- **部分对齐**：豆包生成追问；不训练检索器，只扩连续追问库。

## 改变的概念
- [[offline-question-prediction]]

## 原文
- arXiv:2202.05144（PDF 尚未放入 `raw/`）
