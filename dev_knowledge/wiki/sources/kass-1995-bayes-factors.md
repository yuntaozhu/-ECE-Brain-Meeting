# Bayes Factors（Kass、Raftery，1995）

## 一句话
Bayes factor 是两个假设的证据比；用来给「选这张卡而不是无证据」一个刻度，不是逐词采样。

## 要点
- Bayes factor 是先验概率各半时，零假设的后验赔率。
- 文中把 Bayes factor 当作应用统计里比较模型的工具，并讨论用 Laplace、BIC、以及马尔可夫链蒙特卡洛来**计算**这个数。
- 本 PDF 是 JSTOR 扫描：封面有文字层，正文页是图像。刻度表未转写。

## 对本仓库
- **已有对应**：`bayesFactor` 取 3，写在 `engine-hyperparams.json`。这个 3 是超参，不把扫描件里没读出的表格数字写进 wiki。
- **不采用**：文中的 MCMC 积分方法不进口播解码。

## 改变的概念
- [[bayesian-card-selection]]

## 原文
- `raw/kass-1995-bayes-factors.pdf` · JASA 90(430):773–795，1995
- 核对用：`raw/md/kass-1995-bayes-factors.md`（MarkItDown 只抽出封面文字层；正文是扫描图像，**不要**把该 md 当全文）
