# 开发 Wiki 日志

## [2026-10-18] ingest | 六篇原文献：Bayes factor、LDA、BTM、URIAL、FActScore、ALCE

- 新增 raw：`kass-1995-bayes-factors.pdf`（JSTOR 扫描，刻度表未转写）、`blei-2003-lda.pdf`、`yan-2013-biterm-short-texts.pdf`、`2312.01552-urial-in-context-alignment.pdf`、`2305.14251-factscore.pdf`、`2305.14627-alce-citations.pdf`。
- 概念：`bayesian-card-selection`、`short-text-lda`、`static-prompt-grounding` 改挂原文；新增 `atomic-support-eval`。
- 更正来源页作者：Roy 等（2409.15515）、Doi 等（2406.00697）、Faria 与 Smith 的 QALIGN（2504.03790，方法是 MCMC 采样）。
- 删掉未核对的时延倍数。换卡收回后验比较仍写在 `follow-up-interaction` 的「未决」，不是现行行为。

## [2026-10-18] ingest | 首建：Firecrawl 检索 + 12 篇 raw + schema/index/概念

- 检索主题：推理时对齐、Agent QA、对话追问改写、Self-RAG、HyDE、短文本 LDA、测试时采样、SMC 引导解码、感知共情。
- 工具：Firecrawl Search（密钥仅用在本地请求，未入库）+ arXiv PDF 下载。
- 已有 PDF 移入 `raw/2511.21762-grounded-responses-rapid-review.pdf`。
- 取舍总览：固定提示接地与贝叶斯选卡为已有；逐步搜索 / SMC / 在线 HyDE / 单轮 LDA 为不采用；Self-RAG 只取批判思想；共情只作口吻。
