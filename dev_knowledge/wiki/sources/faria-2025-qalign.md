# Sample, Don't Search（Faria、Smith，2025）· QALIGN

## 一句话
这篇用马尔可夫链蒙特卡洛做测试时采样，用来替代会过拟合奖励模型的搜索。

## 要点
- 作者是 Gonçalo Faria、Noah A. Smith。
- 用奖励模型做测试时搜索时，算力加大后质量会掉，因为奖励只是代理。
- QALIGN 随测试时计算增加，收敛到对该提示的对齐分布上采样。方法采用文本生成上的 MCMC，不改基座，也可以不用 logits。
- 实验在 GSM8K 与 GSM-Symbolic 上，使用任务专用奖励模型。

## 对本仓库
- **不采用**。原因是假设单位是整张 FAQ 卡、口播只有单次生成、不引入奖励模型和粒子采样。
- 这篇并不支持「不要用 MCMC」。它支持的是：若做测试时对齐，用采样而不是奖励搜索。

## 改变的概念
- [[sample-vs-search-test-time]]

## 原文
- `raw/2504.03790-sample-dont-search-test-time-alignment.pdf` · arXiv:2504.03790
