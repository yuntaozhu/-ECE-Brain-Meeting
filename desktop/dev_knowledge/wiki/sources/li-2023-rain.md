# RAIN: Your Language Models Can Align Themselves without Finetuning（Li 等，2023）

## 一句话
解码时自评并回退改写，免微调。会场单次生成的超时预算放不下这种回退。

## 要点
- Rewindable Auto-regressive INference：生成中评估再 rewind。
- 属于推理时对齐，不更新权重。
- 会场口播有硬超时（豆包单次、失败即 kb-fallback），多轮回退不放进主路径。

## 对本仓库
- **不采用**（时延、半双工）。

## 改变的概念
- [[decode-time-search]]

## 原文
- `raw/2309.07124-rain-inference-alignment.pdf` · arXiv:2309.07124
