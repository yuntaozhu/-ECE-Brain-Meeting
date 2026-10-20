# 字二元组对齐

## 主张
Kondrak 区分：共有 n 元组个数，以及把编辑距离、最长公共子序列嵌进去的 n 元组距离 / 相似度。现行 `alignScore` 属于共有字二元组重叠，不是编辑距离。

## 取舍
**已有。** 主路径对齐用字二元组。IDF / 极性只在影子。  
**不采用**把主路径换成编辑距离或 Kondrak 递归距离。分歧目录见 [[shadow-divergence-catalog]]。

## 公式
出处：`desktop/lib/knowledge/align.cjs`。先去掉非汉字、非字母数字，再取相邻两字。问句侧按出现次数计，标题侧是集合。虚词二元组在 `STOP` 里直接丢掉。其余二元组若在标题集合里的文档频率占比 ≥ 0.35 也丢掉；问句侧因此被滤空时，退回只去虚词。

\[
\mathrm{align}(q,t)=\frac{|\{g\in use(q): g\in grams(t)\}|}{|use(q)|}
\]

窄度是标题里有、问句里没有的区分性二元组占比：

\[
\mathrm{extra}(q,t)=\frac{|grams_{\neq}(t)\setminus grams_{\neq}(q)|}{|grams_{\neq}(t)|}
\]

一条标题里有多条问法时，取得分最高的那条。0.35 写在 `bestTitleView` 里，不在超参 JSON：

\[
\mathrm{key}=\mathrm{align}-0.35\cdot\mathrm{extra}
\]

## 落点
- `desktop/lib/knowledge/align.cjs`
- `relevance.cjs` 的 align / closedAlignMin

## 相关
- [[short-text-event-model]]
- [[bayesian-card-selection]]
- [[kondrak-2005-ngram-similarity]]

## 出处
- [[kondrak-2005-ngram-similarity]]
- `.cursorrules` 第 2 节 C
