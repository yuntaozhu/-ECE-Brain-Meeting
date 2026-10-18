# 原子事实与引用核对

## 主张
FActScore 把长回答拆成原子事实，计算被指定知识源支撑的比例。只判整段对错会放过掺在里面的无支撑句子。ALCE 从流利、正确、引用质量三方面评带引用的回答。摘要写明：ELI5 上最好的模型仍有 50% 的时候缺少完整引用支撑。

## 取舍
**评测约定，尚未改断言。** 变体评测现在用 `answerIncludesAll`、`answerIncludesAny`、`answerForbids`。下一次改评测时，除了子串，还要能看出 `reason`、胜出卡片标题、以及念出的分句属于那张卡。子串碰巧命中不能单独算通过。

**不采用**把 FActScore 的检索加语言模型打分器，或 ALCE 的端到端生成，接进会场。开口线仍是后验、Bayes factor 和对齐。

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
