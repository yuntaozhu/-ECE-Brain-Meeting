# ADR 021 — Wave R9b：hard oralize 首句 + lane 模糊仲裁

## 背景

R9a 补齐 Dialogue-Meta 后，hard FAQ 仍缺「证据已定 → 口播短句」专职通道与首句先行；default 车道偶发该开 soft/strategy 却落 hard。

## 决策

1. **补强** `paths/consult/oralize.cjs`：`channel=oralize`；`splitLeadFollow`；流式 `onClause` 先开口；abort → `incomplete` / 不把半截写入 content 槽。
2. **laneArbiter**：对 `classifyAskLane` 的 `default` 做 schema 补判（`needMoreInfo` / `softAmbiguous` / `strategyAmbiguous`）；`LANE_ARBITER_LLM=1` 才打 lane JSON。
3. **commitGate / isOpenIntelligenceLane** 走 `resolveAskLane`，不每次打豆包。
4. **不重建** frameGate；不整段重写 decideSpeak；不新建 arkClient。

## 验收

- `resolveAskLane("课堂氛围怎么样会不会太难").lane === "soft"`
- `forceRule` 下 oralize 仍产出 `leadSentence`，可 `onEarlySpeak`
- abort signal → `incomplete` + `draftState=interrupted`
- hard FAQ 秒答与 `lastContentSpeak` 仍写入
- `npm run smoke:wave-r9b`；`smoke:wave-r` / `smoke:wave-r9a` 仍绿

## 关键文件

| 路径 | 职责 |
|------|------|
| `paths/consult/oralize.cjs` | 口播改写 + 首句 |
| `intelligence/laneArbiter.cjs` | 模糊仲裁 |
| `schema/ask-lane.json` | 模糊模式 + laneSystem |
| `schema/speak-lines.json` | oralizeSystem 协议化 |
| `intelligence/evaluate.cjs` | 挂 askLaneInfo |

## 后果

- R9c：Agent 两跳 + Copilot 三角增强。
- 改 schema/主进程后 `npm run desktop`。
