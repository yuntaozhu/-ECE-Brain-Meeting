# 原子事实与引用核对

## 主张
FActScore 把长回答拆成原子事实，计算被指定知识源支撑的比例。只判整段对错会放过掺在里面的无支撑句子。ALCE 从流利、正确、引用质量三方面评带引用的回答。摘要写明：ELI5 上最好的模型仍有 50% 的时候缺少完整引用支撑。

## 取舍
**已有。** 变体评测在子串之外可选：`speakReason`、`titleIncludesAny`、`answerFromCard`（念出的分句须落在胜出卡原文）。结果字段 `speakReason` / `speakTitle` 由 `playAnswer` 与 MeetingAgent 回传。

**不采用**把 FActScore 的检索加语言模型打分器，或 ALCE 的端到端生成，接进会场。开口线仍是后验、Bayes factor 和对齐。

## 公式
出处：Min 等对 FActScore 的定义。把口播拆成原子事实后：

\[
\mathrm{FActScore}=\frac{|\{\text{被指定知识源支撑的原子事实}\}|}{|\{\text{全部原子事实}\}|}
\]

会场评测还不计算这个分数。落地时知识源是胜出卡片的原句，不是开放网页。ALCE 评的是流利、正确、引用质量三维，这里不另写未从 PDF 逐式核对的引用召回公式。

## 落点
- `desktop/knowledge/eval-agent-variants.json`
- `desktop/scripts/eval-agent-variants.cjs`
- 口播侧已有约束见 [[static-prompt-grounding]]

## 相关
- [[min-2023-factscore]]
- [[gao-2023-alce]]
- [[retrieval-rerank-critique]]
- [[bayesian-card-selection]]

## 出处
- [[min-2023-factscore]]
- [[gao-2023-alce]]
