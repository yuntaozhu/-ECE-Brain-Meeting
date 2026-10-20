# Dialog Inpainting: Turning Documents into Dialogs（Dai 等，2022）

## 一句话
把资料原句当作已经说出口的答复，只补两句之间读者会问的那一句。

## 要点
- 文档句子是 writer 侧；模型 inpaint 缺失的 reader 问句，交错成对话。
- 产出 WikiDialog / WebDialog，用于 ConvQA 检索预训练。
- arXiv:2205.09073。

## 对本仓库
- **采用**：详版/FAQ 原句当答复，离线只预估追问。
- **不采用**百万级预训练；链长限 3～6。

## 改变的概念
- [[offline-question-prediction]]

## 原文
- arXiv:2205.09073（PDF 尚未放入 `raw/`）
