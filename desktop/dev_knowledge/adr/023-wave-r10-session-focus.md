# ADR 023 — Wave R10：Session Focus & Recovery

## 背景

R9a 让「我刚刚问了什么」走 Meta/recall，不再进 FAQ；但会场仍出现：

1. 一句「没钱怎么办？可以优惠吗？」被 ASR 拆成两 final；
2. hard 无证据 **skip**，不写 `lastRealAsk`；
3. 「请回答」不在 `urgeAct`，催答失效；
4. recall 按固定链读旧成功问（教育局），指到上上问。

根因：Ask 写入绑成功口播；回放非 SSOT；催答/纠偏契约不全。

## 决策

| Phase | 内容 |
|-------|------|
| R10b | 扩 `urgeAct`/`patrolForce`；催答读 Focus；咨询中催答立即巡检 |
| R10a | `pickLatestFocus`（按 At）；`commitFocusAsk` 受理即写；skip/filler 不挡写槽 |
| R10d | `ask_repair` 抽 X 写 Focus 并重答；recall 排除纠偏复述；未答 Focus 只回放问句（不弱匹配错卡） |
| R10c | `followOnShort` + `focusGlueMs` 短窗粘合 |
| R10e | hard 无证据 → `focusGapHonest`（meta），禁止纯 skip |

## 验收

- `npm run smoke:wave-r10`
- 既有 `smoke:wave-r` / `smoke:wave-r9a` 仍绿
- 会场：请回答 / 请回答我刚刚的问题 → 催答重跑；我刚刚问了什么 → 非教育局脏槽

## 关键文件

- `knowledge/schema/session-commands.json` / `session-intents.json` / `speak-lines.json` / `dialogue-meta.json` / `engine-hyperparams.json`
- `lib/intelligence/memory.cjs` / `dialogueMeta.cjs`
- `lib/meetingStrategy/paths/consult/{gate,localAnswer,rewritePrepare}.cjs`
- `lib/meetingSession/{intents,patrolPolicy}`
- `lib/meetingStrategy/agent/run.cjs`

## 后果

- 与 ADR-020 正交：R9a 读通道保留，R10 补写/选/修 Focus。
- 改 schema / 主进程后须 `npm run desktop`。
