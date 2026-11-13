# ADR 022 — Wave R9c：Agent 两跳收口 + Copilot Meta 隔离

## 背景

R9a/R9b 已稳住 Meta 与 hard oralize。soft/strategy 仍可能检索过宽或拖慢首包；副驾驶若精炼 Meta/repair 句会污染顾问卡。

## 决策

1. **`toolHops.cjs`**：MeetingAgent 检索硬顶 **2 跳**（searchFAQ → searchWiki|readMemory|searchWeb stub）。
2. **证据不足**：soft/strategy 两跳后仍弱 → `draftMode=card`，主链短 repair/不硬编，写 Intelligence SKIP 卡供副驾驶。
3. **`AGENT_SEARCH_WEB`**：默认关；仅 strategy 车道可读开关（当前 stub，不接外网）。
4. **Copilot**：`isMetaOrRepairDraft` 跳过精炼；advisor JSON 增 `smart_replies`；禁止 Meta/repair 当业务 Draft。
5. 不整段重写 `decideSpeak`；不新建平行 arkClient。

## 验收

- `MAX_TOOL_HOPS === 2`；弱检索 `hopCount ≤ 2`
- `AGENT_SEARCH_WEB` 默认 false；=1 时 strategy 第二跳可记 searchWeb
- Meta/recall/repair draft → refine 返回 `meta_draft_skip`
- `npm run smoke:wave-r9c`；`r9a`/`r9b`/`wave-r` 仍绿

## 关键文件

| 路径 | 职责 |
|------|------|
| `agent/toolHops.cjs` | 两跳预算 |
| `agent/run.cjs` | 接线 + card 收口 |
| `copilot/refine.cjs` | Meta 禁精炼 + smart_replies |
| `schema/copilot-gate.json` | advisorSystem |

## 后果

- Wave R9 主线（a/b/c）闭环；后续可接真实 searchWeb provider。
- 改 schema/主进程后 `npm run desktop`。
