# ADR 018 — 受众帧对齐 + 纠偏闭环（Wave R7）

## 背景

会场个案：问「对孩子有什么帮助」答成园所落地/招生价值；用户说「回答不正确」后只 recall 问句或 skip，无法重答。根因是 FAQ 泛别名、影子 `kb-fallback` 无受众闸、投诉词未进纠错态。

## 决策

1. **帧（audience × facet）**：问句与答卡须同受众才可本地 `committed`；规则在 `schema/query-frame.json`，不写引擎字面量。
2. **FAQ**：去掉招生卡上的裸「有什么好处」；补孩子帮助正卡；`faq-match` 增加 `childAsk` / `titleChild`，并收紧 `titleLaunch`（去掉裸「这个课程」）。
3. **定卡闸**：`frame_mismatch` / `banned_card` / `low_align_commit` 放行 Agent；`formal=clarify` 且影子受众不一致时禁止 `kb-fallback`。
4. **纠偏闭环**：扩 `toneRetry` + `correctReask`；投诉时 `banCard` + `correctingUntil`；窗口内 recall 改为 `answerCorrectionForPrev`；`DEDUP_SKIP` 在纠偏窗口豁免。
5. **事实源不变**：纠偏仍只念 FAQ/Wiki；LLM 最多 oralize。

## 分波

| Phase | 内容 |
|-------|------|
| 7a | FAQ 帧 + 孩子卡 + match 规则 |
| 7b | `frameGate` + commit / shadow |
| 7c | tone / patrol / recall→重答 / dedup |
| 7d | `smoke:wave-r` Phase7 + 本 ADR |

## 验收

- `npm run build:kb` + `npm run smoke:wave-r`（含 frame / child FAQ / tone）
- 会场：「对孩子有什么帮助」不得念落地行事历；「不正确」应重答实质问

## 后果

- 与 ADR-017 正交，为其 Phase 7。
- 改 FAQ / schema / 主进程后须 `npm run desktop`。
