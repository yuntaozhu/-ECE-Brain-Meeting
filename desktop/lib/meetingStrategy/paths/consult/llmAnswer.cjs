/**
 * HA_ASK / HA_TALK：Wiki 先开口或语义 RAG + Chat
 */
const S = require("./kit.cjs");
const { rx, speakFill, load } = require("../../../knowledge/schemaStore.cjs");

/**
 * @returns {Promise<object>}
 */
async function runLlmAnswer(ctx) {
  const { agenda, opts, state, a2aTrace, kbStatus, floors, qFp, askText, lastFloor } = ctx;

  let spoken = "";
  const wikiNow = S.queryWiki(askText, 1);
  const pageSpeak = wikiNow.hits?.[0]?.speak || "";
  const lastHost = String(opts.lastHostSpeakText || "").trim();
  const wantDetail = S.isComplexQuestion(askText) || rx("faq", "wantDetail").test(askText);
  const tautologyReason =
    rx("faq", "reasonAsk").test(askText) &&
    rx("faq", "tautology").test(pageSpeak) &&
    !rx("faq", "evidence").test(pageSpeak);
  const wikiLeadOk =
    pageSpeak &&
    (wikiNow.hits?.[0]?.score || 0) >= 6 &&
    !S.isDefinitionSpeak(pageSpeak) &&
    // 复杂经营/追问：跳过短 wiki-lead，走 RAG+整段 Chat，避免复读半截行事历
    !wantDetail &&
    !tautologyReason &&
    !S.alreadyCovered(S.leadClause(pageSpeak, 28), lastHost);
  if (wikiLeadOk) {
    spoken = S.emitLead(opts, S.leadClause(pageSpeak, 72));
  }
  opts.onStatus?.({ phase: "thinking", reason: state.mode });
  if (spoken) {
    const signal = opts.signal;
    const spokenNow = spoken;
    const pageFull = pageSpeak;
    void (async () => {
      try {
        if (signal?.aborted) return;
        const chat = await S.speakViaChat(
          `${S.CHAT_ASK_SYSTEM}\n【议程】${agenda}`,
          speakFill("llmShortAsk", { spoken: spokenNow.slice(0, 24), ask: askText }),
          {
            ...opts,
            signal,
            timeoutMs: S.FAST_LLM_MS,
            temperature: 0.35,
            maxLen: 80,
            fallback: ""
          },
          a2aTrace
        );
        if (signal?.aborted) return;
        let extra = "";
        if (chat.answer && chat.arkMode !== "heuristic") {
          extra = S.leadClause(chat.answer, 48);
        }
        // 超时/空答：从同一 Wiki 口播补第二句，勿冷场
        if (!extra || S.isDefinitionSpeak(extra) || S.alreadyCovered(extra, spokenNow)) {
          extra = S.continuationAfter(pageFull, spokenNow);
        }
        if (!extra || S.alreadyCovered(extra, spokenNow)) return;
        S.emitLead(opts, extra);
      } catch (err) {
        S.debugLog.warn("Strategy", "咨询续写失败", { error: String(err?.message || err) });
        const rest = S.continuationAfter(pageFull, spokenNow);
        if (rest && !S.alreadyCovered(rest, spokenNow)) S.emitLead(opts, rest);
      }
    })();
    return {
      shouldIntervene: true,
      interventionText: "",
      fullAnswer: spoken,
      spokenPrefix: spoken,
      earlyCovered: true,
      earlySpoken: true,
      reason: "WAKE_ANSWER",
      latestToDos: [],
      nextStageRecommendation: "MainDiscussion",
      a2aTrace,
      arkConfigured: true,
      arkMode: "wiki-lead",
      arkBillingOverdue: false,
      arkError: null,
      agentMode: state.mode,
      kbStatus,
      questionFp: qFp,
      wake: { lastFloor, chatReply: true, rewritten: askText }
    };
  }

  let retrieval = await S.retrieveSemantic(askText || agenda, 3, { signal: opts.signal });
  if (!retrieval?.hits?.length) {
    retrieval = S.retrieveKnowledge(askText || agenda, 2);
    retrieval.mode = retrieval.mode || "keyword";
  }
  a2aTrace.push(
    S.newEvent("ResearcherAgent", "HostAgent", "RAG_HIT", {
      hits: (retrieval.hits || []).map((h) => ({ title: h.title, score: h.score, source: h.source })),
      mode: state.mode,
      ragMode: retrieval.mode
    })
  );

  if (
    state.mode === S.INTERACTION_MODE.HA_ASK &&
    !S.isComplexQuestion(askText) &&
    retrieval.instantAnswer &&
    ((retrieval.fromFaq && (retrieval.hits?.[0]?.score || 0) >= 0.82) ||
      retrieval.mode === "wiki" ||
      (retrieval.hits?.[0]?.source === "wiki" && (retrieval.hits?.[0]?.score || 0) >= 0.85))
  ) {
    const answer = S.stripIntroBoilerplate(S.clipUtterance(retrieval.instantAnswer, 160));
    return S.playAnswer(
      answer,
      "WAKE_ANSWER",
      state,
      a2aTrace,
      kbStatus,
      qFp,
      retrieval.fromFaq ? "faq-semantic" : "wiki",
      { cacheQuestion: askText }
    );
  }

  const kbBite = String(retrieval.preview || "").slice(0, 1600);
  const recentCtx = floors
    .slice(-6)
    .map((l) => String(l || "").trim())
    .filter(Boolean)
    .join("\n")
    .slice(0, 420);
  const lastAskNote = state.lastRealAsk
    ? `上一实质问：${String(state.lastRealAsk).slice(0, 120)}`
    : "";
  const dialogBlock = [recentCtx && `【近场对话】\n${recentCtx}`, lastAskNote]
    .filter(Boolean)
    .join("\n");
  const system =
    state.mode === S.INTERACTION_MODE.HA_TALK
      ? `${S.CHAT_TALK_SYSTEM}\n【议程】${agenda}\n${dialogBlock}\n【知识片段】\n${kbBite || "（暂无强相关，谨慎简答）"}`
      : `${S.CHAT_ASK_SYSTEM}\n【议程】${agenda}\n${dialogBlock}\n【知识片段】\n${kbBite || "（暂无强相关，谨慎简答）"}`;
  const userTask =
    state.mode === S.INTERACTION_MODE.HA_TALK
      ? `园长说：${askText}\n请按探讨结构短复（勿前缀「大智：」）。可参照近场对话，勿编造未出现的提问。`
      : speakFill("llmLongAsk", {
          last: String(opts.lastHostSpeakText || "").slice(0, 40),
          ask: askText
        });

  let streamed = "";
  const bridge =
    S.leadClause(S.matchFaqInstant(askText)?.answer || "", 24) || "我按资料先说一句。";
  const chat = await S.speakViaChat(
    system,
    userTask,
    {
      ...opts,
      bridgeText: bridge,
      timeoutMs: S.FAST_LLM_MS,
      temperature: state.mode === S.INTERACTION_MODE.HA_TALK ? 0.55 : 0.35,
      maxLen: state.mode === S.INTERACTION_MODE.HA_TALK ? 110 : 110,
      fallback: S.leadClause(S.chatFallbackFor(askText, state, agenda), 72),
      onClause: (clause) => {
        if (streamed || S.isDefinitionSpeak(clause)) return;
        streamed = S.emitLead(opts, S.leadClause(clause, 36));
      }
    },
    a2aTrace
  );

  if (chat.aborted && !streamed) {
    return S.baseResult({
      reason: "ABORTED",
      a2aTrace,
      agentMode: state.mode,
      kbStatus,
      wake: { lastFloor }
    });
  }
  a2aTrace.push(
    S.newEvent(
      "DirectorAgent",
      "HostAgent",
      state.mode === S.INTERACTION_MODE.HA_TALK ? "TALK_REPLY" : "ASK_REPLY",
      {
        preview: chat.answer.slice(0, 80),
        ragMode: retrieval.mode
      }
    )
  );
  if (chat.answer && !chat.arkBillingOverdue) {
    S.rememberAnswer(state.meetingId, {
      question: askText,
      tts: chat.answer,
      arkMode: chat.arkBillingOverdue ? "heuristic" : chat.arkMode || "llm"
    });
    if (state.mode === S.INTERACTION_MODE.HA_ASK && chat.arkMode === "llm") {
      S.sinkAdvisorAnswer({
        level: "L2",
        question: askText,
        rewritten: askText,
        tts: chat.answer,
        steps: [],
        cite: (retrieval.hits || []).slice(0, 3).map((h) => h.title),
        ragHits: retrieval.hits || [],
        meetingId: state.meetingId,
        arkMode: "llm"
      });
    }
  }
  const tail = streamed ? S.continuationAfter(chat.answer, streamed) : chat.answer;
  return {
    shouldIntervene: Boolean(streamed || tail),
    interventionText: tail,
    fullAnswer: streamed ? `${streamed}${tail || ""}` : chat.answer,
    spokenPrefix: streamed,
    earlyCovered: Boolean(streamed),
    earlySpoken: Boolean(streamed),
    reason: "WAKE_ANSWER",
    latestToDos: load().speak.llmTodos,
    nextStageRecommendation: "MainDiscussion",
    a2aTrace,
    arkConfigured: true,
    arkMode: chat.arkBillingOverdue ? "heuristic" : chat.arkMode,
    arkBillingOverdue: chat.arkBillingOverdue,
    arkError: chat.arkError,
    agentMode: state.mode,
    kbStatus,
    questionFp: qFp,
    wake: { lastFloor, chatReply: true, rewritten: askText }
  };
}

module.exports = { runLlmAnswer };
