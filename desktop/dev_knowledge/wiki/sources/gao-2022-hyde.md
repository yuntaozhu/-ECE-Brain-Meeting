# Precise Zero-Shot Dense Retrieval without Relevance Labels（Gao 等，2022）· HyDE

## 一句话
先让 LLM 写一篇假想答文，再对其 Embedding 做稠密检索。

## 要点
- 零样本、无标注相关对。
- 每问至少一次生成 + 一次向量检索。
- 本仓库在线路径要求零 Embedding（负锚点离线编译）；正式对齐是字二元组。

## 对本仓库
- **不采用在线 HyDE**。
- 问句理解可用离线别名 / FAQ 问法，不用假想文档向量。

## 改变的概念
- [[query-understanding]]

## 原文
- `raw/2212.10496-hyde-zero-shot-dense-retrieval.pdf` · arXiv:2212.10496
