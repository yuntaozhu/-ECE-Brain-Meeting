# ADR 019 — Wave R8：双通道开口 + 副驾驶顾问精炼

## 背景

FAQ 内硬题已稳；软题/超范围易 skip 或贴邻卡；副驾驶默认 instant 模板（「按现有口径」+ 整句 ASR），即便 `COPILOT_LLM_REFINE=1` 也只是话术润色，不是顾问分析。

## 决策

1. **askLane**：`hard | soft | strategy`，规则在 `schema/ask-lane.json`；默认 `hard`。
2. **口播**：硬题翻卡秒答；软/策略弱命中强制放行 Agent+LLM；FAQ/Wiki 仅证据；禁硬数字与虚假口碑（8b）。
3. **副驾驶**：FAQ 作证据，LLM 作三角顾问；不因 `aligned` 跳过精炼；可开思考（8c）。
4. **不整段重写 `decideSpeak`**；业务词不进引擎 `.cjs`。

## 分波

| Phase | 内容 | 状态 |
|-------|------|------|
| 8a | `ask-lane` schema + `classifyAskLane`；砍 Option A 空前缀；短 topic | 已完成 |
| 8b | commitGate / localAnswer 软放行 + MeetingAgent soft profile | 已完成 |
| 8c | 顾问 refine prompt + 默认精炼/思考 + 取消 aligned 跳过 | 已完成 |
| 8d | 冒烟收口 + INDEX / 017 / cursorrules | 已完成 |

## 验收（8a）

- `classifyAskLane("学生喜欢吗").lane === "soft"`
- `classifyAskLane("我想使用全园英语课来辅助园所运营").lane === "strategy"`
- `classifyAskLane("多少钱").lane === "hard"`
- 副驾驶 `push_forward_with_fact` 不再含「按现有口径先推进」
- `npm run smoke:wave-r`（含 Phase8a）

## 验收（8b）

- soft + `progress` / 高后验邻卡 → `open_lane_*` 放行 Agent
- hard + `progress` 仍 KEEP
- MeetingAgent 注入 `composeSoftRule` / `composeStrategyRule`
- `npm run smoke:wave-r`（含 Phase8b）

## 验收（8c）

- `shouldRefineCopilot()` 默认 true；`COPILOT_LLM_REFINE=0` 可关
- 副驾驶 `COPILOT_LLM_THINKING` 默认开；可显式 disabled
- `aligned` 不再阻止 refine；`refine.advisorSystem` 为顾问三角
- 会场：出卡先「毫秒级/精炼中」→「✨ AI 已精炼」（有 Key）
- `npm run smoke:wave-r` + `smoke:wave-i`

## 验收（8d）

- `npm run build:kb`
- `npm run smoke:wave-r`（含 8a–8c）
- `npm run smoke:wave-i`
- `npm run smoke:scene-faq`
- INDEX 已链 ADR-019；会场改完后 `npm run desktop`

## 关键文件

| 路径 | 职责 |
|------|------|
| `knowledge/schema/ask-lane.json` | hard/soft/strategy 规则 |
| `lib/intelligence/askLane.cjs` | 分流算子 |
| `lib/intelligence/commitGate.cjs` | 开车道放行 Agent |
| `lib/meetingStrategy/paths/consult/localAnswer.cjs` | 软 miss 早退 |
| `lib/meetingStrategy/agent/run.cjs` | soft/strategy compose |
| `lib/copilot/refine.cjs` + `schema/copilot-gate.json` | 顾问精炼 |
| `main/strategyEvaluate.cjs` | 不再因 aligned 跳过 refine |

## 后果

- 与 ADR-017/018 正交；013 在 8c 改为顾问精炼语义。
- 改 schema / 主进程后须 `npm run desktop`。
