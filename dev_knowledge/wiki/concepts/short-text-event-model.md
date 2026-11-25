# 短文本事件模型

## 主张
McCallum 与 Nigam 比较两种朴素贝叶斯：多元伯努利看词是否出现，多项看词计数。小词表上伯努利够用；大词表上多项通常更好（文中平均再降 27% 错误）。

## 取舍
**已有。** 一句转写内容字少。对齐与似然侧重点是字二元组是否共有，不是把 FAQ 正文当长文档做多项计数。

## 公式
出处：McCallum 与 Nigam 对两种事件模型的定义。\(x_t\in\{0,1\}\) 表示词是否出现，\(c(w,d)\) 表示次数。分类时多项模型的多项式系数与类别无关，比较时可以只留乘积。

\[
P_{Bern}(d\mid c)=\prod_t p(w_t\mid c)^{x_t}\,(1-p(w_t\mid c))^{1-x_t}
\]
\[
P_{Mult}(d\mid c)\propto\prod_w p(w\mid c)^{c(w,d)}
\]

本仓库的 `align` 更接近伯努利：问的是二元组在不在标题里。不把 FAQ 正文的次数代进第二式。

## 落点
- `align.cjs` / contentBigrams
- `relevance.cjs` 后验里的对齐特征

## 相关
- [[char-bigram-alignment]]
- [[short-text-lda]]
- [[mccallum-1998-naive-bayes-event-models]]

## 出处
- [[mccallum-1998-naive-bayes-event-models]]
