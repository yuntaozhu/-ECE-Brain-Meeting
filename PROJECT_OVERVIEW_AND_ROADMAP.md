# 大地 ECE-Brain AI 智能会议系统 — 功能 · 架构 · 机制 · 下一步计划

> **项目**：`-ECE-Brain-Meeting`（大地 ECE-Brain 协同教研会议）  
> **权威蓝图**：`DADI_AI_MEETING_UPDATE_DEVELOPMENT_PROMPT.md`（v4.0）  
> **线上**：前端 Vercel `dadimeeting.minervaedu.app`；API Railway；状态 Upstash Redis  
> **文档日期**：2026-09-17

---

## 1. 产品定位

面向幼教数字化教研（园长、教研、董秘、校董等）的 **AI 主导协同研讨会场**。

**核心矛盾**：传统会议「人情揣测大于议题推进」→ 冷场、偏题、不敢拍板。  
**解法**：会前 RAG + 分钟级议程；会中 **真人实时互通** + **Kaiban 多 Agent 中立控场**；会后待办与纪要闭环。

**体验红线**：参会者之间应 **直接听到对方原声**；AI 只在偏题 / 冷场 / 议程推进时插话，**不得**把每人发言再转述一遍。

---

## 2. 功能总览

### 2.1 三个业务场景

| 场景 | 目标 | 主要能力 |
|------|------|----------|
| **会前** | 议题与依据就绪 | 资料挂载 / Embedding / RAG；分钟级议程编辑或 AI 生成；建会与分享链接 |
| **会中** | 真人通话 + AI 控场 | 火山 RTC 多方语音；聊天与议程同步；Kanban；A2A 巡检与干预；成员条 / RBAC |
| **会后** | 共识可执行 | 学术待办；纪要摘要；可选腾讯会议外链 / 文档归档 |

### 2.2 功能清单（按模块）

| 模块 | 能力 | 现状（概略） |
|------|------|----------------|
| 入会与 RBAC | `roomId` 分享、creator/attendee、昵称 | ✅ 已有 |
| 会前 Setup | 主题、议程、资料上传、`/api/rag/embed-resource` | ✅ 基础有；向量库偏过渡态 |
| 业务同步 | 聊天 / 议程 / 状态；WS 优先、HTTP Poll 降级 | ✅ 可用（Redis 生产） |
| 真人实时语音 | 火山 RTC join / publish / subscribe | ✅ 代码就绪；**依赖 Railway `VOLC_RTC_*`** |
| Kaiban A2A | Director→Host→Secretary→Researcher；事件流 UI | ✅ 可观测控台；偏「巡检 API」非全双工 Bot |
| 议程看板 | 等待 / 进行中 / 已完成；管理员切换 | ✅ 已有 |
| AI 主席发声 | TTS / 本地朗读 / 干预入 transcript | ⚠️ 降级路径；**未完成 StartAIConversation** |
| 实时字幕 | RTC `startSubtitle` → transcript | ❌ 未完成 |
| 会后纪要导出 | 结构化纪要归档 | ⚠️ 待办可见；完整导出弱 |
| 腾讯会议 | 可选外链 / API | ⚠️ 可选；非实时主通道 |

---

## 3. 系统架构

### 3.1 部署拓扑

```
[浏览器 React SPA]
        │  HTTPS
        ▼
[Vercel]  静态前端（可 rewrite /api/*）
        │  API_BASE
        ▼
[Railway Express 常驻]
   ├─ REST：建会 / RAG / evaluate / RTC Token / health
   ├─ Realtime：WS 或 HTTP Poll + 事件增量
   ├─ Kaiban A2A：Doubao Ark（失败则启发式）
   └─ Upstash Redis：会议状态 / 事件 / RAG chunk
        │
        ▼
[火山引擎]
   ├─ RTC（真人媒体；目标含 AI Bot）
   ├─ 方舟 Doubao（LLM / Embedding）
   └─ 豆包 ASR / TTS（目标主路径）

（可选）腾讯会议 OpenAPI — 外链建会 / 纪要回写
```

### 3.2 三层通道（必须分清）

| 层 | 职责 | 技术 |
|----|------|------|
| **A 媒体** | 麦克风 ↔ 远端真人（↔ 未来 AI Bot） | 火山 RTC |
| **B 业务** | 聊天、议程、看板、A2A 元事件、RBAC | RealtimeChannel + Redis |
| **C 管理** | 建会、上传、RAG、导出、可选腾讯 | REST |

**红线**：Vercel 不承载 RTC；禁止用 Serverless 内存 `Map` 扛生产多方状态；禁止用腾讯会议号冒充本站已互通。

### 3.3 前端结构（关键）

| 区域 | 路径 |
|------|------|
| 壳与入会 | `src/App.tsx` |
| 会前 | `src/components/MeetingSetup.tsx` |
| 会中 | `src/components/MainRoom.tsx` |
| 成员条 | `src/components/ParticipantsStrip.tsx` |
| 聊天 / ASR 辅助 | `src/components/ChatBox.tsx` |
| A2A 侧栏 | `src/components/AgentPanel.tsx` |
| 议程看板 | `src/components/AgendaKanbanBoard.tsx` |
| 状态 | `src/store.ts`（Zustand） |
| RTC | `src/hooks/useVolcRtc.ts` |
| 控场编排 | `src/hooks/useMeetingOrchestrator.ts` |
| Kaiban 客户端 | `src/lib/kaibanMeetingEngine.ts` |

### 3.4 后端结构（关键）

| 区域 | 路径 |
|------|------|
| HTTP 入口 | `server.ts` |
| 会议持久化 | `server/lib/meetingStore.ts` |
| RTC Token | `server/lib/volcRtcToken.ts` + `POST /api/volc/rtc/token` |
| Kaiban 服务端 | `src/lib/kaibanMeetingEngine.server.ts` |
| 实时通道 | `server/websocketMeeting.ts` + poll API |
| 腾讯可选 | `server/routes/tencentMeeting.ts` 等 |

### 3.5 Kaiban Agent 分工

```
DirectorAgent（冷场/偏题巡检）
       │ A2A
       ▼
HostAgent（打断 / 点名 / 控场话术）
       ├─► ResearcherAgent（RAG 检索）
       └─► SecretaryAgent（待办 / 纪要提炼）
```

前端通过「运行 A2A 巡检」或静默阈值触发；结果写入 `a2aTrace`、干预文案、待办与议程建议。

---

## 4. 运行机制

### 4.1 会前流程

1. 发起人进入 Setup：定主题、编辑/生成议程、上传资料。  
2. `POST /api/rag/embed-resource` 切块 Embedding，写入 Redis（或后续 VikingDB）。  
3. 生成 `roomId`，复制分享链接（attendee 角色）。

### 4.2 入会与开始

1. 各端打开链接 → 填昵称 → `joinMeeting`（本地 store + 服务端房间状态）。  
2. 发起人「开始会议」→ `meetingStarted=true` 同步各端。  
3. 前端 `useVolcRtc(joined && meetingStarted)`：  
   - 向后端要 Token → `VERTC.createEngine` → `joinRoom` → `startAudioCapture` → `publishStream`  
   - 订阅远端并 `play` 音频。  
4. 若无 `VOLC_RTC_APP_ID/KEY` → `UNCONFIGURED`，退化为 **纯文字 + 可选浏览器 ASR**（易被误认为「AI 转述会议」）。

### 4.3 会中业务同步

1. 聊天 / 发言上行：`POST /api/live/send` 或 WS。  
2. 下行：WS 推送，或 `GET /api/live/poll?since=seq` 增量。  
3. Redis 持久化会议状态与事件，保证多实例 / 刷新不丢（生产需 Upstash）。

### 4.4 AI 控场循环（当前实现）

```
transcript 变化
    → 静默约 5s 或 +5 条消息
    → useMeetingOrchestrator.triggerOrchestration
    → POST /api/meeting/evaluate（服务端 Kaiban 流水线）
    → 返回 a2aTrace / 干预 / 待办 / 议程建议
    → 更新 UI；必要时 TTS 或本地朗读（非 RTC Bot 入会）
```

**目标机制（蓝图未完全落地）**：`StartAIConversation` 使 AI 作为 RTC 虚拟用户入会 → 听 ASR、说 TTS，全员从媒体通道听到主席，与真人同一房间。

### 4.5 媒体 vs 文字的关系（易混点）

| 路径 | 作用 | 是否算实时通话 |
|------|------|----------------|
| 火山 RTC 推拉流 | 原声互听 | ✅ 是 |
| ChatBox「语音输入」 | Web Speech → 文字发聊天 | ❌ 否（辅助） |
| Kaiban 干预 + TTS | 控场播报 | 控场，不是转述全员发言 |
|「开启语音朗读」 | 本地朗读 AI/系统文 | 辅助 |

---

## 5. 现状对照蓝图（P0–P7）

| 阶段 | 目标 | 状态 |
|------|------|------|
| **P0** | 常驻后端 + Redis 会议状态 | ✅ 基本完成 |
| **P1** | 火山 RTC 替换 TRTC 主路径 | ✅ 代码完成；**运维凭证决定能否互通** |
| **P2** | `StartAIConversation` AI Bot 入会 | ❌ 未做（最高优先级缺口） |
| **P3** | `startSubtitle` + 字幕入 transcript | ❌ 未做 |
| **P4** | RAG → TOS/VikingDB；议程分钟制固化 | ⚠️ 部分（embed/search 有；生产向量库弱） |
| **P5** | Agenda + Kaiban 接字幕流 | ⚠️ 接 transcript/静默；未接 RTC 字幕 |
| **P6** | RealtimeChannel 彻底统一 | ⚠️ 可用；遗留 TRTC/多通道文案可清理 |
| **P7** | 腾讯会议降为可选；清 mock「已连接」 | ⚠️ 部分 |

**MVP 验收（产品）**：两终端同一 `roomId` 开麦互听；AI 全员可听；分享入会；至少一次议程 AI 切段；WS/Poll 同步；常驻后端 + Redis。

---

## 6. 下一步开发计划

### 原则

1. 先保证 **真人 RTC 互通**（配置 + 验收），再上 **AI Bot 入会**。  
2. AI **控场 ≠ 转述**；字幕可选，默认不自动朗读人类发言。  
3. 按里程碑提交，禁止大爆炸改全仓。

---

### 里程碑 M0 — 运维打通真人通话（0.5–1 天）

| 任务 | 验收 |
|------|------|
| Railway 配置 `VOLC_RTC_APP_ID` / `VOLC_RTC_APP_KEY` 并重启 | `/api/volc/rtc/token` 非 `UNCONFIGURED` |
| 双端开始会议、开麦 | UI 显示「火山 RTC 互通」；互听成功 |
| 失败显式报错 | 禁止假「已连接」 |

**阻塞项**：无控制台凭证则后续媒体/AI Bot 无法真验收。

---

### 里程碑 M1 — 体验纠偏：通话优先（1–2 天）

| 任务 | 说明 |
|------|------|
| 文案与引导 | 明确「开麦说话」= 通话；「语音输入」= 转写辅助 |
| 默认关闭对人类发言的自动朗读 | 仅保留 Host 干预播报开关 |
| RTC 未配置强提示 | 置顶 banner，避免误用 ASR 当会议 |
| 清理遗留 TRTC 主路径暗示 | `ENABLE_LEGACY_TRTC` 外不展示「TRTC 已连接」 |

---

### 里程碑 M2 — StartAIConversation（3–5 天）★ 核心

| 任务 | 验收 |
|------|------|
| 服务端封装 RTC OpenAPI `StartAIConversation` / 结束会话 | 会议开始自动拉起 / 结束释放 |
| ASR + 方舟 LLM + TTS 控制台配置对齐 | Bot 入同一 `RoomId` |
| 前端不再依赖「本地 TTS 冒充全员可听」作为主路径 | 双端都能听到 AI 主席 |
| Kaiban 干预话术注入 AI 会话 | 偏题/冷场时 Bot 开口，而非仅写 transcript |

参考：火山 RTC「AI 实时对话」文档（以控制台最新为准）。

---

### 里程碑 M3 — 实时字幕（2–3 天）

| 任务 | 验收 |
|------|------|
| `engine.startSubtitle` + `onSubtitleMessageReceived` | 会中字幕条 |
| 写入 `transcript` + Redis 事件 | 控场与会后可用 |
| 与 ChatBox ASR 分工 | 字幕主路径；浏览器 ASR 可降级/关闭 |

---

### 里程碑 M4 — Kaiban ↔ 字幕/RTC 深接线（2–3 天）

| 任务 | 验收 |
|------|------|
| Director 基于字幕流做冷场/偏题（替代纯静默+文本条数） | 指标可解释 |
| Host 输出 → AI Bot TTS（M2） | 全员可听打断 |
| Researcher 检索稳定化 | 挂载资料后问答有依据 |
| Secretary 待办结构化 + 导出会后稿 | 一键导出 Markdown/JSON |

---

### 里程碑 M5 — RAG 与议程生产化（3–4 天）

| 任务 | 验收 |
|------|------|
| `VectorStore` 抽象；TOS 大文件直传 | 大课件不打满 Express |
| VikingDB（或等价）替换纯 Redis chunk | 检索质量可测 |
| 议程 UI 全面分钟制；超时驱动 Kanban | 与蓝图 2.4 一致 |
| `POST /api/rag/search` 稳定供 Researcher | 单测 / 手工用例通过 |

---

### 里程碑 M6 — 通道收敛与会后闭环（2–3 天）

| 任务 | 验收 |
|------|------|
| RealtimeChannel 单一实现收敛遗留 poll/ws 分叉 | 断 WS 后 Poll 仍同步 |
| 会后纪要页 / 导出 | 含待办、阶段、关键干预 |
| 腾讯会议 UI 标明「可选外链」 | P7 文案验收 |
| 健康检查面板展示 storeBackend / rtcConfigured | 运维一眼可见 |

---

### 建议执行顺序（两周视图）

```
Week 1:  M0 凭证互通 → M1 体验纠偏 → M2 AI Bot 入会（启动）
Week 2:  M2 收尾 → M3 字幕 → M4 Kaiban 接线
并行/随后: M5 RAG · M6 通道与会后
后置: 声音复刻、屏幕共享理解、小程序/Electron、腾讯双房间桥接
```

### 明确不做（本阶段）

- 并行维护 TRTC + 火山 RTC + 腾讯客户端三套主媒体  
- 用 Gemini 作为 Kaiban 主 LLM  
- 腾讯会议号与火山 `RoomId` 混用  
- 把「ASR → 文字 → AI 复读」当作实时通话方案  

---

## 7. 关键环境变量（生产）

| 变量 | 用途 |
|------|------|
| `UPSTASH_REDIS_*` / Redis URL | 会议状态与事件 |
| `ARK_API_KEY` / Doubao 模型名 | LLM / Embedding |
| `VOLC_RTC_APP_ID` / `VOLC_RTC_APP_KEY` | RTC Token（**真人互通必填**） |
| （后续）AI Conversation 相关密钥/配置 | Bot 入会 |
| （可选）`TENCENT_MEETING_*` | 外链 / 归档 |

详见 `.env.example` 与蓝图第八、十节。

---

## 8. 文档与代码索引

| 文档 / 代码 | 说明 |
|-------------|------|
| `DADI_AI_MEETING_UPDATE_DEVELOPMENT_PROMPT.md` | v4 权威蓝图 |
| `KAIBAN_TENCENT_MEETING_INTEGRATION.md` | Kaiban A2A 与历史腾讯集成思路 |
| `PROJECT_PROGRESS_SPECS.md` | 进度规格（若存在） |
| `src/hooks/useVolcRtc.ts` | 真人 RTC |
| `src/hooks/useMeetingOrchestrator.ts` | 控场触发 |
| `src/lib/kaibanMeetingEngine.server.ts` | 服务端 A2A |
| `server/lib/meetingStore.ts` | Redis 会议存储 |

---

*本文档描述「现状总结 + 目标架构 + 可执行下一步」。实施时以 v4 蓝图为准；完成 M0–M2 后再扩展字幕、RAG 与会后闭环。*
