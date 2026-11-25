# Sequential Monte Carlo Steering of Large Language Models using Probabilistic Programs（Loula 等，2023）

## 一句话
用 SMC 粒子在解码空间里引导 LLM；这是「会场 MCMC」常被指向的那一类方法。

## 要点
- 把约束写成概率程序，粒子加权重采样。
- 计算量随粒子数上升，面向受约束生成，不是 FAQ 卡片假设池。
- 本仓库的「假设」是整张卡片 / 脚本 / 无证据，不是逐 token 轨迹。

## 对本仓库
- **不采用** SMC / 逐词 MCMC 进口播路径。
- 正式马尔可夫表保持全 1；影子 IDF 不扶正前不得替换作答线。

## 改变的概念
- [[sample-vs-search-test-time]]
- [[bayesian-card-selection]]

## 原文
- `raw/2306.03081-smc-steering-llms.pdf` · arXiv:2306.03081
