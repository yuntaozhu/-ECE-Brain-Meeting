# ADR 020 — Wave R9a：Dialogue-Meta + 豆包专职 meta channel

## 背景

R8 后 FAQ 硬题与 soft 放行已稳，但对话元问题（「你是怎么回复的」「刚才问什么」「没听清」）仍被内容检索吸到身份/邻卡。根因是缺会话元闸，内容车道越权。

## 决策

1. **Dialogue-Meta 前置**：`consultPath` 在粘滞 `handleGate` 之后、`prepareAsk`/FAQ 之前挂 `handleDialogueMeta`。
2. **规则优先**：`schema/dialogue-meta.json` 分类；仅 `DIALOGUE_META_LLM=1` 且 ambiguous 时打 `channel=meta` JSON。
3. **三槽记忆**：`lastRealAsk` / `lastContentSpeak` / `lastMetaSpeak`；`incomplete|interrupted|failed` 不写槽。
4. **Meta ≠ 业务 Draft**：meta 口播只写 `lastMetaSpeak`，禁止当 Copilot refine 业务答案。
5. **扩展现有 LLM 层**：`resolve` 增 meta 等 channel；`transport.llmChatJson`；**禁止**平行 `arkClient.cjs`。
6. **口令仍归 duplex/commands**；不整段重写 `decideSpeak`。

## 分波

| Phase | 内容 | 状态 |
|-------|------|------|
| 9a | dialogue-meta + memory + consultPath 挂载 + llmChatJson + smoke | 本 ADR |
| 9b | oralize 首句 / laneArbiter（ambiguous） | 见 ADR-021 |
| 9c | Agent 两跳收口 + Copilot 三角增强 | 见 ADR-022 |

## 验收（9a）

- `classifyBySchema("你是怎么回复的").metaType === "recall_answer"`
- `classifyBySchema("你是谁").metaType === "none"`
- 会场路径：「怎么回复」回放 `lastContentSpeak`，不答身份 FAQ
- interrupt/`draftState!==committed` 不写槽
- `npm run smoke:wave-r9a`；既有 `smoke:wave-r` 仍绿

## 关键文件

| 路径 | 职责 |
|------|------|
| `knowledge/schema/dialogue-meta.json` | 枚举、模式、lines、metaSystem |
| `lib/intelligence/dialogueMeta.cjs` | 分类 + handle |
| `lib/intelligence/memory.cjs` | 三槽 |
| `lib/meetingStrategy/paths/consultPath.cjs` | 挂点 |
| `lib/meetingStrategy/internal/result.cjs` | `speakKind` 分槽 |
| `lib/meetingStrategy/llm/transport.cjs` | `llmChatJson` |
| `lib/meetingStrategy/llm/providers/resolve.cjs` | `channel=meta` → FAST |

## 后果

- 与 ADR-017/018/019 正交；R9b/c 再补 oralize/Agent。
- **写槽/催答/纠偏**见 ADR-023（R10）：R9a 保证读通道不进 FAQ；Focus 受理写与按 At 回放由 R10 补齐。
- 改 schema / 主进程后须 `npm run desktop`。
