# 开发 Wiki 索引

改引擎前先读本页，再打开点名的整页。会中知识库不读这里。

## 来源

- [[iwashima-2025-grounded-responses]] | 推理时对齐能贴住话题且不必微调 | type=source | aliases=grounded responses,2511.21762,URIAL,RAIN,ARGS
- [[yue-2025-llm-agent-qa]] | Agent QA 流水线与会场同构 | type=source | aliases=2503.19213,LLM agent QA survey
- [[lee-2024-perceived-empathy]] | 人评 LLM 回复更像共情，测的是感知不是事实 | type=source | aliases=2403.18148
- [[li-2023-rain]] | 自评估回退解码，不进单次口播 | type=source | aliases=2309.07124,RAIN
- [[khanov-2024-args]] | 奖励引导逐步搜索 | type=source | aliases=2402.01694,ARGS
- [[asai-2023-self-rag]] | 检索—生成—自批判 | type=source | aliases=2310.11511,Self-RAG
- [[gao-2022-hyde]] | 用假想文档做零样本稠密检索 | type=source | aliases=2212.10496,HyDE
- [[anantha-2020-cqa-rewrite]] | 对话式 QA 靠问句改写 | type=source | aliases=2010.04898
- [[elgohary-2019-canard]] | 把依赖上文的问句改成自足问句 | type=source | aliases=CANARD,D19-1605,question-in-context
- [[su-2019-utterance-rewriter]] | 中文多轮先恢复指代和省略 | type=source | aliases=1906.07004,Utterance ReWriter,P19-1003
- [[pan-2019-incomplete-utterance-restoration]] | 从上文挑少量词拼回原句 | type=source | aliases=Restoration-200K,D19-1191,Pick-and-Combine
- [[adlakha-2022-topiocqa]] | 对话问答要显式处理换题 | type=source | aliases=TopiOCQA,2110.00768
- [[kongyoung-2023-followup-rewrite]] | 先判是不是追问再改写 | type=source | aliases=2023.findings-emnlp.913
- [[guo-2024-cat-iur]] | 长对话用关键短语槽再改写 | type=source | aliases=CAT,2024.findings-acl.127,IUR
- [[mo-2024-chiq]] | 换题就截断更早历史再改写当前问 | type=source | aliases=CHIQ,2406.05013
- [[roy-2024-retrieve-rewrite-respond]] | 何时检索、改写、作答 | type=source | aliases=2409.15515,Roy
- [[faria-2025-qalign]] | 测试时用 MCMC 采样替代奖励搜索 | type=source | aliases=2504.03790,QALIGN
- [[loula-2023-smc-steering]] | 用 SMC 粒子引导 LLM 解码 | type=source | aliases=2306.03081,SMC,MCMC
- [[doi-2024-llm-topic-modeling]] | LLM 主题标签会抓住文档局部 | type=source | aliases=2406.00697,Doi
- [[kass-1995-bayes-factors]] | Bayes factor 是假设的证据比 | type=source | aliases=Kass,Raftery,JASA 1995
- [[blei-2003-lda]] | 文档是主题的混合 | type=source | aliases=LDA,JMLR 2003
- [[yan-2013-biterm-short-texts]] | 短文本要在全库 biterm 上累计共现 | type=source | aliases=BTM,WWW 2013
- [[lin-2023-urial]] | 系统提示加少至三条风格例句 | type=source | aliases=2312.01552,URIAL
- [[min-2023-factscore]] | 原子事实被知识源支撑的比例 | type=source | aliases=2305.14251,FActScore
- [[gao-2023-alce]] | 带引用的回答要核对引用是否撑住句子 | type=source | aliases=2305.14627,ALCE
- [[mccallum-1998-naive-bayes-event-models]] | 短文本上二元出现与多项计数两套事件模型 | type=source | aliases=McCallum,Nigam,Bernoulli,multinomial
- [[zhai-2001-lm-smoothing-ir]] | 文档语言模型必须平滑 | type=source | aliases=Zhai,Lafferty,Dirichlet
- [[kondrak-2005-ngram-similarity]] | 共有 n 元组与 n 元组距离不是同一公式 | type=source | aliases=Kondrak,bigram
- [[aliannejadi-2019-clarifying-questions]] | 一个好的澄清问题能大幅抬检索 | type=source | aliases=1907.06554,Qulac
- [[kamath-2020-selective-qa]] | 域外会过度自信，必须会拒答 | type=source | aliases=2006.09462,selective QA
- [[misu-2005-speech-ir-clarification]] | 语音残缺问句用信息增益确认 | type=source | aliases=H05-1126,Misu,Kawahara
- [[nogueira-2019-doc2query]] | 索引时预估这段能回答的问句 | type=source | aliases=Doc2Query,1904.08375
- [[dai-2022-dialog-inpainting]] | 原句当答复并补中间问句 | type=source | aliases=Dialog Inpainting,2205.09073
- [[dai-2022-promptagator]] | 合成问句须检索回源段 | type=source | aliases=Promptagator,2209.11755
- [[bonifacio-2022-inpars]] | 大模型从文档生成问句 | type=source | aliases=InPars,2202.05144
- [[rosset-2020-question-suggestion]] | 下一问要把话题向前带 | type=source | aliases=useful question suggestion
- [[choi-2018-quac]] | 连问且答复限于文中短段 | type=source | aliases=QuAC,1808.07036
- [[feng-2020-doc2dial]] | 按文档条件与做法排对话 | type=source | aliases=doc2dial
- [[xu-2023-evol-instruct]] | 逐步加深而不另起话题 | type=source | aliases=Evol-Instruct,2304.12244
- [[gao-2022-cir]] | 会话检索中的下一问建议 | type=source | aliases=2201.05176,CIR

## 概念

- [[static-prompt-grounding]] | 固定提示加少量例句做接地 | type=concept | aliases=URIAL,composeNumberRule
- [[decode-time-search]] | 逐步改 token 概率的对齐 | type=concept | aliases=RAIN,ARGS,Linear Alignment
- [[sample-vs-search-test-time]] | 测试时 MCMC 采样仍在 token 上 | type=concept | aliases=QALIGN,SMC
- [[bayesian-card-selection]] | 卡片后验与 Bayes factor 选答 | type=concept | aliases=posteriorMin,bayesFactor
- [[query-understanding]] | 槽位、焦点、改写与追问理解 | type=concept | aliases=focus,HyDE,rewrite
- [[retrieval-rerank-critique]] | 检索后核对与自批判 | type=concept | aliases=Self-RAG,slot-critic
- [[follow-up-interaction]] | 零交集短追问与未播事实 | type=concept | aliases=progress,unspokenProgress
- [[short-text-lda]] | 单轮口语不用 LDA / BTM / LLM 主题名 | type=concept | aliases=LDA,BTM
- [[perceived-empathy-tone]] | 共情只作口吻不进开口线 | type=concept | aliases=empathy
- [[llm-agent-qa-pipeline]] | 规划→理解→检索→作答→追问 | type=concept | aliases=agent QA
- [[atomic-support-eval]] | 口播分句必须被胜出卡支撑 | type=concept | aliases=FActScore,ALCE,引用质量
- [[short-text-event-model]] | 短转写用出现型特征 | type=concept | aliases=Bernoulli,multinomial
- [[markov-smoothing]] | 正式马尔可夫全 1，影子才估平滑 | type=concept | aliases=Dirichlet,Jelinek-Mercer
- [[char-bigram-alignment]] | 对齐是共有字二元组 | type=concept | aliases=alignScore,contentBigrams
- [[shadow-divergence-catalog]] | 影子分歧逐条读完再谈扶正 | type=concept | aliases=isDiverged,alignW,shadowMarkov
- [[clarifying-vs-menu]] | 澄清问候选差异，不用菜单套话 | type=concept | aliases=splitQuestion,localAsk
- [[selective-abstention]] | 无证据就拒答 | type=concept | aliases=no_evidence,abstain
- [[offline-question-prediction]] | 会前预估下一问并准备答复 | type=concept | aliases=预备链,蒸馏,chains
