/**
 * 本地秒答：缓存 / Wiki / FAQ / 闭题兜底
 * 有豆包 Key 时仍优先 FAQ/Wiki 秒答；未命中再放行 MeetingAgent。
 * 出口只消费 decideSpeak 的类型与句子（含经营档），不因 useBiz 跳过澄清/复述/脚本。
 */
const S = require("./kit.cjs");
const { isTruncatedAsk, focusAsk, localAsk, hostRest } = require("../../agent/relevance.cjs");
const { decideSpeak } = require("../../decideSpeak.cjs");

function hasDoubaoKey() {
  return Boolean((process.env.DOUBAO_API_KEY || process.env.ARK_API_KEY || "").trim());
}

function tryIdentityOrAgenda(ctx) {
  const { agenda, state, a2aTrace, kbStatus, qFp, askText } = ctx;
  if (S.rx("speak", "identityAsk").test(askText)) {
    return S.playAnswer(S.IDENTITY_LINE, "WAKE_ANSWER", state, a2aTrace, kbStatus, qFp, "identity", {
      cacheQuestion: askText
    });
  }
  if (S.rx("speak", "localAgenda").test(askText)) {
    const theme = S.matchFaqInstant("今天会议主题是什么")?.answer || S.speakFill("agendaToday", { agenda });
    return S.playAnswer(theme, "WAKE_ANSWER", state, a2aTrace, kbStatus, qFp, "agenda", {
      cacheQuestion: askText
    });
  }
  return null;
}

function tryLocalAnswer(ctx) {
  const askText = focusAsk(ctx.askText);
  const { agenda, state, a2aTrace, kbStatus, qFp, rw, useBiz, lastFloor } = ctx;
  if (isTruncatedAsk(askText) || isTruncatedAsk(lastFloor)) return null;

  const idOrAgenda = tryIdentityOrAgenda({ ...ctx, askText });
  if (idOrAgenda) return idOrAgenda;

  // 经营题勿查缓存（避免误命中）
  if (!hasDoubaoKey() && !useBiz) {
    const cached = S.lookupAnswer(state.meetingId, askText) || S.lookupAnswer(state.meetingId, lastFloor);
    if (cached?.tts) {
      a2aTrace.push(
        S.newEvent("DirectorAgent", "HostAgent", "ANSWER_CACHE_HIT", {
          q: askText.slice(0, 60),
          hits: cached.hits
        })
      );
      return S.playAnswer(cached.tts, "WAKE_ANSWER", state, a2aTrace, kbStatus, qFp, "cache", {
        cacheQuestion: askText
      });
    }
  }

  let intent = null;
  let script = "";
  try {
    const { ruleUnderstand, intentSoftAnswer } = require("../../agent/intent.cjs");
    intent = ruleUnderstand(askText);
    script = intentSoftAnswer(intent, askText);
  } catch (_) {
    /* ignore */
  }

  const probeSegs = (state?.lastDesign?.segments || []).map((s) => String(s || "").trim()).filter((s) => s && !askText.includes(s));
  const wide = S.isClosedFaqQuestion(askText);
  let hits = S.retrieveKnowledge(askText, wide ? 8 : 4)?.hits || [];
  for (const seg of probeSegs.slice(0, 2)) {
    const more = S.retrieveKnowledge(seg, 3)?.hits || [];
    const seen = new Set(hits.map((h) => String(h.title || "")));
    for (const h of more) {
      const key = String(h?.title || "");
      if (!key || seen.has(key)) continue;
      seen.add(key);
      hits.push(h);
    }
  }
  const retrieved = { hits };
  const lastHost = String(ctx.opts?.lastHostSpeakText || "");
  const bayes = decideSpeak({
    ask: askText,
    hits: retrieved?.hits || [],
    intent,
    script,
    prevDesign: state?.lastDesign || null,
    lastHost
  });
  const definitionMismatch =
    bayes.action === "answer" && S.isDefinitionSpeak(bayes.speak) && !S.rx("faq", "defMark").test(askText);

  if (bayes.action === "answer" && bayes.speak && !definitionMismatch) {
    const answer = S.stripIntroBoilerplate(S.clipUtterance(bayes.speak, 160));
    if (answer) {
      if (state && bayes.design) state.lastDesign = bayes.design;
      if (state) state.lastOpenAsk = "";
      const ark =
        bayes.reason === "script"
          ? "kb-script"
          : "faq";
      S.debugLog.info("Strategy", bayes.reason === "script" ? "意图脚本秒答" : "贝叶斯 FAQ 秒答", {
        text: askText.slice(0, 40),
        title: bayes.title,
        posterior: bayes.posterior,
        reason: bayes.reason
      });
      return S.playAnswer(
        answer,
        useBiz && !S.isClosedFaqQuestion(askText) ? "BIZ_ANSWER" : "WAKE_ANSWER",
        state,
        a2aTrace,
        kbStatus,
        qFp,
        ark,
        { cacheQuestion: askText }
      );
    }
  }

  if (bayes.action === "clarify" || bayes.action === "repeat" || definitionMismatch) {
    const spoken = definitionMismatch
      ? decideSpeak({
          ask: askText,
          hits: (retrieved?.hits || []).filter((h) => !S.isDefinitionSpeak(h.speak || h.snippet)),
          intent,
          script,
          prevDesign: state?.lastDesign || null
        }).speak
      : bayes.speak;
    const line = String(spoken || bayes.speak || "").trim();
    const probeRelease = !line && (bayes.reason === "probe" || bayes.reason === "draft");
    if (probeRelease) {
      const live = hasDoubaoKey() && !ctx.opts?.forceRule && bayes.design?.depth === "final";
      if (live) return null;
      const focus = String(bayes.design?.segments?.[0] || "");
      const offline = hostRest(lastHost) || localAsk(focus);
      if (state && bayes.design) state.lastDesign = bayes.design;
      return S.playAnswer(offline, useBiz ? "BIZ_ANSWER" : "WAKE_ANSWER", state, a2aTrace, kbStatus, qFp, bayes.reason, {
        cacheQuestion: askText
      });
    }
    if (line) {
      if (state && bayes.design) state.lastDesign = bayes.design;
      if (state && (bayes.reason === "near" || bayes.reason === "probe")) {
        state.lastOpenAsk = String(askText || "").slice(0, 200);
        state.lastOpenAskAt = Date.now();
      }
      return S.playAnswer(line, useBiz ? "BIZ_ANSWER" : "WAKE_ANSWER", state, a2aTrace, kbStatus, qFp, bayes.action, {
        cacheQuestion: askText
      });
    }
  }

  if (!useBiz && (rw.closed || S.isClosedFaqQuestion(askText))) {
    S.debugLog.info("Strategy", "闭题未命中 FAQ，放行 LLM+知识库", {
      text: askText.slice(0, 40),
      hasKey: hasDoubaoKey()
    });
  }

  return null;
}

module.exports = { tryLocalAnswer };
