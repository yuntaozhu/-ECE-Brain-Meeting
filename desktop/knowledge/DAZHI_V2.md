# 大智 AI 会议顾问 v2 — 开发落地说明

## 已实现

- 唤醒名：**大智**（ASR 别名：大致/大志等）
- **HH** 默认旁听 + 偏题短纠偏（每段最多 2 次）
- **HA_ASK** 咨询 / **HA_TALK** 探讨 / **HA_BIZ** 经营顾问
- 停止：`谢谢大智` → IDLE_LISTEN 只记不答
- 总结：`大智总结` / `要总结` → 纪要 + 下一议题；静默半自动先询问
- Session：`knowledge/sessions/{meetingId}.jsonl` + `-summary.md`
- UI：模式芯片、打开本场记录、经营步骤卡
- **LLM Wiki 知识层**：`wiki/concepts/` 正式词条；会中整页 Query；会后 Ingest/Lint

## 答法三层（L1 / L2 / L3）


| 层                    | 触发                            | 行为                                                            | arkMode     |
| -------------------- | ----------------------------- | ------------------------------------------------------------- | ----------- |
| **L1 模板**            | 闭题 + FAQ 强匹配                  | `faq-meeting.txt` 秒答                                          | `faq`       |
| **L2 RAG+LLM**       | 经营/开放/追问                      | Wiki 整页 + `DOUBAO_CHAT_MODEL`（`thinking.type=disabled`，超时 20s） | `biz-agent` |
| **L3 Deep Thinking** | 起死回生/破局/更好方案/深入分析；或连续 2 次经营追问 | 同模型 + `thinking.type=enabled`，超时 120s                         | `biz-deep`  |


失败兜底：`biz-heuristic` / `biz-rag`（优先词条「口播」）；禁止复读同一句。

### 知识库（Karpathy Wiki）

```
knowledge/
  raw/                 # 原料说明（immutable）
  wiki/
    schema.md          # 约定
    index.md           # 目录
    log.md             # 变更日志
    concepts/*.md      # 正式词条：口播 / 事实 / 边界 / 相关 / 常见问法
  inbox/               # L2/L3 自动候选
  distilled/           # 历史；默认不再新堆问答页
```

| 操作 | 时机 | 命令 / 行为 |
|------|------|-------------|
| **Query** | 会中 L2/L3 | `queryWiki` + 语义索引；预览为整页口播/事实/边界 |
| **Ingest** | 会后审核 | `npm run knowledge:wiki:ingest` — 只追加「常见问法」 |
| **Lint** | 定期 | `npm run knowledge:wiki:lint` |

硬规则：L2/L3 成功回答**不得**自动改写词条的事实/口播/边界。FAQ 的 A 优先取自词条口播。

### 答后沉淀

1. L2/L3 **成功 LLM 答** → 自动写入 `knowledge/inbox/l2|l3-YYYY-MM-DD.jsonl`
2. HA_ASK 成功 LLM → 同样写 inbox + **会中答后缓存**
3. 审核升格：

```bash
cd desktop
npm run knowledge:wiki:ingest       # inbox → wiki 常见问法
npm run knowledge:promote:faq       # 命中≥3 → faq（A=口播）
npm run knowledge:session           # 最近一场 → inbox + wiki
npm run knowledge:session:faq
npm run knowledge:wiki:lint
npm run rag:index                   # 含 wiki 每页一条
```

可选：`.env` 设 `SESSION_PROMOTE_ON_STOP=1` → 停听会后自动跑会话沉淀（不含自动 FAQ）。

### 离线预建索引

```bash
cd desktop
npm run rag:index
# 或强制重建
npm run rag:index:force
```

听会启动只 **warm** 本地索引。

## P0 已修（对照 bridge 日志）

- 经营路径**默认调 LLM**（不再要求 semantic 才调）
- 超时 20s / Deep 45s；HTTP/解析失败打日志
- `diagnose` 只看本轮问句
- 防复读：LLM 换路径重试 → 不同 heuristic 分支（禁止强制 rescue 同句）

## 口令速查（P0–P2 会议控制）


| 说        | 效果                                       |
| -------- | ---------------------------------------- |
| 大智，会议开始  | 新 Session，清临时上下文，warm 知识库，播开场白 → 静默      |
| 大智，…（提问） | 唤醒并回答，进入咨询（90 秒粘滞）                       |
| 谢谢大智     | 回静默只记                                    |
| 大智，听我说   | 打断占麦（播报中取消 TTS）                          |
| 大智，请继续   | 续播上一答，或按刚说内容重答                           |
| 我说完了     | 打断占麦结束；有补充则按补充作答                         |
| 大智，总结一下  | 阶段总结后回静默                                 |
| 大智，会议结束  | 会末纪要（结论/分歧/待办/下一步）→ 写 summary → 沉淀 → 停听会 |


### P1 打断（barge-in）

- SPEAKING 期间保留上行，仅放行打断/续说/静默口令
- 主进程 ASR 短路：识别到「听我说」立刻 `response.cancel`
- `interruptBuffer` 保存被打断全文；占麦期间会场句写入 `holdFloorLines`
- 「请继续」：有补充 → 重答；无补充 → 续播缓冲；否则短确认

### P2 会议生命周期

- 生命周期芯片：`未开会 / 开场中 / 静默 / 咨询中 / 占麦中 / 总结中 / 收尾中`
- `MEETING_START`：新 `mtg_*`、清答后缓存与主上下文、`warmIndexFromDisk`、开场白后 SILENT
- `MEETING_END`：LLM/启发式会末四段纪要 → `sessions/{id}-summary.md` → 后台 `promote-session` → 播完后关 Duplex
- 可选：`.env` 设 `SESSION_PROMOTE_ON_STOP=1`

静默（含刚启动的旁听）下，**没有「大智」等口令不会插话**，包括问句。咨询超时回静默。

## 环境变量

```env
DOUBAO_API_KEY=          # 或 ARK_API_KEY：Chat + Embedding（勿把 Key 写进仓库）
DOUBAO_EMBED_MODEL=doubao-embedding-vision-251215
DOUBAO_CHAT_MODEL=doubao-seed-evolving
DOUBAO_CHAT_DEEP_MODEL=doubao-seed-evolving
DOUBAO_CHAT_FAST_MODEL=  # 可选轻量（一般咨询）
BIZ_LLM_TIMEOUT_MS=20000
BIZ_DEEP_TIMEOUT_MS=120000
```

代码行为：

- L2 请求体：`"thinking": { "type": "disabled" }`
- L3 请求体：`"thinking": { "type": "enabled" }`

## 关键文件

- `lib/knowledge/` — Wiki / RAG / FAQ corpus / sink
- `lib/meetingStrategy/` — 策略引擎（Handler 链 + 咨询路径 + advisors）
- `lib/meetingSession/` — 互动姿态 / 口令 / 会阶
- `lib/runtime/` — answerCache / sessionLog
- `lib/duplex/` — 半双工文本与回声策略
- `scripts/wiki-ingest.cjs` / `wiki-lint.cjs` / `bootstrap-wiki.cjs`
- `scripts/promote-inbox.cjs` / `promote-session.cjs`
- `main.cjs` / `renderer/app.js`
