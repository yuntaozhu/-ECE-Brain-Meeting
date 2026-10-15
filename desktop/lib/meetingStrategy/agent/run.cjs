/**
 * MeetingAgent — Understand → 工具检索 → 相关度闸门 → Compose → 风险闸门 → Speak
 * 经营档与标准档同一条链路。检索放行之前不播模板。
 */
const S = require("../paths/consult/kit.cjs");
const { newRunId, pushAgent, todosFromRetrieval } = require("./events.cjs");
const { understandIntent, intentSoftAnswer } = require("./intent.cjs");
const { verifyAnswer, isRiskRewrite } = require("./verify.cjs");
const {
  GROUNDED_INTENTS,
  topScore,
  isAnswerable,
  isTruncatedAsk,
  repeatLine,
  clarifyLine,
  isAlignedSpeak,
  isUniversalOperateSoft
} = require("./relevance.cjs");

/** 口播候选：万能经营句必须对题；其它句 answerFitsAsk 或结构重叠二选一 */
function speakAllowed(askText, speak) {
  const t = String(speak || "").trim();
  if (!t) return false;
  if (isUniversalOperateSoft(t)) {
    // 正问「经营/园所」与模板字面可不重合，但「区别/信心」等不得放行
    return (
      isAlignedSpeak(askText, t) ||
      isAlignedSpeak(askText, "经营得更好园所经营样板班开口收费")
    );
  }
  if (answerFitsAsk(askText, t)) return true;
  return isAlignedSpeak(askText, t);
}

function composeSystem(intentObj, agenda, kbBite, dialogBlock, mode) {
  const intent = intentObj?.intent || "other";
  const must = intentObj?.must_answer || "";
  const mustNot = (intentObj?.must_not || []).join("、") || "保证招满、议程菜单";
  const fit =
    intent === "loss_fear" || intent === "roi_confirm"
      ? "用户担心亏损/回本：先表态不保证包回本，再给资料里的测算。禁止第二条路和样板班开场。"
      : intent === "profit_how"
        ? "讲三笔账如何扭亏或盈利。禁止第二条路，禁止用样板班开口实拍当整句答案。"
        : intent === "pricing_follow"
          ? "只答收费盘面：先保住现有收费，再谈加收。禁止第二条路。"
          : intent === "hq_support"
            ? "只答总部支持：课件、Teacher说、菲教、行事历。禁止样板班开场。"
            : intent === "how_calc"
              ? "拆测算数字，声明参考非承诺。数字只能来自事实。"
              : intent === "parent_reason"
                ? "讲开口实拍、测评、成果展证据。"
                : intent === "alternate_path"
                  ? "用户明确要换一条路径时，才可以说第二条路。"
                  : "直接回答园长这一句。资料不够就请对方把问题说完整，不要改问扭亏、收费或总部支持。";
  const base = mode === S.INTERACTION_MODE.HA_TALK ? S.CHAT_TALK_SYSTEM : S.CHAT_ASK_SYSTEM;
  return (
    `${base}\n【意图】${intent}\n【必须回答】${must}\n【禁止】${mustNot}\n【契合】${fit}\n` +
    `数字只能来自下面的事实或口播，没有依据的金额不要写。禁止保证不亏、包赚、一定回本。\n` +
    `【议程】${agenda}\n${dialogBlock}\n【本次工具结果】\n${kbBite || "（没有够格的资料，不要编造）"}`
  );
}

function hasApiKey() {
  return Boolean((process.env.DOUBAO_API_KEY || process.env.ARK_API_KEY || "").trim());
}

/** 问句锚点：检索命中必须对得上，防「全园美语定义」粘滞 */
function answerFitsAsk(askText, answer) {
  const q = String(askText || "");
  const a = String(answer || "");
  if (!a) return false;
  if (/普惠/.test(q) && !/普惠|外校园|四万九|生态|性质/.test(a)) return false;
  if (/条件|具备/.test(q) && !/条件|具备|专业|培训|账号|执行|师资|老师/.test(a)) return false;
  if (/收费|多少钱|三万九|39000|如何收费|怎么收费/.test(q) && !/收费|三万九|39000|学期|价格|价钱|服务价/.test(a)) {
    return false;
  }
  if (/开口|家长.*认|认可/.test(q) && !/开口|家长|实拍|测评|成果|Teacher说|看得见/.test(a)) return false;
  if (/^(你|您)?(如何|怎么)做/.test(q.replace(/[？?。！!\s]/g, ""))) {
    if (!/样板|开口|课件|落地|准备|开办|执行|四步|行事历|签约/.test(a)) return false;
  }
  // 非定义问却命中定义段 → 拒
  if (
    /收费|条件|具备|普惠|开口|认可|亏损|回本|扭亏/.test(q) &&
    S.isDefinitionSpeak(a) &&
    !/(是什么|什么是)/.test(q)
  ) {
    return false;
  }
  return true;
}

function faqQueryForAsk(askText) {
  const q = String(askText || "");
  if (/收费|多少钱|如何收费|怎么收费/.test(q)) return "全园美语系统怎么收费？";
  if (/普惠/.test(q)) return "普惠型幼儿园可以做全园美语吗？";
  if (/条件|具备/.test(q)) return "我园要具备什么条件？";
  if (/开口|家长.*认|认可/.test(q)) return "老师不敢开口家长怎么认可？";
  if (/^(你|您)?(如何|怎么)做/.test(q.replace(/[？?。！!\s]/g, ""))) {
    return "从签约到落地要做哪些准备";
  }
  return q;
}

async function retrieveForIntent(intentObj, askText, opts) {
  const intent = intentObj?.intent || "other";
  const queries = (intentObj?.retrieve_queries || []).filter(Boolean);
  if (intent === "hq_support") {
    const faq = S.retrieveKnowledge(queries[0] || "总部给予哪些支持", 2);
    return { ...faq, tool: "search_faq", mode: faq.mode || "faq-keyword" };
  }
  // 场景闭题先打 FAQ 关键词，避免语义检索粘到定义页
  const faqQ = faqQueryForAsk(askText);
  const faqKw = S.retrieveKnowledge(faqQ, 3);
  if (faqKw?.instantAnswer && isAnswerable(faqKw) && answerFitsAsk(askText, faqKw.instantAnswer)) {
    return { ...faqKw, tool: "search_faq", mode: faqKw.mode || "faq-keyword" };
  }
  const q = queries[0] || askText;
  if (opts.forceRule || !hasApiKey()) {
    const kw = S.retrieveKnowledge(q, 3);
    return { ...kw, tool: "search_wiki", mode: kw.mode || "keyword" };
  }
  let retrieval = await S.retrieveSemantic(q, 4, { signal: opts.signal, preferBiz: true });
  if (!retrieval?.hits?.length && queries[1]) {
    retrieval = await S.retrieveSemantic(queries[1], 4, {
      signal: opts.signal,
      preferBiz: true
    });
  }
  if (!retrieval?.hits?.length) {
    retrieval = S.retrieveKnowledge(askText || q, 3);
    retrieval.mode = retrieval.mode || "keyword";
  }
  // 语义命中若文不对题，回退 FAQ 关键词
  if (retrieval?.instantAnswer && !answerFitsAsk(askText, retrieval.instantAnswer) && faqKw?.instantAnswer) {
    return { ...faqKw, tool: "search_faq", mode: "faq-keyword-override" };
  }
  return { ...retrieval, tool: "search_wiki" };
}

/** 豆包未出口：意图软答 → 对齐 FAQ/检索；禁止未对题的经营万能句 */
function knowledgeSpeakLine(intentObj, askText, retrieval, state, agenda) {
  const soft = String(intentSoftAnswer(intentObj, askText) || "").trim();
  if (soft && speakAllowed(askText, soft)) return soft;

  const canon = faqQueryForAsk(askText);
  const faqHit = S.matchFaqInstant(canon) || S.matchFaqInstant(askText);
  if (faqHit?.answer && (S.shouldFaqInstant(askText, faqHit, { minScore: 18 }) || (faqHit.score || 0) >= 22)) {
    const body = S.clipUtterance(faqHit.answer, 160);
    const title = String(faqHit.question || faqHit.title || "");
    if (speakAllowed(askText, body) || isAlignedSpeak(askText, `${title}${body}`)) return body;
  }

  const instant = String(retrieval?.instantAnswer || "").trim();
  if (instant && isAnswerable(retrieval) && speakAllowed(askText, instant)) {
    return S.clipUtterance(instant, 160);
  }
  const preview = String(retrieval?.preview || "").trim();
  const hitTitle = String(retrieval?.hits?.[0]?.title || "");
  if (preview && isAnswerable(retrieval) && (speakAllowed(askText, preview) || isAlignedSpeak(askText, hitTitle))) {
    return S.clipUtterance(preview, 160);
  }
  try {
    const fb = S.chatFallbackFor(askText, state, agenda || S.DEFAULT_AGENDA, { requireAligned: true });
    if (fb && !/请再说具体一点|这句我还没对上/.test(fb) && speakAllowed(askText, fb)) {
      return S.clipUtterance(fb, 160);
    }
  } catch (_) {
    /* ignore */
  }
  return "";
}

function pickGrounded(intentObj, askText, retrieval, live) {
  const soft = intentSoftAnswer(intentObj, askText);
  const instant = String(retrieval?.instantAnswer || "").trim();
  const intent = intentObj?.intent || "other";
  if (isTruncatedAsk(askText)) {
    return { text: repeatLine(), decision: "repeat" };
  }
  if (intent === "hq_support" && instant && /课件|Teacher说|菲教|行事历/.test(instant)) {
    return { text: instant, decision: "faq" };
  }
  if (!live) {
    if (soft && (intent === "hq_support" || GROUNDED_INTENTS.has(intent)) && speakAllowed(askText, soft)) {
      return { text: soft, decision: "kb-script" };
    }
    if (instant && isAnswerable(retrieval) && speakAllowed(askText, instant)) {
      return { text: instant, decision: "instant" };
    }
    return { text: clarifyLine(), decision: "clarify" };
  }
  return { text: soft && speakAllowed(askText, soft) ? soft : "", decision: "compose" };
}

function finishSpoken(ctx, payload) {
  const { opts, state, a2aTrace, kbStatus, qFp, askText, lastFloor, runId, intentObj, t0 } = ctx;
  const answer = String(payload.answer || "").trim();
  const spoken = answer ? S.emitLead(opts, S.clipUtterance(answer, 160)) : "";
  pushAgent(a2aTrace, {
    runId,
    role: "MeetingAgent",
    action: "SPEAK",
    target: "AudioBridge",
    summary: answer.slice(0, 48),
    detail: {
      path: payload.decision,
      intent: intentObj.intent,
      tool: payload.tool,
      topScore: payload.topScore,
      gate: payload.decision,
      doubaoSpeak: false,
      riskRewrite: Boolean(payload.riskRewrite)
    }
  });
  pushAgent(a2aTrace, {
    runId,
    role: "MeetingAgent",
    action: "RUN_END",
    summary: `完成 ${Date.now() - t0}ms`,
    detail: {
      ms: Date.now() - t0,
      path: payload.decision,
      intent: intentObj.intent,
      tool: payload.tool,
      topScore: payload.topScore,
      gate: payload.decision,
      doubaoSpeak: false,
      riskRewrite: Boolean(payload.riskRewrite)
    }
  });
  if (answer && state?.meetingId) {
    S.rememberAnswer(state.meetingId, { question: askText, tts: answer, arkMode: payload.decision });
    S.rememberRealAsk(state, askText);
  }
  // 全文已由 emitLead/onEarlySpeak 播出：interventionText 留空，避免 strategyEvaluate 再 TTS 一遍
  return {
    shouldIntervene: Boolean(answer),
    interventionText: "",
    fullAnswer: answer,
    spokenPrefix: spoken,
    earlyCovered: Boolean(spoken),
    earlySpoken: Boolean(spoken),
    reason: "WAKE_ANSWER",
    latestToDos: payload.todos || [],
    nextStageRecommendation: "MainDiscussion",
    a2aTrace,
    arkConfigured: hasApiKey(),
    arkMode: payload.decision,
    arkBillingOverdue: false,
    arkError: null,
    agentMode: state.mode,
    kbStatus,
    questionFp: qFp,
    runId,
    intent: intentObj,
    wake: { lastFloor, chatReply: true, rewritten: askText, agent: "MeetingAgent", intent: intentObj.intent }
  };
}

/**
 * @param {object} ctx consult 上下文（已 prepareAsk）
 * @returns {Promise<object>}
 */
async function runMeetingAgent(ctx) {
  const { agenda, opts, state, a2aTrace, kbStatus, floors, qFp, askText, lastFloor } = ctx;
  const runId = newRunId();
  const t0 = Date.now();
  ctx.runId = runId;

  pushAgent(a2aTrace, {
    runId,
    role: "MeetingAgent",
    action: "RUN_START",
    summary: `开始作答：${String(askText || "").slice(0, 40)}`,
    detail: { askText: String(askText || "").slice(0, 120), useBiz: Boolean(ctx.useBiz), mode: state.mode }
  });

  const intentObj = await understandIntent(askText, {
    recentFloors: floors,
    lastHostAnswer: String(opts.lastHostSpeakText || ""),
    signal: opts.signal,
    forceRule: opts.forceRule
  });
  ctx.intent = intentObj;

  pushAgent(a2aTrace, {
    runId,
    role: "MeetingAgent",
    action: "PLAN",
    summary: `意图 ${intentObj.intent}（${intentObj.source}）`,
    detail: {
      intent: intentObj.intent,
      confidence: intentObj.confidence,
      source: intentObj.source,
      speak_policy: intentObj.speak_policy,
      queries: intentObj.retrieve_queries,
      depth: intentObj.depth
    }
  });

  const retrieval = await retrieveForIntent(intentObj, askText, opts);
  const score = topScore(retrieval);
  const live = hasApiKey() && !opts.forceRule;
  const grounded = pickGrounded(intentObj, askText, retrieval, live);
  pushAgent(a2aTrace, {
    runId,
    role: "KnowledgeTool",
    action: "RETRIEVE",
    target: "MeetingAgent",
    summary: `${retrieval.tool || "search_wiki"} · ${grounded.decision} · 分 ${score}`,
    detail: {
      tool: retrieval.tool,
      mode: retrieval.mode,
      topScore: score,
      gate: grounded.decision,
      intent: intentObj.intent,
      answerable: isAnswerable(retrieval),
      hits: (retrieval.hits || []).slice(0, 4).map((h) => ({
        title: h.title,
        score: h.score,
        source: h.source
      }))
    }
  });

  if (!live || grounded.decision !== "compose") {
    let answer = grounded.text;
    let riskRewrite = false;
    const check = await verifyAnswer(askText, intentObj, answer, { skipLlm: true, forceRule: true });
    if (!check.pass) {
      const soft = intentSoftAnswer(intentObj, askText);
      const fixed =
        (soft && speakAllowed(askText, soft) ? soft : "") ||
        knowledgeSpeakLine(intentObj, askText, retrieval, state, agenda) ||
        clarifyLine();
      riskRewrite = fixed !== answer;
      answer = fixed;
      pushAgent(a2aTrace, {
        runId,
        role: "MeetingAgent",
        action: "FALLBACK",
        summary: `闸门改写：${check.reason}`,
        detail: { ...check, riskRewrite, gate: "rewrite" }
      });
    }
    return finishSpoken(
      { opts, state, a2aTrace, kbStatus, qFp, askText, lastFloor, runId, intentObj, t0 },
      {
        answer,
        decision: riskRewrite ? "rewrite" : grounded.decision,
        tool: retrieval.tool,
        topScore: score,
        riskRewrite,
        todos: todosFromRetrieval(retrieval, askText)
      }
    );
  }

  // P1：缩短 kbBite，降低 Compose 首包延迟
  const kbBite = String(retrieval.preview || retrieval.instantAnswer || "").slice(0, 900);
  const recentCtx = (floors || [])
    .slice(-4)
    .map((l) => String(l || "").trim())
    .filter(Boolean)
    .join("\n")
    .slice(0, 280);
  const dialogBlock = [recentCtx && `【近场对话】\n${recentCtx}`, opts.lastHostSpeakText && `【上一答】${String(opts.lastHostSpeakText).slice(0, 120)}`]
    .filter(Boolean)
    .join("\n");
  const system = composeSystem(intentObj, agenda, kbBite, dialogBlock, state.mode);
  const lastHost = String(opts.lastHostSpeakText || "").trim();
  const userTask =
    `针对园长这一句作答，并接上上一句，不要改问别的话题。` +
    `只使用【本次工具结果】里的事实和口播；没有依据的金额不要写。` +
    `禁止：${(intentObj.must_not || []).join("、") || "议程套话、保证不亏、包赚"}。` +
    `约60–90字，勿前缀。\n` +
    `【上一句】${lastHost || "（无）"}\n【这一句】${askText}`;
  const knowledgeLine = knowledgeSpeakLine(intentObj, askText, retrieval, state, agenda);
  const retrievalTitle = String(retrieval?.hits?.[0]?.title || retrieval?.hits?.[0]?.source || "");
  const composeStartedAt = Date.now();

  let streamed = "";
  const blockSample = ["profit_how", "hq_support", "pricing_follow", "loss_fear", "roi_confirm"].includes(
    intentObj.intent
  );
  opts.onStatus?.({ phase: "thinking", reason: "MeetingAgent" });
  const chat = await S.speakViaChat(
    system,
    userTask,
    {
      ...opts,
      bridgeText: "",
      timeoutMs: Math.min(Number(S.FAST_LLM_MS) || 12000, 10000),
      temperature: state.mode === S.INTERACTION_MODE.HA_TALK ? 0.55 : 0.35,
      maxLen: 110,
      fast: intentObj.depth !== "L3",
      fallback: knowledgeLine,
      onClause: (clause) => {
        if (streamed || S.isDefinitionSpeak(clause)) return;
        if (intentObj.intent !== "alternate_path" && /第二条路|保证不亏|包赚|一定回本/.test(clause)) return;
        if (blockSample && /样板班开口实拍/.test(clause)) return;
        streamed = S.emitLead(opts, S.leadClause(clause, 36));
      }
    },
    a2aTrace
  );
  const composeMs = Date.now() - composeStartedAt;

  if (chat.aborted && !streamed) {
    pushAgent(a2aTrace, {
      runId,
      role: "MeetingAgent",
      action: "RUN_END",
      summary: "已中止",
      detail: { aborted: true, intent: intentObj.intent }
    });
    return S.baseResult({
      reason: "ABORTED",
      a2aTrace,
      agentMode: state.mode,
      kbStatus,
      wake: { lastFloor },
      runId,
      intent: intentObj
    });
  }

  let finalAnswer = chat.answer || "";
  let doubaoSpeak = chat.arkMode === "llm" && Boolean(chat.answer);
  let riskRewrite = false;
  const check = doubaoSpeak
    ? await verifyAnswer(askText, intentObj, finalAnswer, {
        signal: opts.signal,
        forceRule: opts.forceRule
      })
    : { pass: false, reason: "llm_silent", source: "local" };
  const risk = doubaoSpeak && !check.pass && isRiskRewrite(check.reason);
  let fallbackGate = "";
  if (risk) {
    const fixed = knowledgeLine || clarifyLine();
    riskRewrite = fixed !== finalAnswer;
    fallbackGate = "rewrite";
    pushAgent(a2aTrace, {
      runId,
      role: "MeetingAgent",
      action: "FALLBACK",
      summary: `风险闸门改写：${check.reason}`,
      detail: { ...check, riskRewrite, gate: "rewrite", doubaoSpeak, composeMs, retrievalTitle }
    });
    finalAnswer = fixed;
    doubaoSpeak = false;
    streamed = "";
  } else if (!doubaoSpeak) {
    // 豆包失败：对齐 FAQ/知识库；禁止「再说具体一点」软句冒充业务答
    const softBan = /请再说具体一点，我结合资料答您|这句我还没对上/;
    let kb = knowledgeLine;
    if (!kb || softBan.test(kb)) {
      kb = knowledgeSpeakLine(intentObj, askText, retrieval, state, agenda);
    }
    const chatAns = String(chat.answer || "").trim();
    if ((!kb || softBan.test(kb)) && chatAns && !softBan.test(chatAns) && answerFitsAsk(askText, chatAns)) {
      kb = chatAns;
    }
    finalAnswer = (kb && !softBan.test(kb) ? kb : "") || clarifyLine();
    fallbackGate = kb && !softBan.test(kb) ? "kb-fallback" : "clarify";
    pushAgent(a2aTrace, {
      runId,
      role: "MeetingAgent",
      action: "FALLBACK",
      summary: fallbackGate === "kb-fallback" ? "豆包未出口，改用知识库原句" : "豆包未出口，请对方把这句说完整",
      detail: {
        ...check,
        riskRewrite: false,
        gate: fallbackGate,
        doubaoSpeak: false,
        arkMode: chat.arkMode,
        composeMs,
        faqScore: topScore(retrieval),
        retrievalTitle
      }
    });
    streamed = "";
  } else {
    fallbackGate = "compose";
    pushAgent(a2aTrace, {
      runId,
      role: "MeetingAgent",
      action: "COMPOSE",
      summary: String(finalAnswer || "").slice(0, 48),
      detail: {
        arkMode: chat.arkMode,
        doubaoSpeak: true,
        intent: intentObj.intent,
        tool: retrieval.tool,
        topScore: score,
        gate: "compose",
        composeMs,
        retrievalTitle
      }
    });
  }

  // 无流式首句时整段先开口；记入 streamed，continuationAfter 为空则不再二次 TTS
  if (!streamed && finalAnswer) {
    streamed = S.emitLead(opts, S.clipUtterance(finalAnswer, 160));
  }
  const tail = streamed ? S.continuationAfter(finalAnswer, streamed) : finalAnswer;
  pushAgent(a2aTrace, {
    runId,
    role: "AudioBridge",
    action: "SPEAK",
    target: "AudioBridge",
    summary: String(streamed || tail || "").slice(0, 48),
    detail: {
      early: Boolean(streamed),
      intent: intentObj.intent,
      tool: retrieval.tool,
      topScore: score,
      gate: doubaoSpeak ? "compose" : "rewrite",
      doubaoSpeak,
      riskRewrite
    }
  });
  pushAgent(a2aTrace, {
    runId,
    role: "MeetingAgent",
    action: "RUN_END",
    summary: `完成 ${Date.now() - t0}ms`,
    detail: {
      ms: Date.now() - t0,
      path: doubaoSpeak ? "llm" : "kb-script",
      intent: intentObj.intent,
      tool: retrieval.tool,
      topScore: score,
      gate: doubaoSpeak ? "compose" : "rewrite",
      doubaoSpeak,
      riskRewrite
    }
  });

  return {
    shouldIntervene: Boolean(streamed || tail),
    interventionText: tail,
    fullAnswer: streamed ? `${streamed}${tail || ""}`.replace(/\s+/g, " ").trim() || finalAnswer : finalAnswer,
    spokenPrefix: streamed,
    earlyCovered: Boolean(streamed),
    earlySpoken: Boolean(streamed),
    reason: "WAKE_ANSWER",
    latestToDos: todosFromRetrieval(retrieval, askText),
    nextStageRecommendation: "MainDiscussion",
    a2aTrace,
    arkConfigured: true,
    arkMode: doubaoSpeak ? chat.arkMode : fallbackGate === "kb-fallback" ? "kb-script" : "clarify",
    arkBillingOverdue: chat.arkBillingOverdue,
    arkError: chat.arkError,
    agentMode: state.mode,
    kbStatus,
    questionFp: qFp,
    runId,
    intent: intentObj,
    composeMs,
    faqScore: score,
    retrievalTitle,
    fallbackGate,
    wake: { lastFloor, chatReply: true, rewritten: askText, agent: "MeetingAgent", intent: intentObj.intent }
  };
}

module.exports = { runMeetingAgent };
