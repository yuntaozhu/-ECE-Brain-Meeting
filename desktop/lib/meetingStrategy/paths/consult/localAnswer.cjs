/**
 * 本地秒答：缓存 / Wiki / FAQ / 闭题兜底
 * 有豆包 Key 时仍优先 FAQ/Wiki 秒答；未命中再放行 MeetingAgent。
 */
const S = require("./kit.cjs");
const { isTruncatedAsk, decideSpeak, focusAsk } = require("../../agent/relevance.cjs");

function hasDoubaoKey() {
  return Boolean((process.env.DOUBAO_API_KEY || process.env.ARK_API_KEY || "").trim());
}

function tryIdentityOrAgenda(ctx) {
  const { agenda, state, a2aTrace, kbStatus, qFp, askText } = ctx;
  if (/(你是谁|你是什么|你叫什么)/.test(askText)) {
    return S.playAnswer(S.IDENTITY_LINE, "WAKE_ANSWER", state, a2aTrace, kbStatus, qFp, "identity", {
      cacheQuestion: askText
    });
  }
  if (/(会议主题|开什么会|今天.*主题|这次会议的主题)/.test(askText)) {
    const theme = S.matchFaqInstant("今天会议主题是什么")?.answer || `今天主题是${agenda}。`;
    return S.playAnswer(theme, "WAKE_ANSWER", state, a2aTrace, kbStatus, qFp, "agenda", {
      cacheQuestion: askText
    });
  }
  return null;
}

function bestFaqHit(askText) {
  return S.matchFaqInstant(askText);
}

/** 贝叶斯放行才允许把这条 FAQ 当秒答，避免词表改写把窄标题送出口。 */
function bayesAllows(askText, faqHit) {
  if (!faqHit?.answer) return false;
  const d = decideSpeak({
    ask: askText,
    hits: [
      {
        title: faqHit.title,
        score: faqHit.score,
        snippet: `A: ${faqHit.answer}`,
        source: "faq"
      }
    ]
  });
  return d.action === "answer" && d.reason === "posterior";
}

/**
 * @returns {object|null}
 */
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

  const retrieved = S.retrieveKnowledge(askText, 4);
  const bayes = decideSpeak({ ask: askText, hits: retrieved?.hits || [] });
  if (bayes.action === "answer" && bayes.reason === "posterior" && bayes.speak) {
    const answer = S.stripIntroBoilerplate(S.clipUtterance(bayes.speak, 160));
    if (answer && !(S.isDefinitionSpeak(answer) && !/(是什么|什么是)/.test(askText))) {
      S.debugLog.info("Strategy", "贝叶斯 FAQ 秒答", {
        text: askText.slice(0, 40),
        title: bayes.title,
        posterior: bayes.posterior
      });
      return S.playAnswer(answer, "WAKE_ANSWER", state, a2aTrace, kbStatus, qFp, "faq", {
        cacheQuestion: askText
      });
    }
  }

  const rawFaq = bestFaqHit(askText);
  const faqHit = bayesAllows(askText, rawFaq) ? rawFaq : null;

  if (!useBiz && (rw.closed || rw.choicePick || S.isClosedFaqQuestion(askText))) {
    const wikiQ = S.queryWiki(askText, 2);
    const top = wikiQ.hits?.[0];
    const wikiOk =
      top?.speak &&
      decideSpeak({
        ask: askText,
        hits: [{ title: top.title, score: top.score, speak: top.speak, source: "wiki" }]
      }).action === "answer";
    if (wikiOk) {
      const answer = S.stripIntroBoilerplate(S.clipUtterance(top.speak, 160));
      return S.playAnswer(answer, "WAKE_ANSWER", state, a2aTrace, kbStatus, qFp, "wiki", {
        cacheQuestion: askText
      });
    }
  }

  if (!useBiz && rw.choicePick && faqHit?.answer) {
    S.debugLog.info("Strategy", "选题追问秒答", {
      choice: rw.choice,
      rewritten: askText.slice(0, 40),
      title: faqHit.title
    });
    const answer = S.stripIntroBoilerplate(S.clipUtterance(faqHit.answer, 160));
    return S.playAnswer(answer, "WAKE_ANSWER", state, a2aTrace, kbStatus, qFp, "faq", {
      cacheQuestion: askText
    });
  }
  if (
    !useBiz &&
    (rw.closed || S.isClosedFaqQuestion(askText) || state.mode === S.INTERACTION_MODE.HA_ASK) &&
    S.shouldFaqInstant(askText, faqHit, {
      minScore: rw.closed || S.isClosedFaqQuestion(askText) ? 22 : 45
    })
  ) {
    const answer = S.stripIntroBoilerplate(S.clipUtterance(faqHit.answer, 160));
    S.debugLog.info("Strategy", "闭题 FAQ 秒答", {
      text: askText.slice(0, 40),
      title: faqHit?.title,
      score: faqHit?.score
    });
    return S.playAnswer(answer, "WAKE_ANSWER", state, a2aTrace, kbStatus, qFp, "faq", {
      cacheQuestion: askText
    });
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
