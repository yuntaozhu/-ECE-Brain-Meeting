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
  isProfitAsk,
  isRoiConfirmAsk,
  isLossFearAsk,
  isHowCalcAsk,
  isParentReasonAsk,
  OPERATE_BETTER_TTS,
  PROFIT_TTS,
  ROI_CONFIRM_TTS,
  HOW_CALC_TTS,
  PARENT_REASON_TTS
} = require("./heuristics.cjs");
const { isDefinitionSpeak } = require("./speakGuards.cjs");
const { pickWikiForIntent, ragSpeakFallback } = require("./lead.cjs");
const { arkJsonChat, parsePlanJson, buildSystemPrompt } = require("./llmChat.cjs");
const { intentSoftAnswer, isMoneyIntent } = require("../agent/intent.cjs");

async function runBusinessAdvisor(opts = {}) {
  const question = String(opts.question || "").trim();
  const intentObj = opts.intent || null;
  const diag = diagnose({ question });
  // MeetingAgent intent 覆盖诊断 stage（亏损/回本）
  if (
    intentObj &&
    (isMoneyIntent(intentObj.intent) || intentObj.intent === "roi_confirm" || intentObj.intent === "loss_fear")
  ) {
    diag.stage = "roi-confirm";
    if (!diag.pains.includes("roi-confirm")) diag.pains.push("roi-confirm");
  } else if (intentObj?.intent === "how_calc") {
    diag.stage = "how-calc";
  } else if (intentObj?.intent === "profit_how") {
    diag.stage = "profit";
  } else if (intentObj?.intent === "parent_reason") {
    diag.stage = "show-value";
  }
  const tier =
    opts.tier ||
    classifyAnswerTier(question, { bizFollowUps: opts.bizFollowUps || 0 }) ||
    "L2";
  const deep = tier === "L3";
  opts.onStatus?.({
    phase: "thinking",
    reason: deep ? "HA_BIZ_DEEP" : "HA_BIZ",
    tier,
    intent: intentObj?.intent
  });

  const topK = deep ? 6 : 4;
  const retrieveQ =
    (intentObj?.retrieve_queries && intentObj.retrieve_queries[0]) || question;
  const retrievalRaw = await retrieveSemantic(retrieveQ, topK, {
    signal: opts.signal,
    preferBiz: true
  });
  const retrieval = pickWikiForIntent(question, retrievalRaw, diag);
  const kbBite = String(retrieval.preview || "").slice(0, deep ? 2400 : 1600);
  // 同意图软答优先于全文 heuristicPlan（避免误伤）
  const soft = intentObj ? intentSoftAnswer(intentObj, question) : "";
  let plan = soft
    ? { tts: soft, steps: [], risks: [], cite: [] }
    : heuristicPlan(diag, question);
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

  // LLM 失败：money/how-calc 等同意图软答优先于裸 RAG（避免缺「不保证」）
  let fromRagFallback = false;
  if (!usedLlm) {
    const keepSoft =
      soft &&
      (isMoneyIntent(intentObj?.intent) ||
        intentObj?.intent === "how_calc" ||
        intentObj?.intent === "parent_reason" ||
        intentObj?.intent === "profit_how" ||
        isRoiConfirmAsk(question) ||
        isLossFearAsk(question) ||
        isHowCalcAsk(question) ||
        isParentReasonAsk(question) ||
        isProfitAsk(question));
    if (keepSoft) {
      plan = { tts: soft, steps: plan.steps || [], risks: plan.risks || [], cite: plan.cite || [] };
      debugLog.info("BusinessAdvisor", "LLM 未出，保留同意图软答", {
        intent: intentObj?.intent,
        tts: soft.slice(0, 50)
      });
    } else {
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
  }

  // 防复读：同意图内勿跳到「第二条路」；仅非 money/profit 等才换题型
  if (sameAnswer(plan.tts, opts.lastHostAnswer)) {
    const lockIntent =
      isMoneyIntent(intentObj?.intent) ||
      intentObj?.intent === "profit_how" ||
      intentObj?.intent === "how_calc" ||
      intentObj?.intent === "parent_reason" ||
      intentObj?.intent === "pricing_follow" ||
      intentObj?.intent === "hq_support" ||
      isRoiConfirmAsk(question) ||
      isLossFearAsk(question) ||
      isProfitAsk(question) ||
      isHowCalcAsk(question) ||
      isParentReasonAsk(question);
    if (lockIntent && soft) {
      plan = { ...plan, tts: soft };
    } else if (!lockIntent && intentObj?.intent !== "operate") {
      plan = alternateHeuristic(diag, question, opts.lastHostAnswer);
    }
  }
  // 「理由是什么」禁止复读「要成为理由」空句
  if (
    (isParentReasonAsk(question) || diag.stage === "show-value") &&
    /要成为家长选择|成为家长选择园所的理由/.test(plan.tts) &&
    !/(开口|测评|成果展|实拍)/.test(plan.tts)
  ) {
    plan = { ...heuristicPlan({ ...diag, stage: "show-value" }, question), tts: PARENT_REASON_TTS };
    fromRagFallback = false;
  }
  // 「能回本吗 / 会不会亏损」必须先表态不保证；禁止第二条路 / 盈利开场
  if (
    isRoiConfirmAsk(question) ||
    isLossFearAsk(question) ||
    diag.stage === "roi-confirm" ||
    isMoneyIntent(intentObj?.intent)
  ) {
    const t = String(plan.tts || "");
    const hasStance = /不保证|不包回本|不是承诺|测算非承诺|参考测算/.test(t);
    const wrongFrame =
      /第二条路|引入后盈利算三笔账|延时非教扩服务半径|延时非教增量班/.test(t) ||
      (/要成为家长选择|第三笔账才是核心/.test(t) && !hasStance);
    if (!hasStance || wrongFrame) {
      plan = { ...heuristicPlan({ ...diag, stage: "roi-confirm" }, question), tts: ROI_CONFIRM_TTS };
      fromRagFallback = false;
    }
  }
  // 「怎么算」禁止只复读盈利开场
  if (
    (isHowCalcAsk(question) || diag.stage === "how-calc") &&
    !/(一点八|1\.8|五点四|5\.4|测算|乘)/.test(plan.tts)
  ) {
    plan = { ...heuristicPlan({ ...diag, stage: "how-calc" }, question), tts: HOW_CALC_TTS };
    fromRagFallback = false;
  }
  // 经营题禁止落定义页口播
  if (
    isDefinitionSpeak(plan.tts) &&
    (isOperateQuestion(question) ||
      isOperateBetterAsk(question) ||
      isProfitAsk(question) ||
      isRoiConfirmAsk(question) ||
      isHowCalcAsk(question) ||
      isParentReasonAsk(question) ||
      /经营|招生|落地|样板|盈利|赚钱|计算|理由|回本/.test(question))
  ) {
    const fallback =
      isRoiConfirmAsk(question) || diag.stage === "roi-confirm"
        ? { ...heuristicPlan({ ...diag, stage: "roi-confirm" }, question), tts: ROI_CONFIRM_TTS }
        : isHowCalcAsk(question) || diag.stage === "how-calc"
          ? { ...heuristicPlan({ ...diag, stage: "how-calc" }, question), tts: HOW_CALC_TTS }
          : isParentReasonAsk(question) || diag.stage === "show-value"
            ? { ...heuristicPlan({ ...diag, stage: "show-value" }, question), tts: PARENT_REASON_TTS }
            : isProfitAsk(question) || diag.stage === "profit"
              ? { ...heuristicPlan({ ...diag, stage: "profit" }, question), tts: PROFIT_TTS }
              : isOperateBetterAsk(question)
                ? { ...heuristicPlan({ ...diag, stage: "explore" }, question), tts: OPERATE_BETTER_TTS }
                : heuristicPlan({ ...diag, stage: "explore" }, question);
    plan = fallback;
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
