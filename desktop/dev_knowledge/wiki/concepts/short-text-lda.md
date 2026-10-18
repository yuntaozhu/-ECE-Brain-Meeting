# 短文本与主题模型

## 主张
LDA 把一篇文档表示成主题的混合（Blei、Ng、Jordan）。Yan 等人写明：把 LDA 或 PLSA 直接用在推文、即时消息上效果差，因为文档内部的词共现太稀。BTM 改成在全库的 biterm 上学习。Doi 等人评的是另一件事：LLM 给文档打主题标签时，可能只抓住文档的一部分。

## 取舍
**不采用**在线 LDA、BTM，或让 LLM 给当前转写起主题名再选卡。

**已有的对应**：共现记在整库上。开口对齐用字二元组；文档频率在 FAQ 卡集合上离线算。

## 公式
出处：Blei、Ng、Jordan 的生成过程。每篇文档先抽主题混合 \(\theta\)，每个词位再抽主题 \(z\) 和词 \(w\)。\(k\) 是主题数。

\[
\theta\sim\mathrm{Dirichlet}(\alpha),\quad z\sim\mathrm{Multinomial}(\theta),\quad w\sim\mathrm{Multinomial}(\beta_z)
\]

Yan 等的 BTM 不给单篇短文档抽 \(\theta\)。biterm（短窗口里的无序词对）从全库的主题混合里生成。一句转写没有足够的文档内共现，所以不把上面两式放进 `decideSpeak`。

## 落点
- 对齐：`desktop/lib` 里的字二元组（`align.cjs` / contentBigrams）
- 卡集合上的文档频率：`relevance.cjs` 的 `hostCards` / `buildDf`
- 禁止在 `decideSpeak` 里加主题模型分支修坏例

## 相关
- [[bayesian-card-selection]]
- [[blei-2003-lda]]
- [[yan-2013-biterm-short-texts]]
- [[doi-2024-llm-topic-modeling]]

## 出处
- [[blei-2003-lda]]
- [[yan-2013-biterm-short-texts]]
- [[doi-2024-llm-topic-modeling]]
