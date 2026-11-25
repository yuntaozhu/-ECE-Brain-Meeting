# Speech-based Information Retrieval System with Clarification Dialogue Strategy（HLT/EMNLP 2005，ACL H05-1126）

## 一句话
语音检索的问句常残缺，还有识别错误；先确认关键片段，再按信息增益收窄检索。

## 要点
- 语音输入常在用户还没想清问句时就开始说，问句模糊或碎片化。
- 用相关度、重要度找出要确认的片段；用信息增益选澄清问题，减少命中文档数。
- 在约 4 万条软件支持知识库上提高了检索成功率。

## 对本仓库
- **已有**：残句检测、`eig` 与两候选片段反问。
- **不采用**另起一套语音对话策略替换责任链。
- 转写噪声下，先确认再检索，与「听不清不编答案」同向。

## 改变的概念
- [[clarifying-vs-menu]]
- [[query-understanding]]

## 原文
- `raw/h05-1126-speech-ir-clarification.pdf` · ACL Anthology H05-1126
- 核对用：`raw/md/h05-1126-speech-ir-clarification.md`
