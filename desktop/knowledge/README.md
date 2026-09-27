# 大智 AI 会议顾问 — 知识库说明（v2）

本目录供桌面虚拟音频网桥（**大智**）使用。

| 文件/目录 | 用途 |
|-----------|------|
| `li-laoshi-system-prompt.txt` | 大智角色与模式说明 |
| `faq-meeting.txt` | **L1** 闭题秒答 FAQ |
| `quan-yuan-meiyu.txt` | 详版资料；语义 RAG 切块 |
| `.rag-index.json` | Embedding 本地索引；`npm run rag:index` 离线预建 |
| `sessions/` | 本场 jsonl 原文 + summary 纪要 |
| `inbox/` | L2/L3 答后候选（自动写） |
| `distilled/` | 审核升格后的知识片段（进 RAG） |

## 答法三层

| 层 | 来源 | 说明 |
|----|------|------|
| L1 | `faq-meeting.txt` | 闭题模板秒答 |
| L2 | RAG + Chat | 开放/经营；成功写入 `inbox/` |
| L3 | RAG + Deep Thinking | 起死回生等；成功写入 `inbox/` |

升格：

```bash
cd desktop
npm run knowledge:promote       # inbox → distilled
npm run knowledge:promote:faq   # 常见短答 → FAQ
npm run rag:index
```

## 模式

| 模式 | 触发 | 行为 |
|------|------|------|
| HH 人—人 | 默认 | 旁听记录；偏题短纠偏；不抢答 |
| HA_ASK 咨询 | 呼叫大智 + 闭题/一般问 | FAQ 强匹配或语义 RAG+短答 |
| HA_TALK 探讨 | 大智探讨 / 抵触两难 | 亲和选项+反问 |
| HA_BIZ 经营顾问 | 招生/倒闭/落地/多园/0→1 | L2/L3：口播抓手 + 步骤卡 |
| 总结 | 大智总结 / 要总结 | 短纪要 + 下一议题 |

口令：`大智你好` · `谢谢大智` · `大智总结一下` · `暂停记录` · `继续记录`

## 会议流程

旁听记录 →（呼叫）咨询/探讨/经营顾问 →（停止）回旁听 →（总结）纪要与抛题 → 继续人—人
