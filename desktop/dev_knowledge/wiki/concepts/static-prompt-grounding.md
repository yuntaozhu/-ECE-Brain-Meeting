# 固定提示接地

## 主张
URIAL 不用 SFT 或 RLHF。固定系统提示加上少至三条风格例句，就让基座模型按助手口吻回答。文中的测量是：对齐前后多数 token 的首选不变，变的主要是风格 token；答题知识仍在基座里。

## 取舍
**已有。** `composeNumberRule` 限制两到三句、先答本句、只重组检索原句、不补充原句没有的数量、比例、周期或承诺。

风格例句用本次检索到的原句。不把 URIAL 的通用助手例句抄进会场，也不为口吻去微调。

## 落点
- `desktop/knowledge/schema/speak-lines.json` → `composeNumberRule`
- `desktop/lib/meetingStrategy/agent/run.cjs` → `composeSystem`

## 相关
- [[perceived-empathy-tone]]
- [[atomic-support-eval]]
- [[lin-2023-urial]]

## 出处
- [[lin-2023-urial]]
- [[iwashima-2025-grounded-responses]]（综述里的位置，细节以 URIAL 原文为准）
