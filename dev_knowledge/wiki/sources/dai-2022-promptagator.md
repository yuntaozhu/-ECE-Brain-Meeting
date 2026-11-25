# Promptagator: Few-shot Dense Retrieval From 8 Examples（Dai 等，2022）

## 一句话
合成问句必须能检索回产生它的源段落，否则丢掉。

## 要点
- 少样本提示大模型为文档生成问句，再做 round-trip consistency 过滤。
- arXiv:2209.11755。

## 对本仓库
- **采用**往返过滤；过滤器换成现有 `alignScore`，不训练双编码器。
- 找不回的问句写入 `tune-samples.jsonl`。

## 改变的概念
- [[offline-question-prediction]]

## 原文
- arXiv:2209.11755（PDF 尚未放入 `raw/`）
