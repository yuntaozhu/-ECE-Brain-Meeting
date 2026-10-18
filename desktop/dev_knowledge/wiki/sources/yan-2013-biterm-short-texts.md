# A Biterm Topic Model for Short Texts（Yan、Guo、Lan、Cheng，2013）

## 一句话
短文本上 LDA / PLSA 失效，是因为它们靠文档内部的词共现，而短文档里这种共现太稀。

## 要点
- 对象是推文、即时消息这类短文本。
- BTM 不按单篇文档学主题，而把全库里的 biterm（短窗口里共现的无序词对）拿来学主题。
- 实验在 Twitter 和问答语料上，BTM 的主题比 LDA 更连贯。

## 对本仓库
- **不采用**在线 BTM。它仍是语料级主题模型，不是开口时的卡片假设。
- **正面落点**：共现要在整库上累计。这对应离线字二元组与文档频率，不对应单句 LDA。

## 改变的概念
- [[short-text-lda]]

## 原文
- `raw/yan-2013-biterm-short-texts.pdf` · WWW 2013
