/**
 * 本地秒答：缓存 / Wiki / FAQ / 闭题兜底
 * 有豆包 Key 时仍优先 FAQ/Wiki 秒答；未命中再放行 MeetingAgent。
 */
const S = require("./kit.cjs");
const { isTruncatedAsk } = require("../../agent/relevance.cjs");

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

/** 长问补规范检索串，避免「才能使用这个课程」把条件 FAQ 挤出 TopK */
function faqLookupQueries(askText) {
  const q = String(askText || "").trim();
  const list = [q];
  if (/条件|具备/.test(q)) {
    list.push("我园要具备什么条件？", "开办要具备什么条件？");
  }
  if (/普惠/.test(q)) list.push("普惠型幼儿园可以做全园美语吗？");
  if (/收费|多少钱|如何收费|怎么收费/.test(q)) list.push("全园美语系统怎么收费？", "你们是如何收费的？");
  if (/开口|认可/.test(q)) list.push("老师不敢开口家长怎么认可？");
  if (/^(你|您)?(如何|怎么)做/.test(q.replace(/[？?。！!\s]/g, "")) || /具体要如何做|如何落地/.test(q)) {
    list.push("从签约到落地要做哪些准备", "具体要如何做");
  }
  return [...new Set(list.filter(Boolean))];
}

function bestFaqHit(askText) {
  let best = null;
  for (const cand of faqLookupQueries(askText)) {
    const hit = S.matchFaqInstant(cand);
    if (!hit?.answer) continue;
    if (!best || (hit.score || 0) > (best.score || 0)) best = hit;
  }
  return best;
}

/**
 * @returns {object|null}
 */
function tryLocalAnswer(ctx) {
  const { agenda, state, a2aTrace, kbStatus, qFp, askText, rw, useBiz, lastFloor } = ctx;
  if (isTruncatedAsk(askText) || isTruncatedAsk(lastFloor)) return null;

  const idOrAgenda = tryIdentityOrAgenda(ctx);
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

  const faqHit = bestFaqHit(askText);
  // 场景闭题：有 Key 也秒答（日志场：普惠/条件/收费/开口家长）
  const sceneAsk =
    /普惠|条件|具备|专业|培训班|区别|教育局|赚钱|营收|收费|如何收费|怎么收费|太贵|付不起|信心|支持|开办|说服家长|不敢开口|开口.{0,8}认可|家长.{0,6}认可|^(你|您)?(如何|怎么)做/.test(
      askText.replace(/[？?。！!\s]/g, "")
    ) ||
    (/普惠|条件|具备|收费|开口|认可|如何做|怎么做/.test(askText) &&
      !/(什么是全园美语|全园美语(课|系统)?是什么)/.test(askText));
  // 场景问：分数够且标题/正文对齐即可秒答（不因 complex 被挡）
  if (!useBiz && sceneAsk && faqHit?.answer && (faqHit.score || 0) >= 18) {
    const answer = S.stripIntroBoilerplate(S.clipUtterance(faqHit.answer, 160));
    const badDef =
      S.isDefinitionSpeak(answer) && !/(是什么|什么是)/.test(askText);
    if (!badDef) {
      S.debugLog.info("Strategy", "场景 FAQ 秒答", {
        text: askText.slice(0, 40),
        title: faqHit.title,
        score: faqHit.score
      });
      return S.playAnswer(answer, "WAKE_ANSWER", state, a2aTrace, kbStatus, qFp, "faq", {
        cacheQuestion: askText
      });
    }
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
