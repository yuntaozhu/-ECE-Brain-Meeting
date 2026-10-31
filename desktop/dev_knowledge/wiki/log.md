# 开发 Wiki 日志

## [2026-10-21] query | 换卡 carry 顶答

- 现象：收费答后「一年3万九太贵了…付不起」认太贵卡却念收费卡后半句（`reason=carry`）。
- 修：异卡近胜出 → `card-switch` 念新卡全文；`objectionComplete` 当新问；太贵卡补陈述标题。
- 冒烟：`card-switch-expensive`。概念：[[card-switch-carry]]。

## [2026-10-20] duplex | 夹名回灌假唤醒 + STOP 交接句 UI

- 播窗唤醒须 `looksLikeCleanWakeBarge`（「大智」起首）；「整合 a 区大智」当回灌，不 `wake-asr`。
- `looksLikeSpeakEcho`：句中夹名 + 二元组重叠。
- STOP 刚 barge 后清空 `interventionText/fullAnswer/displayText` 并 `suppressed`，避免界面仍「退回聆听（合成中）」。

## [2026-10-20] duplex | 回灌误唤醒 + 静音窗挡打断

- `looksLikeSpeakEcho` 去标点；短「我是大智。」一律当回灌；句尾打断口令不当纯回灌。
- 静音断句：注入成功才关真麦，窗约 380ms；定时 7s；见打断口令立即清窗。
- 语音验收：`dev_knowledge/wiki/concepts/barge-in-voice-cases.md`。冒烟补标点回灌/短唤醒。

## [2026-10-20] duplex | 静音断句替代重连（防 45000292）

- 去掉播报期关连重连；改为同连接 `injectSilenceBurst` + 真麦静音窗触发 end_window。
- `45000292` 并发配额：35s 冷却再连。STOP 交接句去重逻辑保留。

## [2026-10-20] duplex | ASR 断句砍粘连 + STOP 不连环念

- 开播/播完/打断：`forceSegmentBoundary` 软重连；播窗内约 1.6s 切假说，减轻回灌粘「谢谢大智」。
- partial「谢谢大」升格「谢谢大智」。刚 barge-in-stop 后 STOP 只切模式，不排队「退回聆听」。

## [2026-10-20] duplex | 打断跟本地播窗 + 句尾口令

- 短路窗用 `playbackUntil`（可比合成 hold 长），避免 IDLE 后才认出「谢谢大智」。
- 长回灌句扫尾 24 字；抽出「谢谢大智」再打断。问候回灌「我是大智」不唤醒。
- 开播 `resetHypothesis`。冒烟含粘连句。

## [2026-10-20] duplex | hold 开麦可打断/唤醒

- P0：COOLDOWN/回灌 hold 仍向 HostAsr 喂真麦（renderer uplink + main appendAudio），不再喂静音；回灌靠转写丢弃。
- 「谢谢大智 / 大智听我说」→ `barge-in-stop`；叫名「大智…」→ `wake-asr` 打断并立刻巡检。
- 冒烟：`node scripts/smoke-barge-stop.cjs`。

## [2026-10-20] duplex | 谢谢大智打断加强

- SPEAKING 时 ASR partial「谢谢大 / 停止大」经 `stopBargePartial` 即 `barge-in-stop`，不必等整句定稿。
- 归一：`谢了大智`→谢谢大智；热词加谢谢大/谢谢大致/停止大。排除「谢谢大家」。
- 冒烟：`node scripts/smoke-barge-stop.cjs`。

## [2026-10-20] query | 检索已 grounding 禁 silent + 中间态句池

- 一类现象：检索有 FAQ、正式/影子空卡、豆包超时 → silent。兜底：`knowledgeSpeakLine` 在 answerable 时念检索头卡口播。
- 太贵卡升格「有些贵 / 效益不好」；思考占位改为 schema early/mid 轮换并可短 TTS，正答取消后续占位。
- ability-probe 仍走 `shadowRecoverSkip`。冒烟补 `too-expensive-benefit`。

## [2026-10-20] query | 口语落地变体 + shadow kb-fallback

- 蒸馏：`paraphraseSubjects/Objects/Cues` 扩「我们机构如何落地这个课程」类问法进链；FAQ 标题升格同批变体。
- 会中：正式空卡时用 `shadowSpeak` / FAQ 秒命中 / 链步做 `kb-fallback`；豆包超时不再对本类 silent。
- `lastRealAsk`：短 how-do 不覆盖更长业务问。冒烟见 `org-rollout`。作答线未改。

## [2026-10-20] query | 怎么做≠定义 + 纠正追问扩实体

- 规则蒸馏：how-do 步用详版落地句，`sameAnswerAlignMax` 拒定义半句；直播 `repairHowDoHit`。
- 纠正句（的是怎么做 / 我问的是怎么做）巡检 + `correctPeel` 扩实体；扩写补问号；议程标题不作锚点。
- how-do 在资料卡后优先走链。冒烟 9、chain 7、bench 56 绿。

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
