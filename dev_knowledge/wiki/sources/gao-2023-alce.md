# Enabling Large Language Models to Generate Text with Citations（Gao 等，2023）· ALCE

## 一句话
带引用的回答要从流利、正确、引用质量三方面评；引用没撑住句子就算失败。

## 要点
- ALCE 要求系统先检索证据，再生成带引用的答案。
- 自动指标有三维：流利、正确、引用质量，并与人工判断相关。
- 摘要中的例子：ELI5 上最好的模型仍有 50% 的时候缺少完整引用支撑。

## 对本仓库
- **已有约束**：豆包只重组本次检索里的原句。
- **评测约定**：断言不能只看口播里碰巧出现某个词；要核对分句来自胜出卡。
- **不采用**按 ALCE 再做一个端到端检索生成器。

## 改变的概念
- [[atomic-support-eval]]
- [[static-prompt-grounding]]

## 原文
- `raw/2305.14627-alce-citations.pdf` · arXiv:2305.14627
