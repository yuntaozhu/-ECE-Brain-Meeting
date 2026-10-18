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
