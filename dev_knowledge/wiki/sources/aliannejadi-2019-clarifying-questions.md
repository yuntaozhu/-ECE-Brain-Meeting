# Asking Clarifying Questions in Open-Domain Information-Seeking Conversations（Aliannejadi 等，2019）

## 一句话
开放域信息寻求对话里，系统可以主动问一个澄清问题；问对一个，检索会好很多。

## 要点
- 数据集 Qulac：约 1 万问答复对，198 个 TREC 主题，762 个侧面。
- 预言机实验：只问一个好问题，P@1 可提升超过 170%。
- 框架：问题检索 → 问题选择 → 文档检索；选择要看原查询和已有问答。

## 对本仓库
- **已有**：Bayes factor 不够时用两张卡的片段做 `splitQuestion`。
- **已有**：没有卡达标时不拼菜单；可分两段时用 `splitQuestion`。

## 改变的概念
- [[clarifying-vs-menu]]
- [[follow-up-interaction]]

## 原文
- `raw/1907.06554-clarifying-questions-qulac.pdf` · arXiv:1907.06554
- 核对用：`raw/md/1907.06554-clarifying-questions-qulac.md`
