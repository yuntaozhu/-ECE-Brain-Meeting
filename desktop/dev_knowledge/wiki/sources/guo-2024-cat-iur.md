# Context-Aware Tracking and Dynamic Introduction for Incomplete Utterance Rewriting（Guo 等，2024）

## 一句话
长对话里要维护一份当前关键短语，主题换了就丢掉旧候选，再做不完整话语改写。

## 要点
- 作者是 Xinnan Guo、Qian Zhu、Qiuhui Shi、Xuan Lin、Liubin Wang、Daqian Li、Yongrui Chen。方法名 CAT。
- Incomplete utterance rewriting：把省略和代词补成能单独成立的句子。
- 短对话、单主题上的改写，到客服长会话会失败：相似实体太多，轮次很长。
- CAT 逐轮更新关键短语列表，当作省略和指代的候选；与这份列表无关的上文不再送进改写。

## 对本仓库
- **部分对齐**：上一张已答卡的标题焦点就是当前这一槽关键短语。答出新卡就换槽。澄清、复述模板不是关键短语。
- **不采用**从大模型蒸馏 tracker，也不把多轮原文整段送进改写。

## 改变的概念
- [[follow-up-interaction]]

## 原文
- `raw/guo-2024-cat-incomplete-utterance-rewriting.pdf` · ACL Findings 2024
- 核对用：`raw/md/guo-2024-cat-incomplete-utterance-rewriting.md`
