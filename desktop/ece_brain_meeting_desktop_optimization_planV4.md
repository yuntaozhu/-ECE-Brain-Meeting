# -ECE-Brain-Meeting 源码深度审计报告、完善升级方案与下一阶段开发提示词（Wave G ~ Wave I）

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

## 二、源码级深度诊断：发现的 10 个核心 Bug、断层与架构隐患

以下是精确到**文件路径与代码行号**的深度代码审计发现，按严重程度排序：

### 🔴 P0 级（破坏门禁 / 逻辑错误 / 数据丢失，必须优先修复）

#### 1. `npm run test:lint:hardcode` 门禁报错失败（违反 `.cursorrules` 零硬编码红线）
* **问题位置**：`desktop/lib/copilot/recap.cjs`（第 7–12 行）
* **沙箱实测输出**：
  ```text
  $ node test/no-hardcode-lint.cjs
  [no-hardcode-lint] FAIL
    - new file lib/copilot/recap.cjs has 2 banned literals
  ```
* **根因分析**：`test/no-hardcode-lint.cjs` 严格拦截 `lib/**/*.cjs` 中的业务/口令禁词（如 `"收费"`、`"问题"`、`"园所"` 等）。而 `lib/copilot/recap.cjs` 第 8 行硬编码了 `/...有问题/`（含禁词 `"问题"`），第 12 行硬编码了 `/...收费.../`（含禁词 `"收费"`）。此外，`lib/copilot/mermaidHint.cjs`（第 4–6 行）与 `lib/wiki2/ingest.cjs`（第 79–118 行）也在 `.cjs` 中直接硬编码了中文业务/技术正则。
* **完善方案**：将 `recap.cjs`、`mermaidHint.cjs` 中的正则全部迁入 `desktop/knowledge/schema/copilot-gate.json` 的 `patterns` 字段，通过 `schemaStore.rx("copilot", ...)` 调用，确保 `node test/no-hardcode-lint.cjs` 零错误通过。

#### 2. `lib/wiki2/retrieve.cjs` 零分强行兜底 Bug + 业务知识库与 Wiki 2.0 割裂
* **问题位置**：`desktop/lib/wiki2/retrieve.cjs`（第 43–45 行）
* **问题代码**：
  ```javascript
  const topK = Number(opts.topK) || 3;
  let top = scored.filter((s) => s.score > 0).slice(0, topK);
  if (!top.length) top = scored.slice(0, Math.min(1, scored.length)).filter((s) => s.page);
  ```
* **根因分析**：
  1. 当会场提问**完全未命中** `knowledge_wiki/` 中的任何词条（所有页面 `score === 0`）时，第 45 行竟然强行取 `scored[0]`（即第一篇研发决策页 `audio-dual-track.md`）作为命中结果返回！这导致园长在会场问业务问题时，副驾驶的 `key_facts` 里会莫名其妙塞入音频内录/VAD 的研发红线。
  2. 目前 `desktop/knowledge/wiki/concepts/` 下有 19 篇“全园美语 / 三笔账 / 八大权益 / 收益保障”核心业务 Wiki 页（包含 `## 口播`、`## 事实`、`## 边界`），而新建的 `desktop/knowledge_wiki/wiki/` 下只有 4 篇研发架构页。会中 `prefetch.cjs` 调用 `buildWiki2Evidence` 时查不到任何“全园美语”的 `## 边界`（禁止承诺事项）。
* **完善方案**：
  1. 删除 `lib/wiki2/retrieve.cjs` 第 45 行的 0 分强行兜底逻辑（无 `score > 0` 命中时直接返回空结果 `hits: [], evidence: [], preview: ""`）。
  2. 新增桥接编译脚本 `scripts/wiki2-sync-domain.cjs`，将 `desktop/knowledge/wiki/concepts/*.md` 自动映射编译为 `knowledge_wiki/wiki/entities/biz_*.md`（其中原 `## 口播` 映射为 `[1] AI-First Snapshot`，原 `## 事实` 映射为 `[2] Active Claims`，原 `## 边界` 中的“禁止承诺/误区口径”映射为 `[3] Superseded & Failure Paths`！），让业务会议的“边界红线”直接触发副驾驶的 `push_back` 避坑提醒。

#### 3. `lib/wiki2/compileLlm.cjs` 落盘时把豆包 LLM 编译结果丢弃覆盖回规则版
* **问题位置**：`desktop/lib/wiki2/compileLlm.cjs`（第 95–114 行）
* **问题代码**：
  ```javascript
  // 落盘：复用规则版写文件结构
  const written = ingestEpisode(
    {
      ...input,
      episodeId: rule.episode_id,
      transcript: input.transcript
    },
    { dry: opts.dry }
  );
  ```
* **根因分析**：`ingestEpisodeLlm` 调用豆包 `llmChat` 拿到了代词消解后的 `parsed.contextual_chunks` 和高精度 `parsed.extracted_claims`，但在写磁盘文件 `raw/episodes/${episodeId}.md` 时，又重新调了一次 `ingestEpisode(input)`，而 `ingestEpisode` 内部只跑正则规则！结果写进 `.md` 文件里的仍然是规则版粗糙内容，LLM 的编译产物只存在于内存返回对象中，未真正持久化到磁盘。
* **完善方案**：在 `lib/wiki2/ingest.cjs` 的 `ingestEpisode(input, opts)` 中支持传入 `opts.precompiled = { contextual_chunks, extracted_claims }`；当 `compileLlm.cjs` 获得 LLM 解析结果时，将 `precompiled` 传给 `ingestEpisode` 落盘。

#### 4. `lib/copilot/prefetch.cjs` “假预热”问题：未挂接流式 ASR Partial 事件，且计时器恒为 0
* **问题位置**：`desktop/lib/copilot/prefetch.cjs`（第 83–108 行）与 `desktop/lib/copilot/suggest.cjs`（第 41–44 行、第 79 行）
* **根因分析**：
  1. 目前 `noteOthersForPrefetch(transcript)` **只在 `buildCopilotPacket` 内部被调用**（即句话已说完、进入 `strategy:evaluate` 时），随后在同一函数第 79 行立刻调 `takePrefetch(segment)`。这意味着检索发生在句尾同步阻塞路径上，根本没有在对方说话中途（ASR `final: false` 增量识别阶段）后台预热。
  2. 更严重的是，因为只有句尾才调一次 `noteOthersForPrefetch`，若两次发言间隔 > 8 秒，`state.startedAt = now`，紧接着第 95 行 `const speakingMs = now - state.startedAt` 算出来永远是 `0`！导致第 99 行 `if (speakingMs < minMs && !gate.should_trigger)` 永远返回 `too_early`，非直接问句的长难句预检索 100% 失效。
* **完善方案**：
  1. 在 `main/listenSession.cjs` 的 `ensureHostAsr` 回调中（第 672 行附近），当收到 `Others` 通道的流式中间结果（`!final && text.length >= 8`）时，异步节流调用 `noteOthersForPrefetch(text)`，真正实现“对方还在讲前半句，后台已把 FAQ 与 Wiki2 Snapshot 预热进内存缓存”。
  2. 修复 `prefetch.cjs` 中的 `speakingMs` 跟踪逻辑：在语音流开始（或首次 partial 到达）时记录 `startedAt`，仅在 `final` 定稿或超过 `resetGapMs` 时重置。

---

### 🟠 P1 级（影响打包发布、检索准度与建议卡质量的核心升级点）

#### 5. `lib/wiki2/buildIndex.cjs` 中文分词缺陷与 `reconcile.cjs` 丢失历史时间戳 / 非原子写入
* **问题位置**：`desktop/lib/wiki2/buildIndex.cjs`（第 21–26 行）与 `desktop/lib/wiki2/reconcile.cjs`（第 67–98 行）
* **根因分析**：
  1. `buildIndex.cjs` 的 `tokenize(text)` 使用 `s.match(/[\u4e00-\u9fff]{2,}/g)`，这会把一整句没有标点的中文（例如 `"桌面端双通道音频采集"`）切成**唯一一个长达 9 个字的长 Token**，用户搜 `"音频采集"` 时在 `tfMap[q]` 中完全无法命中！而项目已经内置了 `@node-rs/jieba` 及 `lib/knowledge/wiki/query.cjs` 的 `2~4 字 CJK n-gram` 切词逻辑。
  2. `reconcile.cjs` 第 69 行在将旧 Claim 移入 `Superseded` 时写死了 ``- `valid_from`: unknown``，丢失了该条目原本的生效时间；且第 97 行直接使用 `fs.writeFileSync(abs, nextMd)` 覆盖原文件，若并发读取会读到半截文件。
* **完善方案**：
  1. 升级 `lib/wiki2/buildIndex.cjs` 的 `tokenize`：结合 `@node-rs/jieba`（或 `2~4 字 CJK Bi-gram/Tri-gram` + 整词），并在 `retrieve.cjs` 中引入 **RRF（倒数排序融合）** 结合 BM25、标题/别名匹配与 1-Hop 图关联度。
  2. 修复 `reconcile.cjs`：从原 Claim 文本块中提取并保留原 `valid_from`，写入时先写 `${abs}.tmp` 再 `fs.renameSync` 原子替换。

#### 6. Electron 打包配置（`package.json` & `appPaths.cjs`）遗漏 `knowledge_wiki` 与 `dev_knowledge/glossary`
* **问题位置**：`desktop/package.json`（第 69–88 行）与 `desktop/lib/wiki2/paths.cjs`、`desktop/lib/asr/glossaryCorrect.cjs`
* **根因分析**：`package.json` 的 `extraResources` 只打包了 `knowledge` 目录。打包成安装包（`app.isPackaged === true`）后：
  1. `knowledge_wiki` 与 `dev_knowledge/glossary/project_terms.json` 不在 `resources/` 下，且代码里用 `path.join(__dirname, "..", "..", "knowledge_wiki")` 指向了只读的 `app.asar` 内部，运行态一旦触发 `wiki2:ingest` 或 `jot` 写入就会因 `app.asar` 只读而崩溃！
* **完善方案**：
  1. 在 `lib/platform/appPaths.cjs` 中统一封装 `wiki2ReadRoot()`、`wiki2WriteRoot()`、`devKnowledgeReadRoot()` 与 `sessionLogsWriteDir()`（安装包模式下读 `process.resourcesPath`，写 `app.getPath("userData")`）。
  2. 在 `desktop/package.json` 的 `build.extraResources` 中补充 `knowledge_wiki` 与 `dev_knowledge/glossary`。

#### 7. 副驾驶建议卡（`suggest.cjs` / `deepDive.cjs`）纯静态模板截断生硬，缺异步 LLM 精炼升级
* **问题位置**：`desktop/lib/copilot/suggest.cjs`（第 110–131 行）
* **根因分析**：
  1. `clip(s, 60)` 在第 60 个字符处硬切并加 `…`，经常把一句话切在半截（如 `"…外校园价四万…"`）。
  2. 当环境变量配齐了豆包 `ARK_API_KEY` 时，建议卡仍然只输出死板的固定句式（`"关于{topic}，我建议先确认边界与代价，再拍板。"`），没有利用大模型结合 Wiki2 Evidence 生成真正贴合语境的三向应答。
* **完善方案**：
  1. 实现 **`smartClip(text, maxChars)`**：优先在句号、分号、逗号处断句，避免截出半截残词。
  2. 实现 **“两阶段渐进式建议卡（Instant Template + Optional Async LLM Refine）”**：第 1 阶段（1ms 内）立即推送规则 + Wiki2 快照生成的 `smart-replies`；若开启 `COPILOT_LLM_REFINE=1`（或 `auto` 且有 Key），后台异步调用极速模型流式生成 JSON 建议卡并推送更新事件（且当新一轮语音到来时通过 `AbortController` 自动取消旧请求）。

---

### 🟡 P2 级（体验打磨：音频首字防吞、防录屏隐身与会话 ID 贯通）

#### 8. `lib/asr/vadGate.cjs` 缺少 Pre-roll 预卷环形缓冲（易吞句首第一个字）
* **问题位置**：`desktop/lib/asr/vadGate.cjs`（第 75–105 行）
* **根因分析**：当 `inSpeech === false` 时，低于 `rmsSpeech` 阈值的帧被直接丢弃。真人开始说话的前 100~200ms（辅音或起音阶段）能量往往低于阈值，等 `rms >= rmsSpeech` 才开始 `chunks.push(samples)`，会导致录下来的 WAV 开头被削掉半个字（如“大智你好”变成“智你好”）。
* **完善方案**：在 `vadGate.cjs` 中维护一个固定容量为 3 帧（约 240ms）的 `preRollBuffer` 队列；当 `inSpeech` 从 `false` 变为 `true` 的瞬间，将 `preRollBuffer` 中的前置帧一并推入 `chunks`，彻底消除本地 Whisper 吞首字现象。

#### 9. `renderer/ui/meetingAid.js` 硬编码 `meetingId: "live"` & 会末未自动沉淀 Wiki 2.0
* **问题位置**：`desktop/renderer/ui/meetingAid.js`（第 47、71、86 行）与 `desktop/main.cjs`（第 402 行）
* **完善方案**：前端 `meetingAid.js` 改为读取 `S.meetingIdUi || "live"`；`main.cjs` 在 `listen:stop` 时若 `WIKI2_PROMOTE_ON_STOP=1` 则异步调用 `promoteSessionToWiki2({ meetingId: mid, apply: false })` 自动生成本场会议的 Wiki 2.0 Episode。

#### 10. 悬浮胶囊与主窗口缺少 Electron 原生防录屏隐身（`setContentProtection`）及胶囊快捷操作栏
* **问题位置**：`desktop/main.cjs`（第 118、134 行）与 `desktop/renderer/capsule.{html,js}`
* **完善方案**：在 `main.cjs` 中支持 `win.setContentProtection(true)` 与 `capsuleWin.setContentProtection(true)`（可通过 IPC `window:setStealthProtect` 或环境变量开启，防止腾讯会议“共享整个桌面”时把副驾驶建议卡拍进直播画面）；并在 `capsule.html` 顶部增加 `[问AI]`、`[速览]`、`[Auto/Manual]` 按钮及 Deep Dive 折叠区。

---

## 三、可直接执行的下一阶段开发提示词（Markdown 格式，复制给 Cursor / Claude Code 即可执行）

以下提供 **3 个分波次（Wave G / Wave H / Wave I）的标准化工程开发提示词**。每条提示词均严格遵循你仓库中的 `desktop/.cursorrules` 与 `.cursor/rules/*.mdc` 架构宪法。

---

### 📋 开发提示词一：Wave G — 修复门禁、修复 Wiki2 检索与 LLM 落盘 Bug、打通业务知识库（P0 必做）

> **状态（2026-11-01）**：Wave G 已落地。Wave H（partial 预热 / VAD 预卷 / 打包路径）已落地（`smoke:wave-h`）。UI 见 V5UI（J/K/L）。

````markdown
# Role & Context
你正在维护 `desktop/`（`ece-brain-meeting-bridge`，CommonJS）。请严格遵守 `desktop/.cursorrules` 与 `.cursor/rules/desktop-architecture.mdc`：
1. **绝对红线**：禁止修改 `decideSpeak` 责任链与仓库根目录的 React 示例；`desktop/lib/**/*.cjs` 严禁新增硬编码业务词或字面量正则，改完必须跑通 `node test/no-hardcode-lint.cjs`。
2. **目标**：执行 **Wave G（P0 缺陷清零与业务 Wiki 2.0 贯通）**，修复当前代码中发现的 4 个核心缺陷。

---

## Task 1：修复 `no-hardcode-lint.cjs` 门禁失败（移除 `lib/copilot` 与 `lib/wiki2` 中的硬编码正则）
1. 打开 `desktop/knowledge/schema/copilot-gate.json`，在 `"patterns"` 下新增以下配置项：
   - `"recapDisagree"`: `"((不同意|反对|有分歧|争议|不行|不对|质疑|风险|担心|但是|不过|我反对|存疑|有顾虑))"`（注意：严禁包含 `no-hardcode-lint.cjs` 禁用词表中的 `"问题"`、`"收费"` 等字面量！）
   - `"recapDecision"`: `"((拍板|决定|定下来|要不要|是否采用|确认一下|下一步|待定|谁负责|截止日期|DDL))"`
   - `"recapTopic"`: `"((方案|架构|接口|价格|预算|排期|上线|ASR|TTS|Whisper|双通道|副驾驶|FAQ|知识库))"`
   - `"mermaidArch"`: `"((架构|微服务|调用链|状态机|流水线|双通道|ASR|TTS|Whisper|VAD|decideSpeak|IPC|主进程|渲染))"`
   - `"mermaidFlow"`: `"((流转|流程|状态转移|从.+到|先.+再))"`
2. 修改 `desktop/lib/copilot/recap.cjs`：
   - 删除顶部硬编码的 `DISAGREE_RE`、`DECISION_RE`、`TOPIC_RE` 常量。
   - 改为通过 `const { schemaStore } = require("../knowledge");` 使用 `schemaStore.rx("copilot", "recapDisagree")`、`schemaStore.rx("copilot", "recapDecision")`、`schemaStore.rx("copilot", "recapTopic")` 进行匹配。
3. 修改 `desktop/lib/copilot/mermaidHint.cjs`：
   - 同样改用 `schemaStore.rx("copilot", "mermaidArch")` 与 `schemaStore.rx("copilot", "mermaidFlow")`。
4. 运行 `node test/no-hardcode-lint.cjs`，确保输出 `[no-hardcode-lint] ok` 且零报错。

---

## Task 2：修复 `lib/wiki2/retrieve.cjs` 0 分强行兜底 Bug，并升级中文切词与 RRF 融合排序
1. 打开 `desktop/lib/wiki2/buildIndex.cjs`：
   - 升级 `tokenize(text)` 函数：除保留原有英文/数字词（`/[a-z0-9_]{2,}/g`）外，对中文字符（`[\u4e00-\u9fff]+`）同时生成 **2~4 字滑动 N-gram 词片**（参考 `lib/knowledge/wiki/query.cjs` 的 `queryTokens` 实现），解决长句中文无标点时整句变成单一 Token 无法命中的问题。
2. 打开 `desktop/lib/wiki2/retrieve.cjs`：
   - **修复 0 分兜底 Bug**：删除第 45 行的 `if (!top.length) top = scored.slice(0, Math.min(1, scored.length)).filter((s) => s.page);`！当 `scored.filter((s) => s.score > 0)` 为空时，直接返回 `{ hits: [], evidence: [], preview: "", ms: Date.now() - t0, mode: "wiki2-empty", page_count: pages.length }`，严禁在未命中时强行返回第 1 篇无关的研发文档。
   - **优化排序**：对 `status === "draft"` 的主题草稿页乘以 `0.7` 权重系数，优先展示 `status === "active"` 的正式决策与实体页。

---

## Task 3：修复 `lib/wiki2/compileLlm.cjs` 落盘丢失 LLM 编译结果 Bug + `reconcile.cjs` 原子写保护
1. 打开 `desktop/lib/wiki2/ingest.cjs`：
   - 在 `ingestEpisode(input, opts = {})` 中支持传入 `opts.precompiled`（形如 `{ contextual_chunks, extracted_claims }`）。当 `opts.precompiled` 存在时，优先使用 `opts.precompiled.contextual_chunks` 和 `opts.precompiled.extracted_claims` 生成 Markdown 并写入 `raw/episodes/${episodeId}.md`。
2. 打开 `desktop/lib/wiki2/compileLlm.cjs`：
   - 在第 95 行落盘调用 `ingestEpisode` 时，传入 `{ dry: opts.dry, precompiled: { contextual_chunks: merged.contextual_chunks, extracted_claims: merged.extracted_claims } }`，确保豆包大模型编译出的代词消解切片与原子断言真正写入磁盘 `.md` 文件。
3. 打开 `desktop/lib/wiki2/reconcile.cjs`：
   - 在将旧 Claim 移入 `Superseded` 时，从原 Claim 文本块正则提取其原有的 `valid_from` 值（若提取不到再回退 `unknown`），避免丢失历史生效时间。
   - 将 `fs.writeFileSync(abs, nextMd, "utf8")` 升级为原子写入：先写入 `${abs}.tmp`，再调用 `fs.renameSync(`${abs}.tmp`, abs)`。

---

## Task 4：打通业务知识库（`knowledge/wiki/concepts` → `knowledge_wiki` 桥接同步）
1. 新建脚本 `desktop/scripts/wiki2-sync-domain.cjs`（并在 `desktop/package.json` 新增 `"wiki2:sync-domain": "node scripts/wiki2-sync-domain.cjs"`）：
   - 读取 `desktop/knowledge/wiki/concepts/*.md` 下的 19 篇业务概念页（使用 `lib/knowledge/wiki/parse.cjs` 的 `parseConceptMarkdown` 解析出 `title`、`speak`、`facts`、`bounds`、`related`、`aliases`）。
   - 将每篇业务概念页转换为四段式 AI-First 格式写入 `desktop/knowledge_wiki/wiki/entities/biz_${slug}.md`：
     - `## [1] AI-First Snapshot`：填入 `- **当前生效结论**：${speak}` 与 `- **核心红线**：${bounds 的第一句核心限制}`。
     - `## [2] Active Claims`：将 `facts` 按行拆分为 `[CLAIM-01]`、`[CLAIM-02]`。
     - `## [3] Superseded & Failure Paths`：从 `bounds` 中提取包含“禁止 / 不得 / 不要 / 并非 / 严禁”的误区表述，转化为 `~~**[SUPERSEDED-01]** 误区表述~~` 及 `reason_for_rejection: 违反业务边界规范（见 knowledge/wiki/concepts/${slug}.md）`。
   - 同步完成后自动调用 `buildWiki2Index()` 重建图索引。

---

## Verification (验收命令)
依次在 `desktop/` 下执行以下命令，必须全部通过：
1. `node test/no-hardcode-lint.cjs`
2. `node scripts/wiki2-sync-domain.cjs`
3. `node scripts/smoke-copilot-gate.cjs`
4. `node scripts/smoke-wave-e.cjs && node scripts/smoke-wave-f.cjs`
````

---

### 📋 开发提示词二：Wave H — 实时流式真预热（True Speculative Prefetch）、VAD 防吞字缓冲与打包路径加固（P1 级）

````markdown
# Role & Context
你正在维护 `desktop/`（`ece-brain-meeting-bridge`，CommonJS）。请严格遵守 `desktop/.cursorrules`：不改 `decideSpeak` 责任链，不引入硬编码禁词。
本次任务为 **Wave H：打通 ASR 流式 Partial 真预热、VAD 预卷防吞首字、以及 Electron 安装包路径兼容**。

---

## Task 1：打通 ASR Partial 流式真预热（修复 `prefetch.cjs` 假预热与计时器恒为 0 Bug）
1. 修改 `desktop/lib/copilot/prefetch.cjs`：
   - 修复 `noteOthersForPrefetch(transcriptOrText, opts = {})`：
     - 当 `state.startedAt === 0` 或 `now - state.lastAt > resetGap` 时，设置 `state.startedAt = now - 500`（给予初始开口步进）。
     - 新增导出函数 `onOthersPartialAsr(partialText)`：带 600ms 最小节流间隔（避免每个 WebSocket 分片都跑检索），当 `Others` 正在说话（`partialText.length >= 8`）且命中 `shouldPrefetch` 或时间超过 `minSpeakingMs` 时，立即在后台调用 `runPrefetch(partialText)` 将 FAQ、RAG 与 `buildWiki2Evidence` 写入 `state.cache`！
2. 修改 `desktop/main/listenSession.cjs`：
   - 引入 `const { onOthersPartialAsr } = require("../lib/copilot/prefetch.cjs");`。
   - 在 `ensureHostAsr` 的 `onResult({ text, final })` 回调中（以及 `emitDialogAsr` 中），当 `!final && !this.isInBargeWindow()` 时，调用 `try { onOthersPartialAsr(text); } catch (_) {}`。
   - 这样当远端参会人还在说话中途时，主进程已经把知识块预热进 `state.cache`；等话音刚落触发 `strategy:evaluate` -> `buildCopilotPacket` -> `takePrefetch` 时，真正实现 **0ms 命中预热缓存**。

---

## Task 2：为 `lib/asr/vadGate.cjs` 增加 Pre-roll 预卷环形缓冲（根治本地 Whisper 吞首字）
1. 打开 `desktop/lib/asr/vadGate.cjs`：
   - 在 `createVadGate(opts = {})` 中新增配置 `const preRollMs = opts.preRollMs ?? envInt("VAD_PREROLL_MS", 240);`。
   - 维护一个 `preRollChunks = []` 和 `preRollMsAcc = 0`（在 `inSpeech === false` 且 `!isSpeech` 时，将最近的静音/弱音帧保存在 `preRollChunks` 队列中，超出 `preRollMs` 时 `shift()` 丢弃最老帧）。
   - 当 `isSpeech === true` 且此前 `inSpeech === false`（即刚刚检测到开口说话的瞬间）时，先将 `preRollChunks` 中的所有帧依次并入 `chunks`，再推入当前帧，随后清空 `preRollChunks`。
   - 在 `reset()` 中同步清空 `preRollChunks` 与 `preRollMsAcc`。
2. 运行 `node scripts/smoke-wave-a.cjs` 确保现有 VAD 冒烟测试兼容通过。

---

## Task 3：修复 Electron 打包（`isPackagedApp`）下的 `knowledge_wiki` 与 `dev_knowledge` 读写路径
1. 打开 `desktop/lib/platform/appPaths.cjs`：
   - 新增并导出 `wiki2ReadRoot()`、`wiki2WriteRoot()`、`devKnowledgeReadRoot()`、`sessionLogsWriteDir()`：
     - 开发态（`!isPackagedApp()`）：指向 `desktop/knowledge_wiki` 与 `desktop/dev_knowledge`。
     - 安装包态（`isPackagedApp()`）：只读目录指向 `path.join(process.resourcesPath, "knowledge_wiki")` 与 `path.join(process.resourcesPath, "dev_knowledge")`；可写目录（如 `episodes/`、`changelog/`、`.graph_index/`、`session_logs/`）指向 `path.join(app.getPath("userData"), "knowledge_wiki")` 与 `path.join(app.getPath("userData"), "dev_knowledge/session_logs")`（若 `userData` 下尚无初始 wiki 页面，首次启动自动从 `resources/knowledge_wiki/wiki` 拷贝种子文件）。
2. 更新 `desktop/lib/wiki2/paths.cjs`、`desktop/lib/copilot/jot.cjs` 与 `desktop/lib/asr/glossaryCorrect.cjs`，统一使用 `appPaths.cjs` 提供的路径函数，杜绝打包后向 `app.asar` 内部写文件报错。
3. 打开 `desktop/package.json`，在 `build.extraResources` 中补充：
   ```json
   {
     "from": "knowledge_wiki",
     "to": "knowledge_wiki",
     "filter": ["**/*", "**/.*", "**/.graph_index/**"]
   },
   {
     "from": "dev_knowledge/glossary",
     "to": "dev_knowledge/glossary",
     "filter": ["**/*"]
   }
   ```

---

## Verification (验收命令)
依次在 `desktop/` 下执行：
1. `node test/no-hardcode-lint.cjs`
2. `node scripts/smoke-wave-a.cjs && node scripts/smoke-wave-b.cjs && node scripts/smoke-wave-e.cjs`
````

---

### 📋 开发提示词三：Wave I — 两阶段渐进式 LLM 建议卡精炼、原生防录屏隐身与胶囊快捷栏升级（P2 级）

````markdown
# Role & Context
你正在维护 `desktop/`（`ece-brain-meeting-bridge`）。请遵守 `desktop/.cursorrules`：副驾驶所有增强均在 `lib/copilot` 与 `renderer/` 旁路完成，绝对不触碰 `decideSpeak` 口播责任链。
本次任务为 **Wave I：智能断句与两阶段异步 LLM 建议卡精炼、Electron 原生防录屏隐身（Stealth Capture Protection）、以及悬浮胶囊全功能化**。

---

## Task 1：智能句子边界截断 + 两阶段异步 LLM 建议卡精炼（`lib/copilot/suggest.cjs`）
1. 在 `desktop/lib/copilot/suggest.cjs` 中将硬截断函数 `clip(s, n)` 升级为 `smartClip(s, n)`：
   - 当文本长度 `> n` 时，优先在 `[Math.floor(n * 0.65), n]` 区间内寻找最后一个句末或分句标点（`。！？；，、,.;!?`）进行优雅截断；仅当区间内无标点时才截断并补 `…`，彻底消除半截残词。
2. 新增可选的第二阶段异步 LLM 精炼函数 `refineCopilotPacketAsync(packet, opts = {})`：
   - 受环境变量 `COPILOT_LLM_REFINE=1|auto` 控制（默认 `0` 或在 `force: true` 即手动 `Alt+Z` Push-to-Ask 时自动开启，兼顾零成本与高质量）。
   - 调用 `lib/meetingStrategy/llm/transport.cjs` 的 `llmChat`，传入 `[Wiki Knowledge Evidence]`（含 `Active Claims` 与 `Superseded` 避坑原因）、`[FAQ Match]`、`[Screen Context]` 与最近对话窗口，要求模型以第一人称输出严格 JSON：`{ "push_forward": "...", "push_back": "...", "counter_inquiry": "...", "deep_dive": { "thesis": "...", "bullets": ["..."], "speak_script": "..." } }`。
   - 在 `main/strategyEvaluate.cjs` 中：第 1 阶段先同步广播毫秒级模板 `smart-replies`；若开启了异步精炼（或用户按了 `Alt+Z`），后台执行 `refineCopilotPacketAsync`（绑定独立的 `AbortController`，新巡检到来时自动 abort 旧请求），返回后广播 `{ type: "smart-replies", ...refinedPacket, refined: true }` 无缝刷新卡片。

---

## Task 2：接入 Electron 原生防共享屏幕窥视 API（`setContentProtection`）與 `meetingId` 贯通
1. 打开 `desktop/main.cjs`：
   - 在 `createWindow()` 和 `createCapsuleWindow()` 中，默认根据 `process.env.STEALTH_PROTECT !== "0"` 调用 `win.setContentProtection(true)` 与 `capsuleWin.setContentProtection(true)`（Windows 10/11 WDA_EXCLUDEFROMCAPTURE 与 macOS NSWindowSharingNone 原生支持，使腾讯会议/Zoom“共享整个桌面”时完全拍不到副驾驶窗口）。
   - 在 `registerWindowChromeIpc()` 中新增 `ipcMain.handle("window:setContentProtection", async (_e, on) => ...)`，并在 `preload.cjs` 暴露 `setContentProtection: (on) => ipcRenderer.invoke("window:setContentProtection", on)`，在主界面 `index.html` 的 `.win-controls` 增加勾选框 `<label><input id="winStealthProtect" type="checkbox" checked /> 防共享屏幕抓取</label>`。
   - 在 `listen:stop` 处理函数中，若 `process.env.WIKI2_PROMOTE_ON_STOP === "1"`，异步调用 `promoteSessionToWiki2({ meetingId: mid, apply: false })` 自动归档本场 Wiki2 Episode。
2. 打开 `desktop/renderer/ui/meetingAid.js`：
   - 将第 47、71、86 行硬编码的 `meetingId: "live"` 全部改为 `meetingId: S.meetingIdUi || "live"`，确保每场会议的 Quick Jot 按真实场次 ID 独立归档。

---

## Task 3：升级悬浮胶囊 `renderer/capsule.html` 与 `capsule.js` 交互体验
1. 打开 `desktop/renderer/capsule.html` 与 `capsule.js`：
   - 在顶部 `.actions` 栏增加三个迷你胶囊按钮：
     - `[⚡问AI]`（点击触发 `window.bridge.copilotPushAsk({ reason: "capsule-ask" })`，等同 `Alt+Z`）
     - `[📋速览]`（点击触发 Catch Me Up 并在胶囊底部折叠面板显示 3 行核心摘要）
     - `[Auto/Manual]`（点击切换 `copilotSetMode` 并实时显示当前模式徽标）
   - 当 `smart-replies` 包含 `deep_dive` 时，在胶囊卡片下方渲染一个可折叠的 `<details><summary>展开可口述支撑 (Deep Dive)</summary>...</details>`，让用户无需切回主窗口即可在胶囊内完成全部会中操作。

---

## Verification (验收命令)
依次在 `desktop/` 下执行：
1. `node test/no-hardcode-lint.cjs`
2. `node scripts/smoke-copilot-gate.cjs`
3. `node scripts/smoke-wave-a.cjs && node scripts/smoke-wave-b.cjs && node scripts/smoke-wave-c.cjs && node scripts/smoke-wave-d.cjs && node scripts/smoke-wave-e.cjs && node scripts/smoke-wave-f.cjs`
````