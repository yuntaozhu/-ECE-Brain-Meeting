# 卡片后验与 Bayes factor

## 主张
把「无证据 / 召回卡 / 脚本」放进同一假设空间，用后验和 Bayes factor 选一张卡。这是离散假设的证据比较。Kass 与 Raftery 把 Bayes factor 定义为先验各半时零假设的后验赔率；他们也讨论用 MCMC **计算**这个数，那不是解码算法。

## 取舍
**已有。** 阈值写在 `engine-hyperparams.json`：后验 ≥ 0.42、Bayes factor ≥ 3、对齐 ≥ 0.28、闭题对齐 ≥ 0.18。评测不掉点前不得放宽，也不得用影子 IDF 替换。

`raw/kass-1995-bayes-factors.pdf` 正文是扫描图像，刻度表没有转写。3 这个数只作为本仓库超参，不写成论文表格里的某一档。

## 公式
出处：`relevance.cjs` 的 `decideCore` 与 `engine-hyperparams.json`。对齐 \(a\) 先被夹到 \([10^{-4},1-10^{-4}]\)。对数 Beta 密度（`logBetaPdf`）：

\[
\log f(x;\alpha,\beta)=(\alpha-1)\log x+(\beta-1)\log(1-x)-\log B(\alpha,\beta)
\]

对数似然比是「像」减「不像」。参数是 `betaAlignYes=[3,2.2]`、`betaAlignNo=[1.2,5]`、`betaExtraYes=[2,3]`、`betaExtraNo=[2.5,2]`：

\[
\mathrm{llr}_{align}=\log f(a;3,2.2)-\log f(a;1.2,5)
\]
\[
\mathrm{llr}_{extra}=\log f(e;2,3)-\log f(e;2.5,2)
\]

未归一化对数后验。卡片假设没有额外乘数；脚本假设再加 \(\log 3\)（`scriptLogBoost`）：

\[
\log U_i=\log \pi_i+\mathrm{llr}_{align}+\mathrm{llr}_{extra}
\]
\[
\log U_{script}=\log \pi_{script}+\log 3
\]

马尔可夫正式表全为 1 时，无证据先验 \(\pi_0=0.62\)。脚本合格时脚本先验为 0.22，卡片总质量为 \(\max(0.05,\ 0.16)\)；不合格时卡片总质量为 \(\max(0.05,\ 0.38)\)。单卡再按检索分抬权：分高于 22 时权重为 \(\log(1+s-18)\)，否则为 0。后验是对 \(\exp(\log U)\) 减最大值后归一化。Bayes factor 是最优后验除以次优后验（次优后验 \(\le 10^{-6}\) 时记为无穷大）。作答还要求后验 ≥ 0.42、对齐 ≥ 0.28；闭题对齐线是 0.18，不是作答线。

Kass 与 Raftery 的定义（先验各半时，Bayes factor 等于后验赔率）用来解释这个比，不把他们的 MCMC 求积分代进上式。

## 落点
- `desktop/knowledge/schema/engine-hyperparams.json`
- `desktop/lib/meetingStrategy/agent/relevance.cjs`（decideCore）

## 相关
- [[sample-vs-search-test-time]]
- [[follow-up-interaction]]
- [[kass-1995-bayes-factors]]
- [[selective-abstention]]
- [[markov-smoothing]]

## 出处
- [[kass-1995-bayes-factors]]
- `.cursorrules` 第 2 节 C 与 `engine-hyperparams.json`
