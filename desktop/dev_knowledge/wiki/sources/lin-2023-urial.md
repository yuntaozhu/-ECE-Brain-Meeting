# The Unlocking Spell on Base LLMs（Lin 等，2023）· URIAL

## 一句话
不用 SFT / RLHF，固定系统提示加少至三条风格例句，就能让基座模型按助手口吻回答。

## 要点
- 对齐微调主要挪动风格 token（话语标记、安全声明）；回答所需知识仍在基座模型里。
- URIAL：in-context learning，少至三条固定风格例句加一条系统提示。
- 评测集叫 just-eval-instruct。文中报告基座加 URIAL 可以接近或超过部分经过 SFT 或 SFT+RLHF 的模型。

## 对本仓库
- **已有**：`composeNumberRule` 就是固定提示约束，不微调。
- 风格例句用本次检索到的原句，不把 URIAL 仓库里的通用助手例句抄进会场提示。

## 改变的概念
- [[static-prompt-grounding]]

## 原文
- `raw/2312.01552-urial-in-context-alignment.pdf` · arXiv:2312.01552
