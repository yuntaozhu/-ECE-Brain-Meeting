# 卡片后验与 Bayes factor

## 主张
把「无证据 / 召回卡 / 脚本」放进同一假设空间，用后验和 Bayes factor 选一张卡。这是离散假设的证据比较。Kass 与 Raftery 把 Bayes factor 定义为先验各半时零假设的后验赔率；他们也讨论用 MCMC **计算**这个数，那不是解码算法。

## 取舍
**已有。** 阈值写在 `engine-hyperparams.json`：后验 ≥ 0.42、Bayes factor ≥ 3、对齐 ≥ 0.28、闭题对齐 ≥ 0.18。评测不掉点前不得放宽，也不得用影子 IDF 替换。

`raw/kass-1995-bayes-factors.pdf` 正文是扫描图像，刻度表没有转写。3 这个数只作为本仓库超参，不写成论文表格里的某一档。

## 落点
- `desktop/knowledge/schema/engine-hyperparams.json`
- `desktop/lib/meetingStrategy/agent/relevance.cjs`（decideCore）

## 相关
- [[sample-vs-search-test-time]]
- [[follow-up-interaction]]
- [[kass-1995-bayes-factors]]

## 出处
- [[kass-1995-bayes-factors]]
- `.cursorrules` 第 2 节 C 与 `engine-hyperparams.json`
