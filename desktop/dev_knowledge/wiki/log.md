# 开发 Wiki 日志

## [2026-10-20] query | 链跟随拒绝换题弱挂

- `matchChainStep`：步对齐 + 去尾巴核心对齐；种子换题或 formalWinner 换卡时跟新链。
- 评测补 `topic-switch`。作答线未改。

## [2026-10-20] query | 会中接入连续追问链

- `localAnswer` 在资料卡后、pendingMiss 前调用 `matchChainStep`。
- 评测：`npm run smoke:chain`。作答线未改。

## [2026-10-20] ingest | 离线预估下一问与蒸馏引擎

- 来源九篇：Doc2Query、Dialog Inpainting、Promptagator、InPars、Rosset、QuAC、doc2dial、Evol-Instruct、CIR。
- 概念 [[offline-question-prediction]]：会前 `npm run knowledge:distill` 生成 3～6 步链，写入 `knowledge/chains/`。作答线不改，不进 faq-meeting.txt。

## [2026-10-19] query | 连续对话只改写一次

- 持有上一张资料卡的实体时，关闭「追问： / 针对上一答」。豆包只补独立问句，超时回退实体加疑问尾。
- 「什么是…」自带话题、句中已有专名，不改写。家长留在谓语里。
- 已有资料卡而完整疑问仍澄清或复述时念 `pendingMiss`。近义确认不能被「往下看」提交。
- 开办卡标题增加如何落地 / 怎么落地 / 怎样落地。作答线未改。

## [2026-10-19] query | 实体槽空才改写，无证据可见，到期不吞当前句

- `expandEllipsis` 按实体槽是否为空决定是否把上一张答卡的实体接到疑问尾。专名已在句中则不改写。
- 已有答卡而仍无证据时念 `pendingMiss`。粘滞到期时当前完整问仍进入咨询。
- 招生帮助卡补「有什么好处 / 有什么价值」问法。冒烟 23、变体 32、benchmark 56 仍绿；影子仍是原来 4 条。

## [2026-10-19] ingest | 省略追问七篇原文入库

- PDF 在 `raw/`，MarkItDown 无 OCR 抽出 `raw/md/`：CANARD、Utterance ReWriter、Restoration-200K、TopiOCQA、follow-up 改写、CAT、CHIQ。
- 按抽出文本改 CANARD 划分为训练 31,538、开发 3,418、测试 5,571。概念页取舍不变，仍见 [[follow-up-interaction]] 未决。

## [2026-10-19] ingest | 省略追问：CANARD / 恢复 / 换题

- 来源：[[elgohary-2019-canard]]、[[su-2019-utterance-rewriter]]、[[pan-2019-incomplete-utterance-restoration]]、[[adlakha-2022-topiocqa]]、[[kongyoung-2023-followup-rewrite]]、[[guo-2024-cat-iur]]、[[mo-2024-chiq]]。
- 取舍写在 [[follow-up-interaction]] 未决：实体槽空才 Pick 上一卡焦点；无证据要可见拒答；粘滞到期不吞当前完整问。不训练生成式改写器，不降作答线。

## [2026-10-19] query | 省略主题追问：标题焦点接上本轮问法

- 完整新问相对上一张答卡标题主题更空时，检索前把标题焦点接上本轮疑问尾，再走既有后验。
- 不续播定义卡后半句；不降阈值。FAQ 落地卡补「如何开展」类问法别名。

## [2026-10-19] query | 停止退回聆听 + 待答催答 + 定卡短合成

- 「谢谢大智」打断后说退回聆听；ASR partial 也可打断。
- 确认/催答在剥离唤醒词前识别；完整问句未过线记 pendingAsk；控制话轮不续播。
- 聆听连续偏离才拉回一次。总结过滤在场确认。定卡后可选豆包短合成，超时回原句。

## [2026-10-19] query | 话轮类别：确认提交、元话语不当资料、完整句不复述

- 确认类话轮在咨询态立刻巡检；待确认的近义或拆题假设提交 FAQ 原句。纯确认对不上某一支时不猜。
- `hostReject` 盖住近义、拆题、往下看模板，续播不能回放这些句子。
- 句尾「如何 / 怎么 / 怎样」不再当悬空残句。完整句合成失败不走复述句。
- 回灌窗内的停止口令走打断，渲染端停掉已排队的播放。

## [2026-10-19] query | ability-probe 不升格

- 卡已召回。正式：后验 0.48、对齐 0.63、窄度 0.64；没有证据 0.52。`p > p0` 与过窄门（窄度 ≥ 0.55 且对齐 < 0.72）都不过。
- IDF 对齐 0.88、窄度仍 0.62，只因跨过 0.72 才开口。问句没有「阅读测评」。不作答线替换。

## [2026-10-19] query | 影子分歧目录 + 诊断字段 + shadowMarkov 占位

- 新概念 [[shadow-divergence-catalog]]：how-do、ability-probe、scene-how-do-short、report-appeal-short。结论：暂不扶正 IDF；短追问禁止靠高 IDF 拆题。
- `benchmarkRunner` 诊断加 `div=` / `shadow=` / `formal=`，汇总 `shadow ids`。
- `engine-hyperparams.json` 补 `shadowMarkov` 全 1；估计脚本仍不自动写入。

## [2026-10-18] query | 引擎落地：评测 reason/标题/分句 + 换卡后验 + 无证据空答

- 评测：`speakReason` / `titleIncludesAny` / `answerFromCard`（eval + benchmark）。
- 换卡：`mergeAlignedHostCards` 并进假设池；`unspokenProgress` 不再旁路换卡，只留锚卡 progress 与零交集继承。
- 无证据：`decideCore` / `offlineFollow` 空 speak，不拼 localAsk 菜单；冒烟 `ability-probe` 改为期望沉默。
- 第 4、5 项仍只打影子（`isDiverged` 可对照）。`follow-up-interaction` 未决改为影子升格。

## [2026-10-18] lint | 算法页补公式，流程页补 Mermaid

- 公式：`char-bigram-alignment`、`bayesian-card-selection`、`short-text-event-model`、`markov-smoothing`、`short-text-lda`、`atomic-support-eval`、`clarifying-vs-menu`（EIG）。引擎式子来自 `align.cjs` 与 `relevance.cjs`。
- 流程：流水线、追问三档、澄清、检索后核对、compose、拒答、解码、问句理解、采样、口吻。
- schema 概念页模板增加「公式」「流程」。Zhai 平滑式按 PDF 表意重写，不粘贴拆栏的 md。

## [2026-10-18] ingest | 似然/对齐/澄清/拒答六篇 + MarkItDown 全文抽取

- 新增 raw：`mccallum-1998-naive-bayes-event-models.pdf`、`zhai-2001-lm-smoothing-ir.pdf`、`kondrak-2005-ngram-similarity.pdf`、`1907.06554-clarifying-questions-qulac.pdf`、`2006.09462-selective-qa-domain-shift.pdf`、`h05-1126-speech-ir-clarification.pdf`。
- 概念：`short-text-event-model`、`markov-smoothing`、`char-bigram-alignment`、`clarifying-vs-menu`、`selective-abstention`。
- 已落地：无卡达标不拼菜单；换卡走后验。影子升格仍见 `follow-up-interaction` 未决。
- `raw/md/`：本机 `D:\Anaconda\envs\markitdown` 的 markitdown 无 OCR，24/24 PDF 已抽。`kass-1995` 的 md 只有封面，正文仍以 PDF 为准。

## [2026-10-18] ingest | 六篇原文献：Bayes factor、LDA、BTM、URIAL、FActScore、ALCE

- 新增 raw：`kass-1995-bayes-factors.pdf`（JSTOR 扫描，刻度表未转写）、`blei-2003-lda.pdf`、`yan-2013-biterm-short-texts.pdf`、`2312.01552-urial-in-context-alignment.pdf`、`2305.14251-factscore.pdf`、`2305.14627-alce-citations.pdf`。
- 概念：`bayesian-card-selection`、`short-text-lda`、`static-prompt-grounding` 改挂原文；新增 `atomic-support-eval`。
- 更正来源页作者：Roy 等（2409.15515）、Doi 等（2406.00697）、Faria 与 Smith 的 QALIGN（2504.03790，方法是 MCMC 采样）。
- 删掉未核对的时延倍数。换卡后验与无证据空答已落地；影子升格仍见 `follow-up-interaction` 未决。

## [2026-10-18] ingest | 首建：Firecrawl 检索 + 12 篇 raw + schema/index/概念

- 检索主题：推理时对齐、Agent QA、对话追问改写、Self-RAG、HyDE、短文本 LDA、测试时采样、SMC 引导解码、感知共情。
- 工具：Firecrawl Search（密钥仅用在本地请求，未入库）+ arXiv PDF 下载。
- 已有 PDF 移入 `raw/2511.21762-grounded-responses-rapid-review.pdf`。
- 取舍总览：固定提示接地与贝叶斯选卡为已有；逐步搜索 / SMC / 在线 HyDE / 单轮 LDA 为不采用；Self-RAG 只取批判思想；共情只作口吻。
