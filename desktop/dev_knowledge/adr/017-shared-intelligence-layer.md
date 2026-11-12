# ADR 017 — Wave R + 共用智能层 + 副驾驶 Seed-Evolving

## 背景

会场错答主因是弱后验定错卡、换题粘滞、闭题澄清空转；副驾驶默认模板，与口播各说各话。完整方案将 **Wave R（定卡）**、**方案 C（共用智能层）**、**Doubao-Seed-Evolving（副驾驶话术）** 合成一条主线。

## 决策

1. **事实源**：FAQ / Wiki / 检索命中句；LLM 不发明报价、包赚、绕规。
2. **开口权**：仍在 `decideSpeak` / HostSpeak；副驾驶旁路不占麦。
3. **智能层（方案 C）**：编排「理解 → 检索 → 定卡闸 → SpeakDraft」；不重写贝叶斯公式；禁止业务字面量进引擎 `.cjs`。
4. **Wave R0–R3**：先补 FAQ、弱命中放行 Agent、换题清粘滞、闭题直答、上一问回放；再抽智能层。
5. **副驾驶**：A/B/C 由同一 Draft 派生；`COPILOT_LLM_*` 通道默认 **Doubao-Seed-Evolving**（或对应 `ep-`），会中关深度思考；模板仅作 instant 占位。
6. **不整段重写 `decideSpeak`**；现存 `slotOk` / DROP / 口令债按宪法迁移。

## 契约草图

见 `desktop/lib/intelligence/contract.cjs`：`IntelligenceResult`（gate / card / draft / variants / sticky）。

## 分波

| Phase | 内容 |
|-------|------|
| 0 | 本 ADR + 契约 + 回归集冻结 |
| 1 | FAQ 补卡（R0）+ `build:kb` |
| 2 | 定卡闸 + Agent → Draft（R1） |
| 3 | 粘滞 / 闭题 / 上一问（R2–R3） |
| 4 | 智能层抽取 + 副驾驶接 Draft |
| 5 | 副驾驶 Seed-Evolving 专用通道 |
| 6 | 日志降噪（R4） |
| 7 | 受众帧 + 纠偏闭环（见 ADR-018） |
| 8 | 双通道开口 + 副驾驶顾问（见 ADR-019） |

## 落地进度

- Phase 0/1：ADR + `contract.cjs` + FAQ 补卡 + `smoke:wave-r` FAQ/副驾驶骨架（已完成）
- Phase 2：`commitGate.cjs` + `draft.cjs`；`localAnswer` 弱定卡 `return null`；Agent/定卡写 `lastSpeakDraft`（已完成）
- Phase 3：`topicShift.cjs` 异题清粘滞；闭题 FAQ 强制秒答；`prevRealAsk` + 扩 recall/closed schema（已完成）
- Phase 4：`evaluateConsult` 编排；`alignFromDraft`；副驾驶 `stage=aligned` 同源覆盖（已完成）
- Phase 5：`COPILOT_LLM_MODEL` 通道（Seed-Evolving）；`COPILOT_LLM_THINKING=disabled`；refine 锁 Draft（已完成）
- Phase 6：独立听会 Duplex skip→DEBUG；`observeTurn` 统一 gate/draftFp/source；TTS 403/额度告警合并（已完成）
- Phase 7：受众帧 / 孩子帮助 FAQ / 纠偏重答 → ADR-018（已完成）
- Phase 8a：`ask-lane` + 副驾驶去空前缀 / 短 topic → ADR-019（已完成）
- Phase 8b：soft/strategy 定卡放行 Agent + composeSoft/StrategyRule（已完成）
- Phase 8c：副驾驶顾问 refine 默认开 + thinking + 取消 aligned 跳过（已完成）
- Phase 8d：冒烟收口 + ADR-019 关键文件表（已完成）

## 验收

- Phase 0–6：`npm run smoke:wave-r`（含 `observeTurn`）+ `smoke:wave-i` + `smoke:scene-faq`
- 会场：设 `COPILOT_LLM_REFINE=1` 与 `COPILOT_LLM_MODEL=doubao-seed-evolving`（或 ep-）后可见精炼
- 独立模式日志不应再刷 Duplex send skipped WARN；TTS Forbidden 条幅/ERROR 约 60s 合并一次

## 后果

- 与 ADR 013（精炼）、014（Option C）、016（试播链）正交：013/014 变为「对 Draft 润色」，不定卡。
- 改 FAQ / 主进程后须 `npm run desktop` 才在会场生效。
