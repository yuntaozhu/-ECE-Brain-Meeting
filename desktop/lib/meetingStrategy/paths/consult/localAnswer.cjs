/**
 * 本地秒答：缓存 / Wiki / FAQ / 闭题兜底
 */
const S = require("./kit.cjs");

/**
 * @returns {object|null}
 */
function tryLocalAnswer(ctx) {
  const { agenda, state, a2aTrace, kbStatus, qFp, askText, rw, useBiz, lastFloor } = ctx;

  const cached = S.lookupAnswer(state.meetingId, askText) || S.lookupAnswer(state.meetingId, lastFloor);
  if (cached?.tts && !useBiz) {
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

  if (!useBiz && (rw.closed || rw.choicePick || S.isClosedFaqQuestion(askText))) {
    const wikiQ = S.queryWiki(askText, 2);
    const top = wikiQ.hits?.[0];
    if (top?.speak && (top.score || 0) >= 8) {
      const answer = S.stripIntroBoilerplate(S.clipUtterance(top.speak, 160));
      return S.playAnswer(answer, "WAKE_ANSWER", state, a2aTrace, kbStatus, qFp, "wiki", {
        cacheQuestion: askText
      });
    }
  }

  const faqHit = S.matchFaqInstant(askText);
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
    return S.playAnswer(answer, "WAKE_ANSWER", state, a2aTrace, kbStatus, qFp, "faq", {
      cacheQuestion: askText
    });
  }

  if (!useBiz && (rw.closed || S.isClosedFaqQuestion(askText))) {
    S.debugLog.info("Strategy", "闭题未命中词条，本地兜底", { text: askText.slice(0, 40) });
    let missAns = "";
    if (/(你是谁|你是什么|你叫什么)/.test(askText)) missAns = S.IDENTITY_LINE;
    else if (/(会议主题|开什么会|今天.*主题|这次会议的主题)/.test(askText)) {
      missAns = S.matchFaqInstant("今天会议主题是什么")?.answer || `今天主题是${agenda}。`;
    } else {
      missAns = S.CLOSED_MISS_LINE;
    }
    return S.playAnswer(missAns, "WAKE_ANSWER", state, a2aTrace, kbStatus, qFp, "closed-miss", {
      cacheQuestion: askText
    });
  }

  return null;
}

module.exports = { tryLocalAnswer };
