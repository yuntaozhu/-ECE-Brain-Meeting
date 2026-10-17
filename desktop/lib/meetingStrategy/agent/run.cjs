/**
 * MeetingAgent — Understand → 工具检索 → 相关度闸门 → Compose → 风险闸门 → Speak
 * 经营档与标准档同一条链路。检索放行之前不播模板。
 */
const S = require("../paths/consult/kit.cjs");
const { newRunId, pushAgent, todosFromRetrieval } = require("./events.cjs");
const { understandIntent, intentSoftAnswer } = require("./intent.cjs");
const { verifyAnswer, isRiskRewrite } = require("./verify.cjs");
const {
  topScore,
  isAnswerable,
  repeatLine,
  focusAsk,
  localAsk,
  hostRest
} = require("./relevance.cjs");
const { decideSpeak } = require("../decideSpeak.cjs");
const { validateSlots } = require("../../text/universalOperators.cjs");

function speakDecision(intentObj, askText, retrieval, state, lastHost) {
  return decideSpeak({
    ask: askText,
    hits: retrieval?.hits || [],
    intent: intentObj,
    script: intentSoftAnswer(intentObj, askText),
    prevDesign: state?.lastDesign || null,
    lastHost: lastHost || ""
  });
}

function composeSystem(intentObj, agenda, kbBite, dialogBlock, mode) {
  const { load, speakLine } = require("../../knowledge/schemaStore.cjs");
  const intent = intentObj?.intent || "other";
  const must = intentObj?.must_answer || "";
  const mustNot = (intentObj?.must_not || []).join("、") || "保证招满、议程菜单";
  const fitMap = load().speak.composeFit || {};
  const fit = fitMap[intent] || fitMap.default || "";
  const base = mode === S.INTERACTION_MODE.HA_TALK ? S.CHAT_TALK_SYSTEM : S.CHAT_ASK_SYSTEM;
  return (
    `${base}\n【意图】${intent}\n【必须回答】${must}\n【禁止】${mustNot}\n【契合】${fit}\n` +
    `${speakLine("composeNumberRule")}\n` +
    `【议程】${agenda}\n${dialogBlock}\n【本次工具结果】\n${kbBite || "（没有够格的资料，不要编造）"}`
  );
}

function hasApiKey() {
  return Boolean((process.env.DOUBAO_API_KEY || process.env.ARK_API_KEY || "").trim());
}

function mergeHits(into, more) {
  const seen = new Set(into.map((h) => String(h.title || "")));
  for (const h of more || []) {
    const key = String(h?.title || "");
    if (!key || seen.has(key)) continue;
    seen.add(key);
    into.push(h);
  }
  return into;
}

async function retrieveForIntent(intentObj, askText, opts, state) {
  const segs = (state?.lastDesign?.segments || []).map((s) => String(s || "").trim()).filter(Boolean);
  const queries = [focusAsk(askText), ...segs, ...(intentObj?.retrieve_queries || [])]
    .map((q) => String(q || "").trim())
    .filter(Boolean);
  const unique = [...new Set(queries)].slice(0, 3);
  const hits = [];
  let preview = "";
  let instantAnswer = "";
  for (const q of unique) {
    const kw = S.retrieveKnowledge(q, 4);
    mergeHits(hits, kw?.hits);
    if (!preview && kw?.preview) preview = kw.preview;
    if (!instantAnswer && kw?.instantAnswer) instantAnswer = kw.instantAnswer;
  }
  if (!(opts.forceRule || !hasApiKey())) {
    try {
      const sem = await S.retrieveSemantic(unique[0] || askText, 4, { signal: opts.signal, preferBiz: true });
      mergeHits(hits, sem?.hits);
      if (!preview && sem?.preview) preview = sem.preview;
    } catch (_) {
      /* 关键词候选已经够贝叶斯用 */
    }
  }
  return { hits, preview, instantAnswer, tool: "search_faq", mode: "bayes" };
}

/** 豆包未出口：接上一句后半句。没有后半句就当场问一步，不念套话。 */
function knowledgeSpeakLine(intentObj, askText, retrieval, state, lastHost) {
  const d = speakDecision(intentObj, askText, retrieval, state, lastHost);
  if (d.speak) return S.clipUtterance(d.speak, 160);
  if (d.design?.hypothesisId === "probe") {
    const focus = String(d.design.segments?.[0] || "");
    const line = hostRest(lastHost) || localAsk(focus);
    return S.clipUtterance(line, 160);
  }
  return "";
}

function pickGrounded(intentObj, askText, retrieval, live, state, lastHost) {
  const d = speakDecision(intentObj, askText, retrieval, state, lastHost);
  const base = { text: d.speak, design: d.design, decisionObj: d };
  if (d.action === "repeat" || d.action === "clarify") {
    if (!d.speak && d.design?.hypothesisId === "probe") {
      if (live && d.design.depth === "final") return { text: "", decision: "compose", design: d.design, decisionObj: d };
      const focus = String(d.design.segments?.[0] || "");
      const text = hostRest(lastHost) || localAsk(focus);
      return { ...base, text, decision: d.action };
    }
    return { ...base, decision: d.action };
  }
  if (d.action === "answer" && d.reason === "posterior") {
    return { ...base, decision: "faq" };
  }
  // 意图脚本已是承诺句：有 Key 也不再进慢 Compose，避免超时空取消
  if (d.action === "answer" && d.reason === "script" && d.speak) {
    return { ...base, decision: "kb-script" };
  }
  if (live) {
    return { text: "", decision: "compose", design: d.design, decisionObj: d };
  }
  return { ...base, decision: d.action || "repeat", text: d.speak || repeatLine() };
}

function finishSpoken(ctx, payload) {
  const { opts, state, a2aTrace, kbStatus, qFp, askText, lastFloor, runId, intentObj, t0, useBiz } = ctx;
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
  if (state && payload.design) state.lastDesign = payload.design;
  // 全文已由 emitLead/onEarlySpeak 播出：interventionText 留空，避免 strategyEvaluate 再 TTS 一遍
  return {
    shouldIntervene: Boolean(answer),
    interventionText: "",
    fullAnswer: answer,
    spokenPrefix: spoken,
    earlyCovered: Boolean(spoken),
    earlySpoken: Boolean(spoken),
    reason: useBiz && !S.isClosedFaqQuestion(focusAsk(askText)) ? "BIZ_ANSWER" : "WAKE_ANSWER",
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

  const retrieval = await retrieveForIntent(intentObj, askText, opts, state);
  const score = topScore(retrieval);
  const live = hasApiKey() && !opts.forceRule;
  const lastHost = String(opts.lastHostSpeakText || "").trim();
  const grounded = pickGrounded(intentObj, askText, retrieval, live, state, lastHost);
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
      const fixed = knowledgeSpeakLine(intentObj, askText, retrieval, state, lastHost) || repeatLine();
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
        design: grounded.design,
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
  const probe = grounded.design?.hypothesisId === "probe";
  const probeFocus = String(grounded.design?.segments?.[0] || "");
  const userTask = probe
    ? grounded.design?.depth === "final"
      ? require("../../knowledge/schemaStore.cjs").speakFill("composeProbe", {
          lastHost: lastHost || "（无）",
          askText,
          probeFocus: probeFocus || "（无）"
        })
      : `只输出一个问句，20个字以内。问对方还没说清的那一块，接上上一句已经说过的做法。不要复述资料。禁止出现：现在是什么情况、我们一起往下看、写成固定步骤、你是说。\n【上一句】${lastHost || "（无）"}\n【这一句】${askText}\n【焦点】${probeFocus || "（无）"}`
    : `针对园长这一句作答，并接上上一句，不要改问别的话题。` +
      `只使用【本次工具结果】里的事实和口播；没有依据的金额不要写。` +
      `禁止：${(intentObj.must_not || []).join("、") || "议程套话、保证不亏、包赚"}。` +
      `约60–90字，勿前缀。\n` +
      `【上一句】${lastHost || "（无）"}\n【这一句】${askText}`;
  const knowledgeLine = knowledgeSpeakLine(intentObj, askText, retrieval, state, lastHost);
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
        if (
          intentObj.intent !== "alternate_path" &&
          new RegExp(require("../../knowledge/schemaStore.cjs").speakLine("alternateBlock")).test(clause)
        ) {
          return;
        }
        if (blockSample && require("../../knowledge/schemaStore.cjs").rx("operators", "sampleLead").test(clause)) return;
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
  let fallbackGate = "";
  const probeTurn = grounded.design?.hypothesisId === "probe";
  if (doubaoSpeak && !validateSlots(askText, finalAnswer)) {
    const local = hostRest(lastHost) || localAsk(probeFocus);
    const kbOk = knowledgeLine && validateSlots(askText, knowledgeLine) ? knowledgeLine : "";
    finalAnswer = kbOk || local || repeatLine();
    doubaoSpeak = false;
    fallbackGate = "slot-critic";
    streamed = "";
  }
  const check = doubaoSpeak
    ? probeTurn
      ? {
          pass: !(
            new RegExp(require("../../knowledge/schemaStore.cjs").speakLine("promiseBlock")).test(finalAnswer) ||
            new RegExp(require("../../knowledge/schemaStore.cjs").speakLine("agendaBlock")).test(finalAnswer)
          ),
          reason: "probe",
          source: "probe"
        }
      : await verifyAnswer(askText, intentObj, finalAnswer, {
          signal: opts.signal,
          forceRule: opts.forceRule
        })
    : { pass: false, reason: "llm_silent", source: "local" };
  const risk = doubaoSpeak && !check.pass && isRiskRewrite(check.reason);
  if (risk) {
    const fixed = knowledgeLine || repeatLine();
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
    // 豆包超时/失败：回放承诺算法句子（FAQ / 脚本 / EIG 澄清 / 复述）
    const softBan = /请再说具体一点，我结合资料答您/;
    let kb = knowledgeLine;
    if (!kb || softBan.test(kb)) {
      kb = knowledgeSpeakLine(intentObj, askText, retrieval, state, lastHost);
    }
    finalAnswer = (kb && !softBan.test(kb) ? kb : "") || repeatLine();
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

  if (state && grounded.design) state.lastDesign = grounded.design;

  return {
    shouldIntervene: Boolean(streamed || tail),
    interventionText: tail,
    fullAnswer: streamed ? `${streamed}${tail || ""}`.replace(/\s+/g, " ").trim() || finalAnswer : finalAnswer,
    spokenPrefix: streamed,
    earlyCovered: Boolean(streamed),
    earlySpoken: Boolean(streamed),
    reason: ctx.useBiz && !S.isClosedFaqQuestion(focusAsk(askText)) ? "BIZ_ANSWER" : "WAKE_ANSWER",
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
