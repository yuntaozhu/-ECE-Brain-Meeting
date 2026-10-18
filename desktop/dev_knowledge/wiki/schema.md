# 开发 Wiki Schema（Karpathy LLM Wiki · 软件开发用途）

本目录是**引擎开发取舍**的编译层。原始论文在 `desktop/dev_knowledge/raw/`，只追加不改写。  
与会中 `desktop/knowledge/` **完全隔离**：会中 Query / 召回 / 口播 **禁止** 读本目录；本目录的句子 **禁止** 写入 `faq-meeting.txt`。

目的：改 `decideSpeak`、对齐、豆包、评测之前，先读这里的「取舍 / 落点」，避免把过期聊天纪要或论文口号当成现行架构。

## 三层

| 层 | 路径 | 谁写 | 规则 |
| --- | --- | --- | --- |
| Raw | `dev_knowledge/raw/` | 人挑选并下载 | 不可变；模型只读 |
| Wiki | `dev_knowledge/wiki/` | 模型编译、人审阅 | 主张可被推翻；以代码与 `.cursorrules` 为现状 |
| Schema | 本文件 | 人与模型共演进 | 规定 Ingest / Query / Lint |

## 三步操作

| 操作 | 何时 | 做什么 |
| --- | --- | --- |
| **Ingest** | 新论文进 `raw/` 之后 | 一次一篇。写来源页 → 只改被它改变取舍的概念页 → 更新 `index.md` → `log.md` 追加一行。无新取舍则不建空概念页 |
| **Query** | 改引擎算法之前 | 先读 `index.md` → 打开 1–3 个整页 → 按「取舍 / 落点」决定改不改代码。值得留下的比较可归档成新概念页 |
| **Lint** | 阶段结束或冒烟前 | 查矛盾取舍、过期主张、孤页、断链、提到却无页的概念；**取舍与 `desktop/lib/` 不一致时以代码为准，回头改 wiki** |

## 概念页模板

文件：`wiki/concepts/{slug}.md`

```markdown
# 标题

## 主张
材料实际说了什么，必须能回到 raw。

## 取舍
采用 / 已有 / 不采用。不采用写明约束（时延、后验线、不微调、在线零 Embedding）。

## 公式
算法页必填。引擎正在用的式子以 `desktop/lib/` 为准，并写参数来自哪份 JSON。论文式子只誊写能对上 PDF 的行；`raw/md/` 分栏拆乱的表格不得原样粘贴。没有公式的流程页删掉本节。

## 流程
流程页必填，用 Mermaid。画现行路径；未决改动单独标出，不画成已经在跑。

## 落点
对应文件或机制（如 relevance.cjs、compose、engine-hyperparams.json）。不写进 faq-meeting.txt。

## 相关
- [[other-slug]]

## 出处
- raw/文件名 与章节或 arXiv id
```

## 来源页模板

文件：`wiki/sources/{slug}.md`

```markdown
# 题名（作者，年）

## 一句话
这篇对开发决策有什么用。

## 要点
- …

## 对本仓库
采用 / 部分对齐 / 不采用（各一句话）。

## 改变的概念
- [[concept-slug]]

## 原文
- `raw/….pdf` · arXiv:xxxx.xxxxx
```

## 硬规则

1. **代码与 `.cursorrules` 是现状**；wiki 是「为什么这样选」。过期页归档或改取舍，禁止两套互相矛盾的「当前做法」。
2. **来源由人挑选**。模型可编译页面，禁止自行追加「也许以后会」或把会话纪要灌进本库。
3. **`index.md` 是导航**，不是第二份正文。禁止把同一段摘要改写后铺进每一页。
4. **数字只写论文或代码里有的**。不作答线放宽（后验 ≥ 0.42、对齐 ≥ 0.28、闭题 ≥ 0.18、Bayes factor ≥ 3）除非 `.cursorrules` 与评测一起改。
5. **不跑 `rag:index`** 给本库建 Embedding。本库靠 `index.md` 与整页阅读。
6. 密钥、API Key **禁止** 写入本目录任何文件。
7. **`raw/md/`** 是 MarkItDown（本机 `conda activate markitdown`，环境在 `D:\Anaconda\envs\markitdown`）从 PDF 抽出的核对文本。不断言版面、公式、表格完全正确；主张与数字以 PDF 为准。Query 先读 index 与概念页，核对某一句时再打开对应 md，禁止把多篇全文灌进同一次上下文。不使用 `markitdown-ocr`（会改写原文）。

## 索引行格式（index.md）

```
- slug | 一句话 | type=source|concept | aliases=别名1,别名2
```

## log 行前缀（可 grep）

```
## [YYYY-MM-DD] ingest | 标题
## [YYYY-MM-DD] query | 问题
## [YYYY-MM-DD] lint | 范围
```
