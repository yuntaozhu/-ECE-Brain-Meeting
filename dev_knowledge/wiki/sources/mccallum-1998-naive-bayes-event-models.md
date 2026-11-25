# A Comparison of Event Models for Naive Bayes Text Classification（McCallum、Nigam，1998）

## 一句话
朴素贝叶斯有两种事件模型：多元伯努利（词是否出现）和多项（词计数）；小词表上前者够用，大词表上后者通常更好。

## 要点
- 多元伯努利：词是二元特征，有或没有。
- 多项：词是计数，等价于 unigram 语言模型。
- 五个语料上，大词表时多项平均再降 27% 错误。
- 一句转写内容字很少，更接近小词表、短文档设定。

## 对本仓库
- **已有对应**：字二元组对齐看的是共有片段是否出现，不是整句词频计数。
- **不采用**把似然改成 FAQ 正文词计数的多项模型，除非评测证明短转写上更好。

## 改变的概念
- [[short-text-event-model]]

## 原文
- `raw/mccallum-1998-naive-bayes-event-models.pdf`
- 核对用：`raw/md/mccallum-1998-naive-bayes-event-models.md`
