/** runBusinessAdvisor 编排 */
const { debugLog } = require("../../platform/debugLog.cjs");
const { retrieveSemantic, sinkAdvisorAnswer } = require("../../knowledge");
const { classifyAnswerTier } = require("../query");
const { apiKey, chatModelL2, chatModelL3, timeoutMsForTier } = require("./config.cjs");
const { diagnose } = require("./diagnose.cjs");
const {
  heuristicPlan,
  alternateHeuristic,
  sameAnswer,
  isOperateQuestion,
  isOperateBetterAsk,
  OPERATE_BETTER_TTS
} = require("./heuristics.cjs");
const { isDefinitionSpeak } = require("./speakGuards.cjs");
const { pickWikiForIntent, ragSpeakFallback } = require("./lead.cjs");
const { arkJsonChat, parsePlanJson, buildSystemPrompt } = require("./llmChat.cjs");

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
  const retrievalRaw = await retrieveSemantic(question, topK, {
    signal: opts.signal,
    preferBiz: true
  });
  const retrieval = pickWikiForIntent(question, retrievalRaw, diag);
  const kbBite = String(retrieval.preview || "").slice(0, deep ? 2400 : 1600);
  let plan = heuristicPlan(diag, question);
  let usedLlm = false;
  const model = deep ? chatModelL3() : chatModelL2();
  const timeoutMs =
    Number(opts.timeoutMs) > 0 ? Number(opts.timeoutMs) : timeoutMsForTier(tier);

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
  // 经营题禁止落定义页口播
  if (
    isDefinitionSpeak(plan.tts) &&
    (isOperateQuestion(question) || isOperateBetterAsk(question) || /经营|招生|落地|样板/.test(question))
  ) {
    plan = {
      ...heuristicPlan({ ...diag, stage: "explore" }, question),
      tts: isOperateBetterAsk(question)
        ? OPERATE_BETTER_TTS
        : heuristicPlan({ ...diag, stage: "explore" }, question).tts
    };
    fromRagFallback = false;
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

module.exports = { runBusinessAdvisor };
