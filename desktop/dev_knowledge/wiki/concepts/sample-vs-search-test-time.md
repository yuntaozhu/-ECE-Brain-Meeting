# 测试时采样 vs 搜索 / SMC

## 主张
QALIGN（Faria、Smith）用 MCMC 在 token 上采样，用来替代会过拟合奖励模型的测试时搜索。实验在数学题上，需要任务奖励模型。SMC Steering 也是在 token 轨迹上放粒子。本仓库的假设是整张 FAQ 卡。

## 取舍
**不采用** QALIGN、SMC 和逐词粒子解码。理由是假设单位、单次生成和超时，不是因为这篇论文反对 MCMC。卡片级贝叶斯选择 **已有**；马尔可夫正式表保持全 1；IDF 只在影子。

## 落点
- `engine-hyperparams.json` → `markov` 全 1、`posteriorMin` 0.42
- 影子后验在 `relevance.cjs` attachShadow，不参与开口

## 相关
- [[bayesian-card-selection]]
- [[decode-time-search]]
- [[loula-2023-smc-steering]]
- [[faria-2025-qalign]]

## 出处
- [[loula-2023-smc-steering]]
- [[faria-2025-qalign]]
