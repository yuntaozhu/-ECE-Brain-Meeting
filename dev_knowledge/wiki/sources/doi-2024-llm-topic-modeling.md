# Comprehensive Evaluation of Large Language Models for Topic Modeling（Doi、Isonuma、Yanaka，2024）

## 一句话
评的是 LLM 给文档打主题标签，不是短文本 LDA。

## 要点
- 作者是 Tomoki Doi、Masaru Isonuma、Hitomi Yanaka。
- 定量看主题质量、幻觉、在文档有限时走捷径、以及用提示控制主题类别。
- 摘要结论：LLM 能找出较连贯、较多样的主题，幻觉不多，但可能只抓住文档的一部分；可控性有限。

## 对本仓库
- **不采用**让 LLM 给当前一句转写现场起一个主题名，再拿这个名字去选卡。
- 短文本上不用 LDA 的依据见 [[blei-2003-lda]] 与 [[yan-2013-biterm-short-texts]]，不看这篇。

## 改变的概念
- [[short-text-lda]]

## 原文
- `raw/2406.00697-topic-modeling-short-texts-llm.pdf` · arXiv:2406.00697
