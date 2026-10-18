# Factors That Support Grounded Responses in LLM Conversations（Iwashima 等，2025）

## 一句话
快速综述：推理时 / 后训练手段如何让对话贴住话题；地图不是算法说明书。

## 要点
- 从大量候选筛到约二十篇，覆盖 URIAL、RAIN、ARGS、Linear Alignment、SAF 等。
- URIAL 的做法以 [[lin-2023-urial]] 为准：系统提示加少至三条风格例句。
- RAIN / ARGS / Linear Alignment 改解码路径。倍数不在本页转写。
- 筛选排除了部分 QA 与口语场景，与会场半双工不完全重合。

## 对本仓库
- **采用思想**：固定提示接地（已有 compose 约束）。
- **不采用**：逐词搜索类推理时对齐。

## 改变的概念
- [[static-prompt-grounding]]
- [[decode-time-search]]

## 原文
- `raw/2511.21762-grounded-responses-rapid-review.pdf` · arXiv:2511.21762
