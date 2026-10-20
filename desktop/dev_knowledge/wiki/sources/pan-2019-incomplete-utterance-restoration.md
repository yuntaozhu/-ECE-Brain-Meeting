# Improving Open-Domain Dialogue Systems via Multi-Turn Incomplete Utterance Restoration（Pan 等，2019）

## 一句话
不完整话语的恢复，是从上文挑出被省略的少量词，拼回原句，而不是整句重写。

## 要点
- 作者是 Zhufeng Pan、Kun Bai、Yan Wang、Lianqiang Zhou、Xiaojiang Liu。数据集 Restoration-200K。
- 多轮里大量话语不是完整句，直接送进对话模型会答偏。
- 他们统计：参考恢复句平均只有上文约 17.7% 的词与之重叠，而原句的词全部留在恢复句里。
- 因此纯 Seq2Seq 容易原样吐回残句。他们改成 Pick（从上文标出省略词）再 Combine（把这些词拼回原句）。

## 对本仓库
- **部分对齐**：上一张答卡的标题焦点相当于 Pick；本轮疑问尾保留，相当于 Combine。拼出来的字符串只用于检索。
- **不采用** BERT 序列标注器。Pick 用现有焦点、泛词、弱尾和指代词表。

## 改变的概念
- [[follow-up-interaction]]
- [[query-understanding]]

## 原文
- `raw/pan-2019-incomplete-utterance-restoration.pdf` · ACL D19-1191
- 核对用：`raw/md/pan-2019-incomplete-utterance-restoration.md`
