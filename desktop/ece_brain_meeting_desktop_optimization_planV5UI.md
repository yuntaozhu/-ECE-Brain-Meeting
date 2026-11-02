# -ECE-Brain-Meeting 源码审计、UI/UX 深度重构方案与全套开发提示词（Wave G ~ Wave L）

> **状态（2026-11-01）**：Wave G / H / I / J / K / L **全部落地**。验收：`smoke:wave-h` · `smoke:wave-i` · `smoke:wave-jk` · `smoke:wave-l` · `test:lint:hardcode`。

## 一、上传代码完成度全景核验（Wave A ~ Wave F 审计结论）

通过对上传的 `-ECE-Brain-Meeting-main.zip`（重点为 `desktop/`、`.cursor/`、`desktop/dev_knowledge/`、`desktop/knowledge/` 与 `desktop/knowledge_wiki/`）进行全量静态代码走查与沙箱实测执行，**此前规划的 Wave A 至 Wave F 六大阶段核心骨架已基本落地，7 个专项冒烟脚本（`smoke-copilot-gate`、`smoke-wave-a` ~ `smoke-wave-f`）全部跑通**。

### 1.1 各模块实际落地状态评分表

| 阶段 / 模块 | 对应核心代码文件 | 完成度 | 实测验证结果与落地亮点 | 尚存短板概要 |
| :--- | :--- | :--- | :--- | :--- |
| **Wave A：双通道音频 + VAD + 本地 Whisper + 胶囊窗 + `dev_knowledge`** | `renderer/audio/{capture,uplink}.js`<br>`main/listenSession.cjs`<br>`lib/asr/{vadGate,whisperLocal,glossaryCorrect}.cjs`<br>`renderer/capsule.{html,js}`<br>`dev_knowledge/INDEX.md` | **90%** | `smoke-wave-a` 通过。已实现 `Others`（CABLE/displayMedia）与 `Me`（本机麦）分轨上送、`hostAsr` / `hostAsrMe` 双会话隔离、能量 VAD 切句、外挂 Whisper CLI/Server 封装、9 条热词纠错及透明悬浮胶囊。 | 1. `vadGate.cjs` 缺语音前 250ms 预卷缓冲（易吞首字），Silero 仅为占位符；<br>2. 悬浮窗未开启 Electron `setContentProtection(true)` 原生防共享屏幕抓取。 |
| **Wave B：意图门控 + Speculative 预检索 + Auto/Manual 模式** | `lib/copilot/{gate,prefetch,mode,suggest}.cjs`<br>`knowledge/schema/copilot-gate.json` | **80%** | `smoke-copilot-gate` (6/6) 与 `smoke-wave-b` 通过。已支持 4 类意图分类、`Alt+Z` Push-to-Ask、`Alt+Shift+Z` 模式切换与节流控制。 | **`prefetch.cjs` 存在“假预热”缺陷**：`noteOthersForPrefetch` 仅在句尾 `buildCopilotPacket` 内同步调用，未挂接到 ASR 流式 `partial` 事件上。 |
| **Wave C & D：会中参谋（速览/速记/截屏OCR/Mermaid/DeepDive）+ MCP** | `lib/copilot/{recap,jot,screenContext,ocrWin,mermaidHint,deepDive}.cjs`<br>`renderer/ui/{meetingAid,mermaidView}.js`<br>`scripts/meeting-context-mcp.cjs` | **80%** | `smoke-wave-c` 与 `smoke-wave-d` 通过。11 个 stdio MCP 工具已配置进 `.cursor/mcp.json`，支持 WinRT PowerShell OCR 与离线 Flowchart 节点渲染。 | 1. **`recap.cjs` 触发 `no-hardcode-lint.cjs` 门禁失败（含 2 个禁用字面量）**；<br>2. Quick Jot 前端写死 `meetingId: "live"`；<br>3. 建议卡与 Deep Dive 仅靠固定模板拼接，缺异步 LLM 精炼。 |
| **Wave E & F：Karpathy Wiki 2.0（Fast Read + 豆包编译 + 主题合成）** | `knowledge_wiki/`<br>`lib/wiki2/{parsePage,buildIndex,retrieve,ingest,compileLlm,reconcile,themes,fromSession}.cjs` | **75%** | `smoke-wave-e` 与 `smoke-wave-f` 通过。四段式 AI-First 页面、1ms 级无 LLM Fast Read、Superseded 历史否决注入及共现聚类草稿均已跑通。 | 1. **业务库 `knowledge/wiki`（19篇全园美语）与 `knowledge_wiki`（仅4篇研发页）割裂**；<br>2. `retrieve.cjs` 在 0 分时强行兜底返回第 1 篇研发文档；<br>3. `compileLlm.cjs` 落盘时把 LLM 编译结果覆盖回了规则版。 |

---

## 二、后端与知识库源码审计：10 个核心 Bug 与修复方案（已整理至 Wave G ~ I）

1. **[P0] `npm run test:lint:hardcode` 门禁报错失败**：`desktop/lib/copilot/recap.cjs`（第 7–12 行）包含禁词 `"问题"` 与 `"收费"`，需迁入 `knowledge/schema/copilot-gate.json`。
2. **[P0] `lib/wiki2/retrieve.cjs` 零分强行兜底 Bug + 业务库割裂**：第 45 行在 `score === 0` 时强行返回第 1 篇研发页；需删除该兜底并编写 `wiki2-sync-domain.cjs` 同步 19 篇“全园美语”业务概念页。
3. **[P0] `lib/wiki2/compileLlm.cjs` 落盘丢失 LLM 编译结果**：第 96 行落盘时误调规则版 `ingestEpisode`，需传入 `opts.precompiled`。
4. **[P0] `lib/copilot/prefetch.cjs` 假预热且计时器恒为 0**：需在 `main/listenSession.cjs` 的流式 ASR `!final` 阶段调用 `onOthersPartialAsr`。
5. **[P1] `lib/wiki2/buildIndex.cjs` 中文分词缺陷与 `reconcile.cjs` 丢失历史 `valid_from`**：需引入 2~4 字 CJK 滑动 N-gram 分词与 `.tmp` 原子写。
6. **[P1] `package.json` 的 `extraResources` 遗漏 `knowledge_wiki` 与 `dev_knowledge/glossary`**：需在 `appPaths.cjs` 区分 `resources` 只读与 `userData` 可写目录。
7. **[P1] 建议卡 `clip(s, 60)` 生硬截断 + 缺两阶段异步 LLM 精炼**：需升级 `smartClip` 与 `refineCopilotPacketAsync`。
8. **[P2] `lib/asr/vadGate.cjs` 缺少 240ms Pre-roll 预卷缓冲**：易吞句首第一个字。
9. **[P2] `renderer/ui/meetingAid.js` 写死 `meetingId: "live"`**：需改为 `S.meetingIdUi || "live"`。
10. **[P2] 缺少 Electron 原生 `setContentProtection(true)` 防共享屏幕抓取**。

---

## 三、UI/UX 专项深度诊断：当前渲染端（`desktop/renderer/`）的 5 大体验痛点

在完成上述底层修复后，当前桌面端 UI（`desktop/renderer/index.html`、`capsule.html` 及 `renderer/ui/*.js`）在真实会议高频高压场景下存在明显的**“工程调试台风格重、会中作战视线分散、信息层级扁平”**问题：

| 痛点维度 | 精确源码位置 | 当前 UI 表现与会中实战痛点 | 优化重构目标 |
| :--- | :--- | :--- | :--- |
| **1. 会前配置与会中作战混杂，首屏空间浪费 50%+** | `renderer/index.html` (第 73–167 行) | 页面采用双列平铺 8 个大卡片：顶部的 `#archBox` 字符画拓扑图、`虚拟设备绑定`（3 个下拉框+5 个测试按钮）、`双账号核对` 占据了上半屏；真正开会时最核心的 `#transcript`（仅 150px 高）和 `#smartReplies` 被挤在下半屏，开会时必须频繁上下滚轮。 | **“会前抽屉 + 会中三栏驾驶舱”响应式切换**：将设备绑定、双账号核对与拓扑图收纳进可折叠的 `Pre-Flight 配置抽屉`；点击 `#start` 启动听会后**自动折叠抽屉**，将 85% 视口让给“左转写 + 中建议卡 + 右参谋”三栏作战舱。 |
| **2. 转写区是 11px 纯文本拼接，无自动滚底、无角色气泡、无单句交互** | `renderer/ui/transcript.js` (第 11–24 行)<br>`index.html` (`#transcript`) | `renderTranscript()` 用 `\n` 拼接纯文本赋给 `textContent`，不仅**缺少 `scrollTop = scrollHeight` 自动滚底**（超过 8 句话后新发言看不见），而且 `[Others]`、`[Me]`、`[大智]` 毫无色彩区分，也无法点击某句发言直接追问 AI。 | **多角色聊天气泡流 + 智能滚底 + 单句快捷操作**：升级为分角色气泡（左 `Others` 深蓝、右 `Me` 青绿、中 `大智` 琥珀金），支持自动贴底滚动（手动上翻时悬浮“↓新消息”按钮），悬停单句可一键 `[⚡以此句问AI]` 或 `[📌记入Jot]`。 |
| **3. 建议卡 Option A/B/C 视觉同质化，缺快捷键、证据胶囊与精炼状态** | `renderer/ui/smartReplies.js` (第 77–168 行) | 三个选项卡片外观完全一样（同为 `#31415f` 边框），在 1 秒扫视下难以瞬间区分“推进 / 风险避坑 / 反问”；`key_facts` 只是底部灰色小字列表，被否决的历史坑点（`SUPERSEDED`）不够醒目；无键盘 `1/2/3` 快捷键。 | **语义色彩编码 + 数字键 `1/2/3` 直达 + 证据胶囊**：Option A（翠绿推进）、Option B（琥珀/绯红避坑）、Option C（天蓝反问）差异化配色；右上角显示 `⚡瞬出` → `✨AI精炼` 状态徽标；底部渲染红/绿证据胶囊；支持按键 `1/2/3` 秒复制。 |
| **4. 会中参谋（Catch Me Up）丢弃结构化字段，退化为 `<pre>` 文本** | `renderer/ui/meetingAid.js` (第 23–29 行) | `recap.cjs` 明明返回了结构化的 `current_topic`、`disagreements[]`、`pending_decisions[]`、`wiki_facts[]`、`active_speakers[]`，但 `renderCatchMeUp` 只写了 `box.textContent = msg.digest`，全都糊在一个 160px 高的 `<pre>` 里。 | **结构化参谋看板 + 右侧多标签页（Tabs）聚合**：将 Catch Me Up 渲染为带色彩徽标的卡片组（议题/分歧/拍板/Wiki快照/活跃发言人）；右侧区域用 Tab 聚合 `【参谋&速记】`、`【架构图】`、`【Agent&待办】`、`【日志】`。 |
| **5. 悬浮胶囊（`capsule.html`）功能残缺，无法独立完成隐身作战** | `renderer/capsule.html`<br>`renderer/capsule.js` | 胶囊窗只有 `隐藏` 按钮和被动展示 3 张卡：没有 `[⚡问AI (Alt+Z)]`、没有 `[📋速览]`、没有 `[Auto/Manual]` 切换、没有 `Deep Dive` 折叠展开、也没有**极简迷你条（Mini-Pill）折叠模式**。 | **全功能隐身 HUD 胶囊 + 双态折叠**：顶部加入电平灯、`[Auto/Manual]`、`[⚡问AI]`、`[📋速览]`、`[━ 最小化条]`；支持折叠为 44px 高的迷你状态条，触发新建议卡时自动平滑展开，底部支持展开 Deep Dive 与 Wiki2 避坑标签。 |

---

## 四、UI/UX 架构重构全景设计图（桌面主控台 + 悬浮胶囊 HUD）

### 4.1 主控台（`renderer/index.html`）三层响应式驾驶舱布局

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│ 🟢 大智 AI 会议顾问   [会阶: SILENT] [模式: 人—人旁听]  Others ▆▆▃  Me ▃▁   议程:[全园美语…] │
│ [▶ 启动听会] [⏹ 停止] [⚡立即巡检]  │ [⚙️ 设备与核对 (已就绪) ▾] [🛡️防录屏] [📌置顶] [💊胶囊] │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│ (可折叠抽屉 #preflightDrawer：未开会时默认展开，点击“启动听会”后自动收起为 1 行状态摘要)      │
│  ┌─ 虚拟设备绑定 (Others/Me/Output + 自检按钮) ─┐ ┌─ 腾讯会议双账号核对 + 虚拟环路拓扑图 ─┐ │
├────────────────────────┬───────────────────────────────────┬────────────────────────────┤
│ 🗣️ 会场实时转写 (32%)  │ 💡 副驾驶智能建议中心 (40% C位)   │ 🧭 会中参谋与诊断工作台(28%)│
│ [已确认 18 句 · 识别中]│ [模式: Auto] [⚡Push-to-Ask Alt+Z]│ [参谋&速记] [架构图] [日志] │
│ ┌────────────────────┐ │ ┌───────────────────────────────┐ │ ┌────────────────────────┐ │
│ │ 👤 会场 [Others]   │ │ │ 🟢 Option A · 快速推进  [按1] │ │ │ 🎯 当前焦点：双通道隔离│ │
│ │ 39000怎么收费的？  │ │ │ 可以，按现有口径推进：大地…   │ │ │ ⚡ 分歧：是否用定时器  │ │
│ │   [⚡问AI] [📌速记]│ │ │               [复制] [🔊试播] │ │ │ 📌 待拍板：周五前联调  │ │
│ └────────────────────┘ │ └───────────────────────────────┘ │ └────────────────────────┘ │
│ ┌────────────────────┐ │ ┌───────────────────────────────┐ │ ┌─ Quick Jot 速记 ───────┐ │
│ │ 🙋 我 [Me·仅标定]  │ │ │ ⚠️ Option B · 谨慎权衡  [按2] │ │ │ [输入速记回车…] [记下] │ │
│ │ 我们先对齐下边界   │ │ │ 关于收费，历史已否决强制收…   │ │ │ • 网关超时 -> 改异步   │ │
│ └────────────────────┘ │ └───────────────────────────────┘ │ │ [✨ 结合转写扩写纪要]  │ │
│ ┌────────────────────┐ │ ┌───────────────────────────────┐ │ └────────────────────────┘ │
│ │ 🤖 大智 [Host播报] │ │ │ 🔵 Option C · 澄清反问  [按3] │ │ ┌─ 屏幕上下文 & Mermaid ─┐ │
│ │ 合作园3万9每学期…  │ │ │ 围绕收费，您更关心园所回本…   │ │ │ [📸 截屏注入] [OCR就绪]│ │
│ └────────────────────┘ │ └───────────────────────────────┘ │ │  Me ──> VAD ──> ASR    │ │
│ [手动话术…] [🔊试播]   │ [▸ 展开 Deep Dive 口述稿] [证据标签]│ └────────────────────────┘ │
└────────────────────────┴───────────────────────────────────┴────────────────────────────┘
```

### 4.2 悬浮胶囊（`renderer/capsule.html`）双形态设计（Mini-Pill 态 vs 展开 HUD 态）

```
【形态 A：Mini-Pill 极简隐身条（高 44px，平时不挡屏幕）】
┌──────────────────────────────────────────────────────────────────────────────┐
│ 🟢 DAZHI  Others: …刚才提到的三万九包含哪些权益？   [Auto] [⚡问AI] [📋] [▾] │
└──────────────────────────────────────────────────────────────────────────────┘

【形态 B：Expanded HUD 作战态（触发建议卡或点击展开时，高 ~380px）】
┌──────────────────────────────────────────────────────────────────────────────┐
│ 🟢 DAZHI COPILOT · [High] DIRECT_QUESTION · ✨AI精炼  [Auto] [⚡问AI] [📋] [▴]│
├──────────────────────────────────────────────────────────────────────────────┤
│ 🟢 [1] 快速推进：可以，按现有口径先推进：大地合作园项目服务价是三万九千元… [复制][播]│
│ ⚠️ [2] 谨慎权衡：关于收费，历史已否决：必须向每个家庭收 250 元…          [复制][播]│
│ 🔵 [3] 澄清反问：围绕收费，对方最关心的成功标准是什么？                  [复制][播]│
├──────────────────────────────────────────────────────────────────────────────┤
│ ▸ Deep Dive · 可口述支撑（点击展开论点 + 3条论据 + 100字口述稿）              │
│ 🏷️ [⚠️否决·SUPERSEDED-01: 禁止3秒切窗]  [✅CLAIM-01: 合作园39000/学期]       │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## 五、全套开发提示词（Markdown 格式，直接复制给 Cursor / Claude Code 执行）

这里包含 **后端/知识库修复提示词（Wave G ~ Wave I）** 与 **全新编写的 UI/UX 重构开发提示词（Wave J ~ Wave L）**。所有提示词均严格遵守 `desktop/.cursorrules`（`renderer/` 纯展示不写策略、保留全部现有 DOM ID 与 IPC 接口向后兼容）。

---

### 📋 开发提示词一（后端完美收官）：Wave G ~ I 门禁修复、Wiki2 业务同步、真预热与两阶段精炼

````markdown
# Role & Context
你正在维护 `desktop/`（`ece-brain-meeting-bridge`，CommonJS）。请严格遵守 `desktop/.cursorrules` 与 `.cursor/rules/desktop-architecture.mdc`：
1. **绝对红线**：禁止修改 `decideSpeak` 责任链与仓库根目录的 React 示例；`desktop/lib/**/*.cjs` 严禁新增硬编码业务词或字面量正则，改完必须跑通 `node test/no-hardcode-lint.cjs`。
2. **目标**：一次性完成后端与知识库的收尾加固（修复 `no-hardcode-lint`、修复 Wiki2 0分兜底与 LLM 落盘丢失、同步业务 Wiki、接通 ASR Partial 流式预热、加入 VAD 预卷缓冲与两阶段建议卡精炼）。

## Task 1：修复 `no-hardcode-lint.cjs` 门禁失败
1. 在 `desktop/knowledge/schema/copilot-gate.json` 的 `"patterns"` 下新增：
   - `"recapDisagree"`: `"((不同意|反对|有分歧|争议|不行|不对|质疑|风险|担心|但是|不过|我反对|存疑|有顾虑))"`（严禁含 `"问题"`、`"收费"` 等 `test/no-hardcode-lint.cjs` 禁用词！）
   - `"recapDecision"`: `"((拍板|决定|定下来|要不要|是否采用|确认一下|下一步|待定|谁负责|截止日期|DDL))"`
   - `"recapTopic"`: `"((方案|架构|接口|价格|预算|排期|上线|ASR|TTS|Whisper|双通道|副驾驶|FAQ|知识库))"`
   - `"mermaidArch"`: `"((架构|微服务|调用链|状态机|流水线|双通道|ASR|TTS|Whisper|VAD|decideSpeak|IPC|主进程|渲染))"`
   - `"mermaidFlow"`: `"((流转|流程|状态转移|从.+到|先.+再))"`
2. 修改 `desktop/lib/copilot/recap.cjs` 与 `desktop/lib/copilot/mermaidHint.cjs`：删除硬编码正则常量，改用 `schemaStore.rx("copilot", ...)`。
3. 运行 `node test/no-hardcode-lint.cjs` 确保输出 `[no-hardcode-lint] ok`。

## Task 2：修复 `lib/wiki2` 检索 0 分兜底、中文分词、LLM 落盘覆盖与业务库同步
1. `desktop/lib/wiki2/buildIndex.cjs`：升级 `tokenize(text)`，对连续中文字符额外生成 2~4 字滑动 N-gram 词片，解决整句中文无标点无法分词命中的问题。
2. `desktop/lib/wiki2/retrieve.cjs`：**删除第 45 行的 `if (!top.length) top = scored.slice(0, 1)...`**！当无 `score > 0` 命中时直接返回空数组，绝不返回无关研发文档。
3. `desktop/lib/wiki2/ingest.cjs` & `compileLlm.cjs`：在 `ingestEpisode(input, opts)` 中支持 `opts.precompiled = { contextual_chunks, extracted_claims }`；`compileLlm.cjs` 在落盘时将 LLM 解析出的 `contextual_chunks` 和 `extracted_claims` 传入 `precompiled`，修复 LLM 结果未写入磁盘 `.md` 的 Bug。
4. `desktop/lib/wiki2/reconcile.cjs`：归档旧 Claim 时提取并保留原 `valid_from`；采用 `${abs}.tmp` + `fs.renameSync` 原子写。
5. 新建 `desktop/scripts/wiki2-sync-domain.cjs`（及 `package.json` 脚本 `"wiki2:sync-domain"`）：读取 `desktop/knowledge/wiki/concepts/*.md` 下的 19 篇业务概念页，转换为四段式 AI-First 格式写入 `desktop/knowledge_wiki/wiki/entities/biz_${slug}.md`（`口播` -> `[1] AI-First Snapshot`，`事实` -> `[2] Active Claims`，`边界` -> `[3] Superseded & Failure Paths`），并自动重建 Wiki2 索引。

## Task 3：打通 ASR Partial 真预热、VAD 240ms Pre-roll 防吞字与智能断句/两阶段精炼
1. `desktop/lib/copilot/prefetch.cjs` & `desktop/main/listenSession.cjs`：
   - 在 `prefetch.cjs` 新增 `onOthersPartialAsr(partialText)`（600ms 节流），修复 `startedAt` 计时器逻辑；在 `listenSession.cjs` 的 `ensureHostAsr` 收到 `!final` 增量结果时调用 `onOthersPartialAsr(text)`。
2. `desktop/lib/asr/vadGate.cjs`：增加 `preRollMs = 240`（约 3 帧）的 `preRollChunks` 环形队列，在 `inSpeech` 从 `false` 变 `true` 时将前置帧并入 `chunks`，消除本地 Whisper 吞首字。
3. `desktop/lib/copilot/suggest.cjs` & `desktop/main/strategyEvaluate.cjs`：
   - 将 `clip(s, n)` 升级为优先按标点断句的 `smartClip(s, n)`。
   - 新增 `refineCopilotPacketAsync(packet, opts)`：当 `COPILOT_LLM_REFINE=1` 或手动 `forceCopilot` 且有 Key 时，在第 1 阶段同步推送模板卡（带 `stage: "instant"`）后，后台异步调用 `llmChat` 结合 Wiki2 Evidence 生成精炼 JSON 建议卡并广播 `{ type: "smart-replies", ...refinedPacket, stage: "refined", refined: true }`。
````

---

### 📋 开发提示词二（UI 重构第一波）：Wave J — 主控台“三栏式作战驾驶舱 + 可折叠会前抽屉 + 暗黑玻璃态设计系统”重构

````markdown
# Role & Context
你是一位精通 Electron 桌面端工程与高密度实时作战界面（Cockpit HUD）设计的资深前端架构师。
请重构 `desktop/renderer/index.html`、`desktop/renderer/app.js` 与 `desktop/renderer/ui/status.js`。

## Strict Guardrails (必须遵守的红线)
1. **遵循 `.cursorrules`**：`desktop/renderer/` 只做 UI 渲染、DOM 状态与 IPC 调用，**严禁**在渲染端编写业务策略或口令识别逻辑；**严禁**触碰仓库根目录的 React 示例（`src/`）。
2. **100% 保持 DOM ID 向后兼容**：重构 HTML 布局与 CSS 时，**必须完整保留**现有的所有 DOM `id`（包括但不限于：`archBox`, `keyStatus`, `chipArk`, `chipSpeech`, `chipVirtual`, `chipListen`, `chipMeetingAudio`, `chipPatrol`, `chipAgentMode`, `chipMeetingLife`, `chipThinking`, `chipReconnect`, `alertBanner`, `virtualOnly`, `allowPhysical`, `othersSource`, `inputDevice`, `dualTrackMe`, `meDevice`, `meLevel`, `outputDevice`, `routeHint`, `localMonitor`, `showCapsule`, `level`, `refresh`, `beep`, `selfTest`, `loop`, `loopStop`, `chkHost`, `chkAiSpk`, `chkAiMic`, `meetingGate`, `status`, `agenda`, `kbStatus`, `autoPatrol`, `start`, `stop`, `patrol`, `forceSpeak`, `btnSessions`, `manualText`, `asrStats`, `duplexStats`, `transcript`, `winAlwaysOnTop`, `winOpacity`, `copilotModeBtn`, `copilotPushAskBtn`, `smartRepliesMeta`, `smartReplies`, `catchMeUpBtn`, `screenCtxBtn`, `expandJotsBtn`, `quickJotInput`, `quickJotBtn`, `catchMeUpBox`, `mermaidBox`, `jotList`, `a2a`, `todos`, `btnCopyLog`, `btnClearLog`, `btnOpenLogDir`, `logPath`, `log`），确保 `app.js` 及所有子模块零报错运行！

---

## Task 1：升级 `desktop/renderer/index.html` 为“三层驾驶舱架构（Top Bar + Pre-Flight Drawer + 3-Column Cockpit）”

### 1. 设计系统与 CSS 变量升级
在 `index.html` 的 `<style>` 中引入现代暗黑玻璃态（Dark Slate & Cyan/Emerald/Amber Tactical HUD）设计变量：
- `--bg-app: #060a14`、`--bg-panel: rgba(15, 23, 42, 0.82)`、`--bg-card: #0b1120`、`--border-subtle: rgba(51, 65, 85, 0.65)`、`--border-focus: rgba(34, 211, 238, 0.55)`
- `--accent-cyan: #22d3ee`、`--accent-emerald: #10b981`、`--accent-amber: #f59e0b`、`--accent-rose: #f43f5e`
- 全局布局设为 `height: 100vh; display: flex; flex-direction: column; overflow: hidden;`（告别整页凌乱长滚动，让三大核心作战区各自独立内部滚动！）。

### 2. 第一层：顶部全局指挥栏（`.cockpit-topbar`）
将高频状态与主开关提炼至顶部固定栏（高度约 `58px`，左右 Flex 布局）：
- **左侧（品牌 + 状态灯组 + 实时微缩电平）**：
  - 应用标题 + `.chips` 状态胶囊组（`#chipListen`, `#chipMeetingLife`, `#chipAgentMode`, `#chipThinking`, `#chipMeetingAudio`, `#chipArk`, `#chipSpeech`, `#chipVirtual`, `#chipPatrol`, `#chipReconnect`）。
  - 内嵌紧凑型双轨电平条：`Others` (`#level`) 与 `Me` (`#meLevel`) 並排微缩显示（宽 `64px`），开会时无需展开设置抽屉也能一眼看到麦克风和会场是否有声音！
- **中部（议程快捷编辑）**：
  - `#agenda` 输入框（带前置标签 `🎯 议程`，自适应宽度）。
- **右侧（主控动作 + 窗口控制 + 配置抽屉开关）**：
  - 核心主按钮：`#start`（`启动听会`）、`#stop`（`停止`）、`#patrol`（`立即巡检`）。
  - 窗口工具簇：`#showCapsule`（胶囊开关）、`#winAlwaysOnTop`（置顶）、`#winStealthProtect`（新增：防共享屏幕抓取勾选框）、`#winOpacity`（透明度滑块）。
  - 抽屉折叠按钮：`<button id="togglePreflightBtn" class="ghost">⚙️ 设备与核对 <span id="preflightSummaryBadge">待核对</span> ▾</button>`。

### 3. 第二层：可折叠会前准备抽屉（`#preflightDrawer`）
紧随 Topbar 下方（带 `#alertBanner` 全局横幅提示）：
- 当处于未听会状态时默认展开（`open`）；包含 3 个并排紧凑卡片：
  1. **设备路由绑定**：`#keyStatus`、`#kbStatus`、`#virtualOnly`、`#allowPhysical`、`#othersSource`、`#inputDevice`、`#dualTrackMe`、`#meDevice`、`#outputDevice`、`#localMonitor`、`#routeHint`，以及底部测试按钮组（`#refresh`, `#beep`, `#selfTest`, `#loop`, `#loopStop`）。
  2. **腾讯会议双账号核对与控场设置**：`#chkHost`, `#chkAiSpk`, `#chkAiMic`, `#meetingGate`, `#autoPatrol`, `#btnSessions`。
  3. **虚拟环路拓扑图（可折叠 `<details>`）**：包裹 `#archBox` 与使用帮助说明 `.help`。
- **自动折叠联动（在 `app.js` 中实现）**：
  - 当点击 `#start` 且 `listenStart()` 返回 `res.ok === true` 时，**自动收起 `#preflightDrawer`**，并将 `#preflightSummaryBadge` 更新为 `"✅ 听会运行中 (点击展开设备)"`；
  - 当点击 `#stop` 或收到 `meeting-ended` 时，或用户手动点击 `#togglePreflightBtn` 时，可随时切换展开/收起。

### 4. 第三层：三栏式会中作战主工作台（`.cockpit-main`，占满剩余视口高度 `flex: 1; min-height: 0; display: grid; grid-template-columns: 32fr 40fr 28fr; gap: 12px; padding: 10px 14px;`）
- **左栏（32%）：实时多轨对话流面板（`.panel-transcript`）**
  - 顶部栏：标题 + `#asrStats` + `#duplexStats` + 角色过滤胶囊（`全部` / `仅会场 Others` / `仅大智 Host`）。
  - 中部主体：`#transcript`（`flex: 1; overflow-y: auto;` 撑满左栏高度，不再是 150px 小框！），外层相对定位包裹一个悬浮按钮 `<button id="scrollBottomBtn" style="display:none">↓ 最新发言</button>`。
  - 底部快捷试播栏：`#manualText` 输入框 + `#forceSpeak`（`试播 Host`）按钮。
- **中栏（40% C位）：副驾驶智能建议中心（`.panel-copilot`）**
  - 顶部控制栏：标题 + `#copilotModeBtn`（Auto/Manual 状态徽标按钮） + `#copilotPushAskBtn`（`⚡ Push-to-Ask (Alt+Z)` 醒目主色按钮） + 快捷键提示 `按 1 / 2 / 3 秒复制`。
  - 状态副标题：`#smartRepliesMeta`。
  - 主体卡片容器：`#smartReplies`（`flex: 1; overflow-y: auto;`）。
- **右栏（28%）：会中参谋与诊断多标签工作台（`.panel-aid-tabs`）**
  - 顶部 Tab 切换栏（纯前端切换 `.tab-pane` 显隐，不销毁 DOM 节点）：
    - **Tab 1 `🧭 参谋 & 速记`（默认激活）**：包含 `[📋 Catch Me Up (#catchMeUpBtn)]`、`[📸 截屏注入 (#screenCtxBtn)]`、`[✨ 扩写纪要 (#expandJotsBtn)]`、Quick Jot 输入行（`#quickJotInput` + `#quickJotBtn`）、结构化速览容器 `#catchMeUpBox`、以及 `#jotList`。
    - **Tab 2 `📐 架构图 & 待办`**：包含 `#mermaidBox`（实时架构图）+ `#todos`（待办列表）+ `#a2a`（Agent 推理轨迹）。
    - **Tab 3 `📜 调试日志`**：包含 `#btnCopyLog`、`#btnClearLog`、`#btnOpenLogDir`、`#logPath` 与 `#log`（撑满 Tab 高度）。

---

## Verification (验收标准)
1. 启动应用或检查 DOM，所有原 ID 100% 存在且事件绑定正常。
2. 未开会时抽屉展开方便调设备；启动听会后抽屉自动收起，三栏作战舱占满屏幕且各自独立平滑滚动。
````

---

### 📋 开发提示词三（UI 重构第二波）：Wave K — 多角色聊天气泡转写流、三色语义建议卡、数字快捷键与结构化参谋看板

````markdown
# Role & Context
你正在重构 `desktop/renderer/ui/` 下的视图组件（`transcript.js`、`smartReplies.js`、`meetingAid.js`）。
请遵守 `desktop/.cursorrules`：保持纯展示与 IPC 触发，不写业务策略。

---

## Task 1：重构 `desktop/renderer/ui/transcript.js` 为“多角色聊天气泡流 + 智能滚底 + 单句快捷交互”
1. 将 `#transcript` 的渲染从纯文本拼接升级为结构化气泡 DOM（同时保持极佳性能）：
   - 为每条 `S.transcriptLines` 渲染一个 `.chat-row` 容器，根据角色区分样式：
     - **`Others`（会场远端）**：`.chat-others`（左对齐，深蓝底色 `#0f172a`，左侧 `3px solid #22d3ee` 青色竖条，顶部显示 `👤 会场 [Others]` 与时间戳）。
     - **`Me`（本机麦）**：`.chat-me`（右对齐，深青绿底色 `#064e3b`，顶部显示 `🙋 我 [Me · 仅标定]`）。
     - **`Host`（大智 / AI 主席）**：`.chat-host`（左对齐高亮卡片，琥珀金边框 `rgba(245, 158, 11, 0.45)`，顶部显示 `🤖 大智 [Host]`，若文本含 `（合成中…）` 则显示脉冲呼吸徽标）。
   - 若存在流式中间结果 `S.partialAsr` 或 `S.partialAsrMe`，在列表最底部渲染 `.chat-partial` 虚线边框实时预览气泡（带闪烁光标动画）。
2. **单句悬浮快捷操作（Hover Actions）**：
   - 在每条 `.chat-others` 气泡右上角提供两个轻量悬停按钮：
     - `[⚡问AI]`：点击后将该句文本作为近窗焦点，调用 `window.bridge.strategyEvaluate({ transcript: "会场: " + line.text, agenda: $("agenda")?.value || "", reason: "push-ask", forceCopilot: true })`。
     - `[📌速记]`：点击后调用 `window.bridge.copilotJot({ text: line.text, meetingId: S.meetingIdUi || "live" })` 并刷新速记列表。
3. **智能贴底滚动（Auto-Scroll Lock）**：
   - 监听 `#transcript` 的 `scroll` 事件：判断 `el.scrollHeight - el.scrollTop - el.clientHeight < 60` 作为 `isNearBottom`。
   - 每次 `renderTranscript()` 后，若 `isNearBottom === true`，自动执行 `el.scrollTop = el.scrollHeight`；否则显示 `#scrollBottomBtn`（点击后滚到底部并隐藏按钮）。

---

## Task 2：重构 `desktop/renderer/ui/smartReplies.js` 为“三色语义卡片 + 1/2/3 数字键直达 + 证据胶囊”
1. **三向策略语义分色（Semantic Card Styling）**：
   - `push_forward`（Option A · 快速推进）：卡片带 `.sr-card-forward` 类（左侧 `4px solid #10b981` 翡翠绿，标题配 `🟢 [1] Option A · 快速赞同/推进`）。
   - `push_back`（Option B · 谨慎权衡/避坑）：卡片带 `.sr-card-back` 类（左侧 `4px solid #f59e0b` 琥珀橙；若内容或 `key_facts` 含 `否决` / `SUPERSEDED` 则自动附加 `.sr-card-danger` 绯红高亮脉冲边框 `#f43f5e`，标题配 `⚠️ [2] Option B · 谨慎权衡/避坑`）。
   - `counter_inquiry`（Option C · 澄清反问）：卡片带 `.sr-card-counter` 类（左侧 `4px solid #38bdf8` 天空蓝，标题配 `🔵 [3] Option C · 澄清反问/引导`）。
2. **两阶段状态徽标与证据胶囊（Evidence Pills）**：
   - 在 `#smartRepliesMeta` 栏使用彩色胶囊徽标展示：`[Urgency]`、`[Category]`、`[⚡ Prefetch 命中]`、以及阶段标志（`msg.refined ? "✨ 豆包 AI 已精炼" : "⚡ 毫秒级快照"`）。
   - 将 `msg.key_facts` 渲染为水平流式排列的 `.sr-fact-pill` 胶囊标签：
     - 含 `否决` 或 `SUPERSEDED` 的条目渲染为红色警示胶囊 `🚫 历史已否决：...`；
     - 含 `[CLAIM-` 或 `FAQ` 的条目渲染为翠绿/青色依据胶囊 `✅ ...`；
     - 含 `[Screen Context]` 的条目渲染为紫色视觉胶囊 `📸 ...`。
3. **全局键盘 `1` / `2` / `3` 秒复制快捷键**：
   - 在 `bindCopilotControls()` 中注册 ` document.addEventListener("keydown", ...)`：当 `document.activeElement` 不是 `<input>` 或 `<textarea>` 时，按下数字键 `1`、`2`、`3` 分别触发当前显示的 Option A、Option B、Option C 的复制逻辑，并对该卡片触发 300ms 高亮闪烁动画与 `showAlert("已通过快捷键 [1/2/3] 复制建议口径", "ok")`。

---

## Task 3：重构 `desktop/renderer/ui/meetingAid.js` 为“结构化参谋看板”
1. 升级 `renderCatchMeUp(msg)`：
   - 不再简单设置 `box.textContent = msg.digest`，而是利用 `msg` 中的结构化字段（`current_topic`, `disagreements`, `pending_decisions`, `wiki_facts`, `active_speakers`）渲染清晰的 HTML 看板卡片：
     - **🎯 当前焦点议题**：大字号高亮横幅。
     - **⚡ 核心分歧与风险（`disagreements`）**：红色左边框列表（无分歧时显示绿色“暂无明显分歧”）。
     - **📌 待拍板决策（`pending_decisions`）**：琥珀色左边框列表。
     - **📚 关联 Wiki 2.0 快照（`wiki_facts`）**：青色知识卡片。
     - **🗣️ 近窗活跃发言人（`active_speakers`）**：显示发言人名称与发言次数徽章。
   - 若收到 `msg.mermaid_diagram`，自动在架构图区域渲染并支持在参谋面板内预览。

---

## Verification (验收标准)
1. 会场转写气泡按 `Others` / `Me` / `Host` 清晰分色对齐，新消息自动滚底，单句悬停可点 `[⚡问AI]`。
2. 建议卡触发后呈现绿/橙(红)/蓝三色高对比卡片，按键盘 `1`、`2`、`3` 可直接复制对应话术。
3. 点击 `Catch Me Up` 渲染出结构化分块看板，不再是单调的纯文本。
````

---

### 📋 开发提示词四（UI 重构第三波）：Wave L — 悬浮胶囊（`capsule.html`）升级为“双态折叠隐身 HUD + 原生防录屏保护”

````markdown
# Role & Context
你正在重构悬浮胶囊窗口 `desktop/renderer/capsule.html`、`desktop/renderer/capsule.js` 及主进程窗口管理 `desktop/main.cjs`。
目标是让用户在正式开会隐藏主控台窗口后，**仅靠右上角的悬浮胶囊 HUD 即可完成所有核心参谋交互，且在腾讯会议共享桌面时对远端参会人完全隐身**。

---

## Task 1：在 `desktop/main.cjs` 与 `preload.cjs` 中增加胶囊尺寸切换与原生防录屏隐身支持
1. 打开 `desktop/main.cjs`：
   - 在 `createWindow()` 与 `createCapsuleWindow()` 中，默认开启 Electron 原生防录屏抓取：
     ```js
     if (process.env.STEALTH_PROTECT !== "0") {
       try { win.setContentProtection(true); } catch (_) {}
     }
     ```
     （对 `capsuleWin` 同样调用 `capsuleWin.setContentProtection(true)`）。
   - 在 `registerWindowChromeIpc()` 中新增两个 IPC 处理器：
     - `ipcMain.handle("window:setStealthProtect", async (_e, on) => ...)`：同时对 `win` 和 `capsuleWin` 设置 `setContentProtection(Boolean(on))`。
     - `ipcMain.handle("capsule:setCollapsed", async (_e, collapsed) => ...)`：当 `collapsed === true`（Mini-Pill 极简条模式）时，调用 `capsuleWin.setContentSize(420, 56)`；当 `collapsed === false`（展开 HUD 模式）时，调用 `capsuleWin.setContentSize(440, 420)`。
2. 在 `desktop/preload.cjs` 的 `window.bridge` 中暴露：
   - `setStealthProtect: (on) => ipcRenderer.invoke("window:setStealthProtect", on)`
   - `setCapsuleCollapsed: (collapsed) => ipcRenderer.invoke("capsule:setCollapsed", collapsed)`

---

## Task 2：重构 `desktop/renderer/capsule.html` 与 `capsule.js` 为“双态折叠全功能 HUD”
1. **顶部多功能迷你导航栏（`.hud-topbar`，常驻可见，高 40px）**：
   - **左侧**：状态呼吸灯（绿=听会中，橙=播报中，灰=待命）+ `DAZHI HUD` + `#meta`（当前模式/紧急度徽标）。
   - **右侧快捷动作组（`-webkit-app-region: no-drag`）**：
     - `<button id="capModeBtn" title="切换 Auto/Manual (Alt+Shift+Z)">Auto</button>`
     - `<button id="capAskBtn" class="accent" title="立即出卡 (Alt+Z)">⚡问AI</button>`
     - `<button id="capRecapBtn" title="近5分钟速览">📋速览</button>`
     - `<button id="capCollapseBtn" title="折叠为迷你条 / 展开">▴</button>`
     - `<button id="btnHide" title="隐藏 (Ctrl+Shift+H)">✕</button>`
2. **Mini-Pill 极简折叠态（当 `collapsed === true` 时）**：
   - 隐藏 `#cards` 与 `#recapDrawer`，仅保留顶部 `.hud-topbar` 和单行实时字幕条 `#live`（总高控制在 56px 内），像歌词悬浮条一样轻巧贴在屏幕顶部。
   - **智能自动展开**：当处于折叠态且收到 `msg.type === "smart-replies"` 且 `msg.should_trigger === true` 时，自动调用 `setCapsuleCollapsed(false)` 展开面板展示 Option A/B/C 卡片！
3. **展开态三色卡片 + Deep Dive 折叠抽屉 + 证据徽标**：
   - 在 `#cards` 中按绿（Option A）、橙/红（Option B）、蓝（Option C）渲染三张建议卡，字号优化为 `14px` 高对比度粗体，支持点击卡片正文直接复制（并显示 `✓ 已复制` 反馈），右侧保留 `[🔊试播]` 按钮。
   - 若 `msg.deep_dive` 存在，在卡片下方渲染 `<details class="cap-dive"><summary>▸ Deep Dive 口述支撑</summary><p>...</p></details>`。
   - 若 `msg.key_facts` 存在，渲染紧凑型红/绿证据胶囊标签（优先高亮 `历史已否决` 避坑项）。
   - 点击 `#capRecapBtn` 时，直接读取胶囊内缓存的最近转写行调用 `window.bridge.copilotCatchMeUp`，在胶囊内展示精简版速览摘要。

---

## Verification (验收标准)
1. 胶囊窗可通过 `▴/▾` 按钮在 `420×56`（迷你字幕条）与 `440×420`（完整 HUD 卡片）之间平滑切换。
2. 在胶囊窗内直接点击 `[⚡问AI]`、`[📋速览]`、`[Auto]` 均可独立工作，无需打开主控台窗口。
3. 开启防录屏保护后，使用截图/屏幕共享工具捕获桌面时，副驾驶窗口自动隐身不被抓取。
````