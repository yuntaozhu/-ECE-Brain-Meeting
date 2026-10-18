# 马尔可夫表与平滑

## 主张
Zhai 与 Lafferty：文档语言模型必须平滑，否则未见词是 0；检索成绩对平滑参数敏感。常见族包括 Dirichlet 与 Jelinek-Mercer。

## 取舍
**正式路径已有：全 1。** 评测不掉点前不扶正。  
**影子路径**：从日志估转移时，用上述命名平滑，参数写入配置或估计脚本说明；只打日志，不参与开口。

## 公式
出处：Zhai 与 Lafferty 的方法表。MarkItDown 把该表的分栏拆开了，下面按 PDF 表意重写，不粘贴 `raw/md/` 里的断行。\(p_{ml}\) 是文档内最大似然，\(p(\cdot\mid C)\) 是全集背景，\(|d|=\sum_w c(w;d)\)。

\[
p_{JM}(w\mid d)=(1-\lambda)\,p_{ml}(w\mid d)+\lambda\,p(w\mid C)
\]
\[
p_{Dir}(w\mid d)=\frac{c(w;d)+\mu\,p(w\mid C)}{|d|+\mu}
\]

正式马尔可夫表没有 \(\lambda\) 或 \(\mu\)：`absent`、`script`、`doc` 三格都是 1，只作先验缩放。影子估计若启用，必须声明用的是哪一式和参数，仍不替换开口。

## 落点
- `engine-hyperparams.json` → `markov`
- `desktop/tools/estimateMarkovFromLogs.cjs`
- `relevance.cjs` attachShadow

## 相关
- [[bayesian-card-selection]]
- [[zhai-2001-lm-smoothing-ir]]

## 出处
- [[zhai-2001-lm-smoothing-ir]]
- `.cursorrules`（正式表全 1）
