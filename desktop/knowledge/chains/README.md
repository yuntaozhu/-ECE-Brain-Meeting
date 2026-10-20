# Continuous follow-up chains（连续追问知识库）

会前离线蒸馏产物。每张 FAQ 种子卡扩成 3～6 步追问，答复取自 `faq-meeting.txt` 与 `quan-yuan-meiyu.txt`。

## 生成

```bash
npm run knowledge:distill
npm run knowledge:distill -- --limit=5
npm run knowledge:distill -- --all
npm run knowledge:distill -- --force-rule
npm run knowledge:distill -- --dry
```

有 `DOUBAO_API_KEY` / `ARK_API_KEY` 时走豆包预估问句；否则或 `--force-rule` 时用分句规则路径。预估问句必须能被现有对齐找回源卡或详版段落，否则写入 `tune-samples.jsonl`，不进正式链。

## 目录

| 路径 | 内容 |
| --- | --- |
| `index.json` | 目录与 ready 统计 |
| `by-card/*.json` | 单卡链（问句、口播、cite、roundtrip） |
| `readable/*.md` | 可读连续对话 |
| `faq-chains.md` | 合并可读版 |
| `tune-samples.jsonl` | 对齐找回失败的调算法样本 |

## 使用边界

- 会中不自动改写 `faq-meeting.txt`。升格问法仍走 `npm run knowledge:promote`。
- 本目录不决定开口；作答线（0.42 / 0.28 / 0.18 / BF≥3）不变。
- 开发取舍见 `desktop/dev_knowledge/wiki/concepts/offline-question-prediction.md`。
