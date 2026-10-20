# Can You Unpack That? Learning to Rewrite Questions-in-Context（Elgohary、Peskov、Boyd-Graber，2019）

## 一句话
依赖上文的问句要改写成自足问句，再交给单轮问答。

## 要点
- 任务名 question-in-context rewriting：给定对话历史，把依赖上下文的问句改成不看历史也能答的问句，答案不变。
- 覆盖指代和省略。例：「What was he like in that episode?」离开上文无法理解。
- 数据集 CANARD：基于 QuAC，40,527 条。划分：训练 31,538、开发 3,418、测试 5,571。
- 他们训练 Seq2Seq 把上下文写进独立问句。本仓库不训练该模型。

## 对本仓库
- **部分对齐**：`rewrite.cjs` 在检索前产出独立问句，再交给 `decideSpeak`。
- **不采用**他们的 Seq2Seq 改写器，也不把改写后的句子直接当口播。

## 改变的概念
- [[query-understanding]]
- [[follow-up-interaction]]

## 原文
- `raw/elgohary-2019-canard-question-rewriting.pdf` · ACL D19-1605
- 核对用：`raw/md/elgohary-2019-canard-question-rewriting.md`
