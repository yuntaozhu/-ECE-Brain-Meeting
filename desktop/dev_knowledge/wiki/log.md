# 开发 Wiki 日志

## [2026-10-18] lint | 算法页补公式，流程页补 Mermaid

- 公式：`char-bigram-alignment`、`bayesian-card-selection`、`short-text-event-model`、`markov-smoothing`、`short-text-lda`、`atomic-support-eval`、`clarifying-vs-menu`（EIG）。引擎式子来自 `align.cjs` 与 `relevance.cjs`。
- 流程：流水线、追问三档、澄清、检索后核对、compose、拒答、解码、问句理解、采样、口吻。
- schema 概念页模板增加「公式」「流程」。Zhai 平滑式按 PDF 表意重写，不粘贴拆栏的 md。

## [2026-10-18] ingest | 似然/对齐/澄清/拒答六篇 + MarkItDown 全文抽取

- 新增 raw：`mccallum-1998-naive-bayes-event-models.pdf`、`zhai-2001-lm-smoothing-ir.pdf`、`kondrak-2005-ngram-similarity.pdf`、`1907.06554-clarifying-questions-qulac.pdf`、`2006.09462-selective-qa-domain-shift.pdf`、`h05-1126-speech-ir-clarification.pdf`。
- 概念：`short-text-event-model`、`markov-smoothing`、`char-bigram-alignment`、`clarifying-vs-menu`、`selective-abstention`。
- 未决：无卡达标时不用菜单句；换卡收回后验比较仍见 `follow-up-interaction`。
- `raw/md/`：本机 `D:\Anaconda\envs\markitdown` 的 markitdown 无 OCR，24/24 PDF 已抽。`kass-1995` 的 md 只有封面，正文仍以 PDF 为准。

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
