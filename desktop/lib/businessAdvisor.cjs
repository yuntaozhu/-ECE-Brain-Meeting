/**
 * 经营顾问 Agent：L2 RAG+LLM / L3 Deep Thinking
 * P0：默认走 LLM、拉长超时、本轮诊断、防复读不锁 rescue
 * P1：tier 分流 + Deep 模型
 */
const { debugLog } = require("./debugLog.cjs");
const { retrieveSemantic } = require("./semanticRag.cjs");
const { normalizeDazhiAliases } = require("./agentMode.cjs");
const { stripIntroBoilerplate } = require("./duplexPolicy.cjs");
const { classifyAnswerTier } = require("./queryRewrite.cjs");
const { sinkAdvisorAnswer } = require("./knowledgeSink.cjs");

function apiKey() {
  return (process.env.DOUBAO_API_KEY || process.env.ARK_API_KEY || "").trim();
}

function chatModelL2() {
  // 经营 L2 优先快答接入点，减少 20s 超时→heuristic
  return (
    process.env.DOUBAO_CHAT_FAST_MODEL ||
    process.env.DOUBAO_CHAT_MODEL ||
    process.env.DOUBAO_MODEL_ENDPOINT ||
    "doubao-seed-2-1-turbo-260628"
  );
}

function chatModelL3() {
  return (
    process.env.DOUBAO_CHAT_DEEP_MODEL ||
    process.env.DOUBAO_CHAT_MODEL ||
    process.env.DOUBAO_MODEL_ENDPOINT ||
    "doubao-seed-evolving"
  );
}

function timeoutMsForTier(tier) {
  if (tier === "L3") {
    const n = Number(process.env.BIZ_DEEP_TIMEOUT_MS);
    // Deep Thinking 更慢；方舟文档建议长超时，会议场景默认 120s
    return Number.isFinite(n) && n > 0 ? n : 120000;
  }
  const n = Number(process.env.BIZ_LLM_TIMEOUT_MS);
  // L2 默认 35s：快模型通常 <10s；turbo 20s 易整点超时落 heuristic
  return Number.isFinite(n) && n > 0 ? n : 35000;
}

/** 仅 doubao-seed-evolving 接受 thinking.type（enabled|disabled，无 auto） */
function modelSupportsThinking(model) {
  return /seed-evolving/i.test(String(model || ""));
}

/**
 * turbo / lite 接入点不带 thinking，避免 400。
 * Evolving：L3 默认 enabled，L2 默认 disabled。
 * @param {boolean} deep
 * @param {string} model
 * @returns {"enabled"|"disabled"|null}
 */
function resolveThinkingType(deep, model) {
  if (!modelSupportsThinking(model)) return null;
  if (deep) {
    if (process.env.BIZ_DEEP_THINKING === "0" || process.env.BIZ_DEEP_THINKING === "disabled") {
      return "disabled";
    }
    return "enabled";
  }
  if (process.env.BIZ_L2_THINKING === "1" || process.env.BIZ_L2_THINKING === "enabled") {
    return "enabled";
  }
  return "disabled";
}

/**
 * 规则诊断：只看本轮问句，避免历史「起死回生」锁死后续题。
 * @param {{ question: string }} ctx
 */
function diagnose(ctx) {
  const blob = normalizeDazhiAliases(String(ctx.question || ""));
  const gardenMatch = blob.match(/(\d+)\s*(?:个)?(?:家园|园所|园)/);
  const gardenCount = gardenMatch ? Number(gardenMatch[1]) : null;
  const pains = [];
  if (/倒闭|起死回生|破局|重生/.test(blob)) pains.push("survival");
  if (/招生|招不到|生源/.test(blob)) pains.push("enrollment");
  if (/收费|公办|高收费|降价/.test(blob)) pains.push("pricing");
  if (/老师|抵触|负担|不愿意|培育|养老师/.test(blob)) pains.push("teacher");
  if (/实施|落地|开展|0.?1|第一步/.test(blob)) pains.push("rollout");
  if (/家长|价值|看得见/.test(blob)) pains.push("parent-value");
  const introduced = /引入|已经上|在做|已上美语|买了/.test(blob);
  let stage = "explore";
  if (pains.includes("teacher") && !pains.includes("survival")) stage = "teacher";
  else if (pains.includes("survival") || pains.includes("enrollment")) stage = "rescue";
  else if (pains.includes("rollout") || gardenCount) stage = "rollout";
  else if (pains.includes("parent-value")) stage = "show-value";
  return {
    gardenCount,
    pains,
    introduced,
    stage,
    multiGarden: gardenCount != null && gardenCount >= 3
  };
}

function heuristicPlan(diag, question) {
  const q = String(question || "");
  // 换路径 / 追问优先于 rescue，避免复读锁死
  if (/还有|其他方案|别的|更好|第\s*\d+\s*条/.test(q)) {
    return {
      tts: "第二条路：先做延时非教增量班，用增收养老师；样板班并行，别只押招生一口价。",
      steps: [
        "路径A：样板班开口→续费护盘（主路径）",
        "路径B：延时非教小班增量→补贴配合老师",
        "路径C：一园两制分层，全美语家庭更高频",
        "本周先选一条主路径跑30天"
      ],
      risks: ["两条路同时全力推会分心"],
      cite: ["延时非教", "一园两制"]
    };
  }
  if (diag.stage === "teacher" || (/培育|养老师|培训老师|老师抵触/.test(q) && !/起死回生|倒闭/.test(q))) {
    return {
      tts: "培育老师先减负再激励：只拍十秒+转发报告，不备课；有美语增量后再给配合者小补贴。",
      steps: [
        "本周：明确老师只做两件事——拍开口十秒、转发系统报告",
        "对接：总部课件+非教课，老师零备课",
        "激励：样板班美语增收后，愿意接的人拿小半补贴",
        "仍抵触：先不摊全员，园长顶一个班看数据"
      ],
      risks: ["一上来全员摊任务会反弹"],
      cite: ["教师端", "增量养老师"]
    };
  }
  if (/0.?1|第一步|怎么走|步骤/.test(q)) {
    return {
      tts: "0到1就四步：定班、上非教、拍十秒、转发报告；本周只做定班和第一次开口视频。",
      steps: [
        "Day1：定样板班+对接总部课件账号",
        "Day2—3：上第一次非教课并录开口",
        "Day3：十秒视频+报告进群",
        "Week2：周复盘开口次数与家长反馈"
      ],
      risks: ["步骤跳过直接全园铺开"],
      cite: ["样板班行事历"]
    };
  }
  if (diag.multiGarden || diag.gardenCount) {
    const n = diag.gardenCount || 20;
    return {
      tts: `您有${n}个园，别齐步走：先挑2—3个试点园各开1个样板班，跑通开口和续费，再按片区复制。`,
      steps: [
        `第1周：从${n}园中选2—3个执行力强的试点园`,
        "每园：1个样板班+园长盯开口实拍进群",
        "4周：对照续费/开口数据，开复盘会",
        "再铺：按片区复制，未试点园只做环境渗透不加压"
      ],
      risks: ["多园齐推导致执行塌方", "缺少统一口径会各说各话"],
      cite: ["多园落地", "样板班"]
    };
  }
  if (diag.stage === "show-value" || /家长.*价值|看得见/.test(q)) {
    return {
      tts: "让家长看见三样：开口实拍进群、月度AI测评报告、成果展；价值靠证据，不靠口号。",
      steps: [
        "日常：样板班开口视频+非教报告进家长群",
        "每月：AI测评报告/证书发给家长",
        "学期：办一场看得见的美语成果展",
        "招生季：把上述证据做成选择理由话术"
      ],
      risks: ["只讲理念不给证据"],
      cite: ["家庭端", "AI测评", "成果展"]
    };
  }
  if (diag.stage === "rescue" || /起死回生|倒闭|重生/.test(q)) {
    return {
      tts: "先不赌全员翻盘：开一个月样板班，老师只拍十秒转发，您盯开口实拍和续费，先护盘再用增量养老师。",
      steps: [
        "本周：选定1个整班做样板，启用总部课件+非教课",
        "每日：老师拍10秒开口视频进群，转发AI/非教报告",
        "本月：用开口数据说服本班续费，再谈延时非教增量",
        "下阶段：有增量后再给配合老师小补贴，勿先摊全员"
      ],
      risks: ["一上来全员摊任务会反弹", "只领账号不执行等于纯成本"],
      cite: ["样板班", "招生转化"]
    };
  }
  return {
    tts: "把美语做成家长看得见的选择理由：样板班开口实拍、月度测评、成果展；先护收费盘面再做增量。",
    steps: [
      "定1个样板班跑30天",
      "开口实拍与报告进群",
      "对照续费与招生询问量",
      "再决定是否扩班/扩园"
    ],
    risks: ["空讲系统不做样板"],
    cite: ["招生引擎"]
  };
}

/** 换一条与上一答不同的启发式备选（禁止强制 rescue 同句） */
function alternateHeuristic(diag, question, lastTts) {
  const last = String(lastTts || "").replace(/\s+/g, "");
  const tries = [
    () => heuristicPlan({ ...diag, stage: "explore" }, `还有其他方案吗？${question}`),
    () => heuristicPlan({ ...diag, stage: "teacher" }, `如何培育老师？${question}`),
    () => heuristicPlan({ ...diag, stage: "rollout" }, `0到1第一步怎么走？${question}`),
    () => heuristicPlan({ ...diag, stage: "show-value" }, `如何让家长看到价值？${question}`),
    () => heuristicPlan({ ...diag, stage: "explore" }, question)
  ];
  for (const fn of tries) {
    const p = fn();
    const now = String(p.tts || "").replace(/\s+/g, "");
    if (now.length < 12) continue;
    if (now === last || (last.length >= 20 && last.includes(now.slice(0, 24)))) continue;
    return p;
  }
  return heuristicPlan({ ...diag, stage: "explore" }, `还有其他方案吗？${question}`);
}

function sameAnswer(a, b) {
  const x = String(a || "").replace(/\s+/g, "");
  const y = String(b || "").replace(/\s+/g, "");
  if (x.length < 20 || y.length < 20) return false;
  return x === y || x.includes(y.slice(0, 24)) || y.includes(x.slice(0, 24));
}

/**
 * LLM 超时/失败时优先用 RAG 片段口播，避免落「样板班十秒」heuristic。
 * @param {{ hits?: Array<{title?:string,snippet?:string,score?:number}>, preview?: string, instantAnswer?: string }} retrieval
 * @param {string} question
 */
function ragSpeakFallback(retrieval, question) {
  const instant = String(retrieval?.instantAnswer || "").trim();
  if (instant.length >= 12) {
    return {
      tts: stripIntroBoilerplate(instant.slice(0, 80)),
      steps: ["对照知识库口径落地", "需要时再追问具体步骤"],
      risks: [],
      cite: (retrieval.hits || []).slice(0, 2).map((h) => h.title).filter(Boolean),
      analysis: ""
    };
  }
  const hit = (retrieval?.hits || [])[0];
  if (!hit) return null;
  let bite = String(hit.snippet || "").replace(/\s+/g, " ").trim();
  // 去掉 markdown 标题行
  bite = bite.replace(/^#+\s*[^\n]+\n?/, "").replace(/^A[:：]\s*/i, "");
  if (bite.length < 20) {
    bite = String(retrieval.preview || "")
      .replace(/【[^】]+】/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }
  if (bite.length < 24) return null;
  const tts = stripIntroBoilerplate(bite.slice(0, 80));
  if (tts.length < 12) return null;
  return {
    tts,
    steps: [
      `依据「${hit.title || "知识库"}」先对齐口径`,
      "本周选一个班试点验证",
      "有数据后再扩"
    ].slice(0, 3),
    risks: ["知识片段较碎，建议再追问具体场景"],
    cite: [hit.title].filter(Boolean),
    analysis: ""
  };
}

/**
 * @param {string} system
 * @param {string} user
 * @param {{ signal?: AbortSignal, timeoutMs?: number, model?: string, temperature?: number, deep?: boolean }} [opts]
 * @returns {Promise<{ content: string|null, reasoning?: string }|null>}
 */
async function arkJsonChat(system, user, opts = {}) {
  const key = apiKey();
  if (!key) return null;
  const timeoutMs = opts.timeoutMs != null ? opts.timeoutMs : 20000;
  const model = opts.model || chatModelL2();
  const thinkingType = resolveThinkingType(Boolean(opts.deep), model);
  const ac = new AbortController();
  const onAbort = () => ac.abort();
  if (opts.signal) {
    if (opts.signal.aborted) return null;
    opts.signal.addEventListener("abort", onAbort, { once: true });
  }
  const timer = setTimeout(() => ac.abort(), timeoutMs);
  try {
    const body = {
      model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user }
      ],
      temperature: opts.temperature != null ? opts.temperature : opts.deep ? 0.5 : 0.4
    };
    // doubao-seed-evolving：必须显式 enabled|disabled（无 auto；默认 enabled）
    // https://docs.volcengine.com/docs/82379/1449737
    if (thinkingType) {
      body.thinking = { type: thinkingType };
    }
    debugLog.info("BusinessAdvisor", "LLM 请求", {
      model,
      deep: Boolean(opts.deep),
      thinking: thinkingType,
      timeoutMs,
      systemLen: system.length,
      userLen: user.length
    });
    const response = await fetch("https://ark.cn-beijing.volces.com/api/v3/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`
      },
      body: JSON.stringify(body),
      signal: ac.signal
    });
    if (!response.ok) {
      const errBody = await response.text().catch(() => "");
      debugLog.warn("BusinessAdvisor", "LLM HTTP 失败", {
        status: response.status,
        model,
        thinking: thinkingType,
        preview: String(errBody).slice(0, 200)
      });
      return null;
    }
    const data = await response.json();
    const msg = data.choices?.[0]?.message || {};
    const content = msg.content || null;
    const reasoning = msg.reasoning_content || "";
    if (reasoning) {
      debugLog.info("BusinessAdvisor", "LLM reasoning", {
        chars: String(reasoning).length,
        preview: String(reasoning).slice(0, 80)
      });
    }
    if (!content) {
      debugLog.warn("BusinessAdvisor", "LLM 空内容", { model, thinking: thinkingType });
    }
    return { content, reasoning: String(reasoning || "") };
  } catch (err) {
    if (ac.signal.aborted || err?.name === "AbortError") {
      debugLog.warn("BusinessAdvisor", "LLM 超时/取消，用启发式", {
        timeoutMs,
        model,
        thinking: thinkingType
      });
      return null;
    }
    debugLog.warn("BusinessAdvisor", "LLM 失败", {
      error: String(err?.message || err),
      model,
      thinking: thinkingType
    });
    return null;
  } finally {
    clearTimeout(timer);
    if (opts.signal) opts.signal.removeEventListener("abort", onAbort);
  }
}

function parsePlanJson(raw, { deep = false } = {}) {
  if (!raw) return null;
  const s = String(raw).trim();
  const m = s.match(/\{[\s\S]*\}/);
  if (!m) {
    debugLog.warn("BusinessAdvisor", "LLM 非 JSON", { preview: s.slice(0, 120) });
    return null;
  }
  try {
    const j = JSON.parse(m[0]);
    if (!j.tts) return null;
    const ttsMax = deep ? 100 : 80;
    return {
      tts: stripIntroBoilerplate(String(j.tts).slice(0, ttsMax)),
      analysis: j.analysis ? String(j.analysis).slice(0, deep ? 600 : 200) : "",
      steps: Array.isArray(j.steps) ? j.steps.map((x) => String(x).slice(0, 100)).slice(0, 6) : [],
      risks: Array.isArray(j.risks) ? j.risks.map((x) => String(x).slice(0, 80)).slice(0, 4) : [],
      cite: Array.isArray(j.cite) ? j.cite.map((x) => String(x).slice(0, 40)).slice(0, 6) : []
    };
  } catch (_) {
    debugLog.warn("BusinessAdvisor", "LLM JSON 解析失败", { preview: m[0].slice(0, 120) });
    return null;
  }
}

function buildSystemPrompt(tier) {
  if (tier === "L3") {
    return (
      "你是「大智」经营顾问，开启深度分析模式。只依据【知识】给可执行方案，禁止编造数字/园名。\n" +
      "先深度想透园长处境与路径利弊，再给口播抓手。输出纯 JSON，不要 markdown：\n" +
      '{"tts":"口播≤80字一个抓手","analysis":"深度分析120—250字","steps":["步骤1","步骤2","步骤3","步骤4"],"risks":["风险"],"cite":["依据标题"]}\n' +
      "若用户要「其他/更好方案」必须换路径，不得复读【上一答】；禁止「不在解答范围」。"
    );
  }
  return (
    "你是「大智」经营顾问。只依据知识片段给可执行方案。输出纯 JSON，不要 markdown：\n" +
    '{"tts":"口播≤80字一个抓手","steps":["步骤1","步骤2","步骤3"],"risks":["风险"],"cite":["依据标题"]}\n' +
    "禁止编造数字/园名；禁止「不在解答范围」；若用户要「其他方案」必须换路径不得复读上一答。"
  );
}

/**
 * @param {{
 *   question: string,
 *   recentFloors?: string[],
 *   lastHostAnswer?: string,
 *   agenda?: string,
 *   signal?: AbortSignal,
 *   onStatus?: Function,
 *   tier?: string,
 *   meetingId?: string,
 *   bizFollowUps?: number
 * }} opts
 */
async function runBusinessAdvisor(opts = {}) {
  const question = String(opts.question || "").trim();
  const diag = diagnose({ question });
  const tier =
    opts.tier ||
    classifyAnswerTier(question, { bizFollowUps: opts.bizFollowUps || 0 }) ||
    "L2";
  const deep = tier === "L3";
  opts.onStatus?.({
    phase: "thinking",
    reason: deep ? "HA_BIZ_DEEP" : "HA_BIZ",
    tier
  });

  const topK = deep ? 6 : 4;
  const retrieval = await retrieveSemantic(question, topK, {
    signal: opts.signal,
    preferBiz: true
  });
  const kbBite = String(retrieval.preview || "").slice(0, deep ? 2400 : 1600);
  let plan = heuristicPlan(diag, question);
  let usedLlm = false;
  const model = deep ? chatModelL3() : chatModelL2();
  const timeoutMs = timeoutMsForTier(tier);

  // P0：有 Key 即默认走 LLM（不再要求 semantic）；keyword 降级也可调
  const allowLlm = Boolean(apiKey()) && !opts.signal?.aborted;

  if (allowLlm) {
    const system = buildSystemPrompt(tier);
    const user =
      `【诊断】${JSON.stringify(diag)}\n【层级】${tier}\n【议程】${opts.agenda || ""}\n【知识】\n${kbBite || "（少）"}\n` +
      `【上一答】${(opts.lastHostAnswer || "").slice(0, 100)}\n【园长问】${question}\n请给方案 JSON。`;
    let chatRes = await arkJsonChat(system, user, {
      signal: opts.signal,
      timeoutMs,
      model,
      deep,
      temperature: deep ? 0.5 : 0.4
    });
    let parsed = parsePlanJson(chatRes?.content, { deep });
    if (deep && chatRes?.reasoning && parsed && !parsed.analysis) {
      parsed.analysis = String(chatRes.reasoning).slice(0, 600);
    }

    // 与上一答雷同则强制换路径重试一次
    if (
      parsed?.tts &&
      sameAnswer(parsed.tts, opts.lastHostAnswer) &&
      !opts.signal?.aborted
    ) {
      debugLog.info("BusinessAdvisor", "LLM 与上一答雷同，换路径重试");
      const retryUser =
        user +
        "\n【强制】禁止复读上一答，必须换一条完全不同的经营路径。";
      chatRes = await arkJsonChat(system, retryUser, {
        signal: opts.signal,
        timeoutMs,
        model,
        deep,
        temperature: 0.55
      });
      const parsed2 = parsePlanJson(chatRes?.content, { deep });
      if (parsed2?.tts && !sameAnswer(parsed2.tts, opts.lastHostAnswer)) {
        parsed = parsed2;
        if (deep && chatRes?.reasoning && !parsed.analysis) {
          parsed.analysis = String(chatRes.reasoning).slice(0, 600);
        }
      }
    }

    if (parsed?.tts) {
      plan = parsed;
      usedLlm = true;
    }
  }

  // LLM 失败：优先 RAG 口播，少见 biz-heuristic
  let fromRagFallback = false;
  if (!usedLlm) {
    const ragPlan = ragSpeakFallback(retrieval, question);
    if (ragPlan?.tts && !sameAnswer(ragPlan.tts, opts.lastHostAnswer)) {
      plan = ragPlan;
      fromRagFallback = true;
      debugLog.info("BusinessAdvisor", "LLM 未出，改用 RAG 口播", {
        title: ragPlan.cite?.[0],
        tts: ragPlan.tts.slice(0, 50)
      });
    }
  }

  // 防复读：heuristic 换题型，禁止强制 rescue 同句
  if (sameAnswer(plan.tts, opts.lastHostAnswer)) {
    plan = alternateHeuristic(diag, question, opts.lastHostAnswer);
  }

  const arkMode = usedLlm
    ? deep
      ? "biz-deep"
      : "biz-agent"
    : fromRagFallback
      ? "biz-rag"
      : "biz-heuristic";

  debugLog.info("BusinessAdvisor", "方案就绪", {
    tier,
    stage: diag.stage,
    gardenCount: diag.gardenCount,
    tts: plan.tts.slice(0, 60),
    steps: plan.steps.length,
    ragMode: retrieval.mode,
    usedLlm,
    arkMode,
    model: allowLlm ? model : null
  });

  if (usedLlm) {
    sinkAdvisorAnswer({
      level: tier,
      question,
      tts: plan.tts,
      analysis: plan.analysis || "",
      steps: plan.steps,
      risks: plan.risks,
      cite: plan.cite,
      ragHits: (retrieval.hits || []).map((h) => ({
        title: h.title,
        score: h.score,
        source: h.source
      })),
      model,
      meetingId: opts.meetingId || "",
      arkMode
    });
  }

  return {
    ok: true,
    diagnose: diag,
    plan,
    retrieval,
    tier,
    usedLlm,
    arkMode
  };
}

module.exports = {
  diagnose,
  heuristicPlan,
  alternateHeuristic,
  ragSpeakFallback,
  runBusinessAdvisor
};
