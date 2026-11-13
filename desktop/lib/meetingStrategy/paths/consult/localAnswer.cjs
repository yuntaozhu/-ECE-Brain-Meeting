/**
 * 本地秒答：缓存 / Wiki / FAQ / 闭题兜底
 * 有豆包 Key 时仍优先 FAQ/Wiki 秒答；未命中再放行 MeetingAgent。
 * 出口只消费 decideSpeak 的类型与句子（含经营档），不因 useBiz 跳过澄清/复述/脚本。
 */
const S = require("./kit.cjs");
const { isTruncatedAsk, focusAsk, offlineFollow, hostRest } = require("../../agent/relevance.cjs");
const { decideSpeak } = require("../../decideSpeak.cjs");
const {
  matchChainStep,
  findChainForHypothesis,
  loadChains,
  isHowDoAsk
} = require("../../../knowledge/chains/match.cjs");
const { evaluateCommitRelease } = require("../../../intelligence/commitGate.cjs");
const { isOpenIntelligenceLane, classifyAskLane } = require("../../../intelligence/askLane.cjs");
const { commitDraft, releaseDraft } = require("../../../intelligence/draft.cjs");
const { observeTurn } = require("../../../intelligence/observe.cjs");
const { isTopicShift } = require("../../../intelligence/topicShift.cjs");
const { evaluateFrameMatch, isBannedCard } = require("../../../intelligence/frameGate.cjs");

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

/** 在剥离唤醒词之前认确认/催答，避免「是的，大智请回复」变成「请回复」。 */
function actSource(ctx) {
  return String(ctx.lastFloor || ctx.askText || "").trim();
}

function commitOnlyAsk(text) {
  const t = String(text || "").trim();
  if (!t) return false;
  return S.rx("commands", "commitAct").test(t) && !S.rx("operators", "interrogative").test(t);
}

function urgeOnlyAsk(text) {
  const t = String(text || "").trim();
  if (!t) return false;
  return S.rx("commands", "urgeAct").test(t);
}

function dialogueControlAsk(text) {
  const t = String(text || "").trim();
  if (!t) return false;
  return S.rx("commands", "dialogueControl").test(t);
}

function speakForPendingSegment(segment) {
  const { getFaqSections, extractFaqSpeakText } = require("../../../knowledge/corpus.cjs");
  const needle = String(segment || "")
    .replace(/[「」""''？?。！!，,]/g, "")
    .trim();
  if (needle.length < 4) return "";
  const key = needle.slice(0, 16);
  for (const sec of getFaqSections()) {
    const title = String(sec.title || "");
    if (!title.includes(key)) continue;
    const speak = extractFaqSpeakText(sec.body || "");
    if (speak) return speak;
  }
  return "";
}

function completeAsk(askText) {
  return (
    !isTruncatedAsk(askText) &&
    String(askText || "").length >= 8 &&
    S.rx("operators", "interrogative").test(askText)
  );
}

/** 已经答出的资料卡。近义确认、续播尾巴、脚本和探针不是可延续的实体。 */
function materialAnswer(design) {
  if (!design || design.type !== "answer") return false;
  const id = String(design.hypothesisId || "");
  if (id.length < 4) return false;
  if (id === "carry" || id === "probe" || id === "script" || id === "alternate_path") return false;
  return true;
}

/** 近义确认和复述不能被「往下看」提交成再念一遍。 */
function voidHypothesis(design) {
  if (!design) return false;
  if (design.type === "repeat") return true;
  if (design.type !== "clarify") return false;
  return design.hypothesisId === "probe" || design.depth === "partial";
}

function commitPendingSpeak(state, askText) {
  if (!commitOnlyAsk(askText) && !urgeOnlyAsk(askText)) return "";
  const design = state && state.lastDesign;
  if (voidHypothesis(design)) return "";
  if (!design || design.type !== "clarify" || !Array.isArray(design.segments)) return "";
  const segs = design.segments.map((s) => String(s || "").trim()).filter(Boolean);
  let picked = "";
  if (segs.length === 1) picked = segs[0];
  else {
    const hit = segs.filter((s) => {
      const key = s.replace(/[「」？?。]/g, "").slice(0, 8);
      return key.length >= 2 && String(askText).includes(key);
    });
    if (hit.length === 1) picked = hit[0];
  }
  if (!picked) return "";
  const speak = speakForPendingSegment(picked);
  if (!speak) return "";
  state.lastDesign = {
    type: "answer",
    hypothesisId: picked.slice(0, 24),
    segments: [],
    depth: "final"
  };
  state.lastOpenAsk = "";
  state.pendingAsk = "";
  return speak;
}

function skipResult(state, a2aTrace, kbStatus, qFp, reason, speakReason) {
  return {
    shouldIntervene: false,
    interventionText: "",
    fullAnswer: "",
    reason,
    speakReason: speakReason || "",
    speakTitle: "",
    latestToDos: [],
    nextStageRecommendation: null,
    a2aTrace,
    arkConfigured: hasDoubaoKey(),
    arkMode: "skip",
    agentMode: state.mode,
    interactionMode: state.mode,
    kbStatus,
    questionFp: qFp || ""
  };
}

function tryLocalAnswer(ctx) {
  const rawFloor = actSource(ctx);
  let askText = focusAsk(ctx.askText);
  const { agenda, state, a2aTrace, kbStatus, qFp, rw, useBiz, lastFloor } = ctx;

  // 催答：用 Focus SSOT 重跑；有待确认假设时先提交
  if (urgeOnlyAsk(rawFloor) || commitOnlyAsk(rawFloor)) {
    const design = state?.lastDesign;
    if (!voidHypothesis(design)) {
      const pending = commitPendingSpeak(state, rawFloor);
      if (pending) {
        return S.playAnswer(pending, "WAKE_ANSWER", state, a2aTrace, kbStatus, qFp, "commit", {
          cacheQuestion: rawFloor,
          speakReason: "commit"
        });
      }
    }
    const { pickLatestFocus } = require("../../../intelligence/memory.cjs");
    const focus = pickLatestFocus(state, {
      reject: (t) => S.rx("commands", "urgeAct").test(t) || S.isRecallLastAsk(t)
    });
    const pendingAsk = focus.text || String(state?.pendingAsk || "").trim();
    if (pendingAsk.length >= 4 && (urgeOnlyAsk(rawFloor) || voidHypothesis(design))) {
      S.debugLog.info("Strategy", "催答重跑待答", {
        pendingAsk: pendingAsk.slice(0, 40),
        source: focus.source || "pendingAsk"
      });
      askText = focusAsk(pendingAsk);
      ctx.askText = askText;
      ctx._urgeReplay = true;
    } else if (commitOnlyAsk(rawFloor) && materialAnswer(design)) {
      const rest = hostRest(String(ctx.opts?.lastHostSpeakText || ""));
      if (rest) {
        return S.playAnswer(rest, "WAKE_ANSWER", state, a2aTrace, kbStatus, qFp, "commit", {
          speakReason: "progress"
        });
      }
      return S.playAnswer(S.speakLine("pendingMiss"), "WAKE_ANSWER", state, a2aTrace, kbStatus, qFp, "clarify", {
        speakReason: "commit-empty"
      });
    } else if (voidHypothesis(design) || urgeOnlyAsk(rawFloor)) {
      return S.playAnswer(S.speakLine("pendingMiss"), "WAKE_ANSWER", state, a2aTrace, kbStatus, qFp, "clarify", {
        speakReason: "urge-empty"
      });
    } else if (commitOnlyAsk(rawFloor)) {
      return skipResult(state, a2aTrace, kbStatus, qFp, "COMMIT_WAIT", "commit");
    }
  }

  if (dialogueControlAsk(rawFloor) && !S.isClosedFaqQuestion(askText) && !urgeOnlyAsk(rawFloor)) {
    return skipResult(state, a2aTrace, kbStatus, qFp, "CONTROL_SKIP", "dialogue-control");
  }

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
  // 仅二选一澄清的 segments 可并入短追问；完整新问或单焦点 probe 跳过，避免污染。
  const splitClarify =
    state?.lastDesign?.type === "clarify" && (state.lastDesign.segments || []).length === 2;
  if (!completeAsk(askText) && splitClarify) {
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
  }
  const retrieved = { hits };
  let lastHost = String(ctx.opts?.lastHostSpeakText || "");
  // 资料卡与澄清 probe 可作 prev；脚本/alternate_path 不当粘滞。
  let prevForBayes = (() => {
    const d = state?.lastDesign;
    if (!d) return null;
    if (materialAnswer(d)) return d;
    if (d.type === "clarify" && (d.hypothesisId === "probe" || (d.segments || []).length === 2)) return d;
    return null;
  })();
  // Wave R2：异题清粘滞——禁旧否定边界 carry / 旧卡 markov
  const shifted =
    completeAsk(askText) && isTopicShift(askText, prevForBayes, lastHost);
  if (shifted) {
    S.debugLog.info("Strategy", "异题清粘滞", {
      text: askText.slice(0, 40),
      prev: String(prevForBayes && prevForBayes.hypothesisId || "").slice(0, 48)
    });
    prevForBayes = null;
    lastHost = "";
    if (state) {
      state.lastDesign = null;
      if (state.lastIntelligence) {
        state.lastIntelligence = {
          ...state.lastIntelligence,
          sticky: { ...(state.lastIntelligence.sticky || {}), clearCarry: true }
        };
      }
    }
  }
  const bayes = decideSpeak({
    ask: askText,
    hits: retrieved?.hits || [],
    intent,
    script,
    prevDesign: prevForBayes,
    lastHost,
    meetingId: state?.meetingId || ""
  });
  const definitionMismatch =
    bayes.action === "answer" && S.isDefinitionSpeak(bayes.speak) && !S.rx("faq", "defMark").test(askText);

  const hadMaterial = materialAnswer(state?.lastDesign);

  // Wave R3：闭题有 FAQ 证据且贝叶斯未定答 → 强制念 FAQ（避免空洞确认）
  if (
    completeAsk(askText) &&
    (rw.closed || S.isClosedFaqQuestion(askText)) &&
    bayes.action !== "answer" &&
    !definitionMismatch
  ) {
    const closedFaq = S.matchFaqInstant(askText);
    const closedSpeak = String((closedFaq && closedFaq.answer) || "").trim();
    if (closedSpeak && !(isHowDoAsk(askText) && S.isDefinitionSpeak(closedSpeak))) {
      const line = S.stripIntroBoilerplate(S.clipUtterance(closedSpeak, 160));
      if (state) {
        state.lastDesign = {
          type: "answer",
          hypothesisId: String((closedFaq && closedFaq.title) || askText).slice(0, 120),
          segments: [],
          depth: "final"
        };
        state.lastOpenAsk = "";
        state.pendingAsk = "";
      }
      commitDraft(state, {
        text: line,
        arkMode: "faq",
        title: (closedFaq && closedFaq.title) || "",
        card: { title: (closedFaq && closedFaq.title) || "", speak: line },
        sticky: shifted ? { clearCarry: true } : undefined
      });
      S.debugLog.info("Strategy", "闭题 FAQ 强制秒答", {
        text: askText.slice(0, 40),
        title: String((closedFaq && closedFaq.title) || "").slice(0, 48),
        ...observeTurn(state, { gate: "committed", source: "faq", stage: "instant" })
      });
      return S.playAnswer(
        line,
        useBiz && !S.isClosedFaqQuestion(askText) ? "BIZ_ANSWER" : "WAKE_ANSWER",
        state,
        a2aTrace,
        kbStatus,
        qFp,
        "faq",
        {
          cacheQuestion: askText,
          speakReason: "closed-force",
          speakTitle: (closedFaq && closedFaq.title) || "",
          oralize: true
        }
      );
    }
  }

  function playChainHit(chainHit, preferredTitle) {
    if (!chainHit || !chainHit.answer) return null;
    if (state) {
      const hitChain =
        (preferredTitle && findChainForHypothesis(preferredTitle)) ||
        (loadChains() || []).find((c) => c.cardId && c.cardId === chainHit.cardId) ||
        findChainForHypothesis(state.lastDesign && state.lastDesign.hypothesisId);
      const keepId = String(
        (hitChain && hitChain.seedTitles && hitChain.seedTitles[0]) ||
          preferredTitle ||
          (state.lastDesign && state.lastDesign.hypothesisId) ||
          ""
      ).slice(0, 120);
      state.lastDesign = {
        type: "answer",
        hypothesisId: keepId,
        segments: [],
        depth: "final"
      };
      state.lastOpenAsk = "";
      state.pendingAsk = "";
      state.chainCardId = chainHit.cardId || "";
      state.chainStepIndex = chainHit.index;
    }
    S.debugLog.info("Strategy", "chain follow hit", {
      text: askText.slice(0, 40),
      cardId: chainHit.cardId,
      align: chainHit.align,
      seedAlign: chainHit.seedAlign,
      step: chainHit.ask.slice(0, 40)
    });
    const chainSpeak = S.stripIntroBoilerplate(S.clipUtterance(chainHit.answer, 160));
    commitDraft(state, {
      text: chainSpeak,
      arkMode: "chain",
      title: chainHit.ask || preferredTitle || "",
      card: { title: chainHit.ask || preferredTitle || "", speak: chainSpeak, align: chainHit.align }
    });
    return S.playAnswer(
      chainSpeak,
      useBiz && !S.isClosedFaqQuestion(askText) ? "BIZ_ANSWER" : "WAKE_ANSWER",
      state,
      a2aTrace,
      kbStatus,
      qFp,
      "chain",
      {
        cacheQuestion: askText,
        speakReason: "chain-follow",
        speakTitle: chainHit.ask || "",
        oralize: true
      }
    );
  }

  // How-do follow-ups after a material card: prefer offline chain over weak FAQ winners.
  if (hadMaterial && completeAsk(askText) && isHowDoAsk(askText)) {
    const preferredTitle = String(
      (bayes && bayes.shadow && bayes.shadow.formalWinnerId) || (bayes && bayes.title) || ""
    ).trim();
    const early = playChainHit(
      matchChainStep(askText, state.lastDesign.hypothesisId, { preferredTitle }),
      preferredTitle
    );
    if (early) return early;
  }

  if (bayes.action === "answer" && bayes.speak && !definitionMismatch) {
    const answer = S.stripIntroBoilerplate(S.clipUtterance(bayes.speak, 160));
    if (answer) {
      const release = evaluateCommitRelease(bayes, {
        forceRule: Boolean(ctx.opts?.forceRule),
        hasKey: hasDoubaoKey(),
        askText,
        state
      });
      if (release.release) {
        const laneInfo = classifyAskLane(askText);
        releaseDraft(state, {
          why: release.why,
          card: {
            title: bayes.title,
            posterior: bayes.posterior,
            align: bayes.align
          },
          debug: { askLane: laneInfo.lane, askLaneWhy: laneInfo.why }
        });
        S.debugLog.info("Strategy", "弱定卡放行 Agent", {
          text: askText.slice(0, 40),
          title: String(bayes.title || "").slice(0, 48),
          extra: bayes.extra,
          why: release.why,
          askLane: laneInfo.lane,
          ...observeTurn(state, {
            gate: "agent",
            source: "agent",
            posterior: bayes.posterior,
            align: bayes.align,
            releasedToAgent: true
          })
        });
        return null;
      }
      if (state && bayes.design) state.lastDesign = bayes.design;
      if (state) {
        state.lastOpenAsk = "";
        state.pendingAsk = "";
      }
      const ark = bayes.reason === "script" ? "kb-script" : "faq";
      commitDraft(state, {
        text: answer,
        arkMode: ark,
        title: bayes.title || "",
        card: {
          title: bayes.title,
          speak: answer,
          posterior: bayes.posterior,
          align: bayes.align
        }
      });
      S.debugLog.info("Strategy", bayes.reason === "script" ? "意图脚本秒答" : "贝叶斯 FAQ 秒答", {
        text: askText.slice(0, 40),
        title: bayes.title,
        reason: bayes.reason,
        ...observeTurn(state, { gate: "committed", source: ark, stage: "instant" })
      });
      return S.playAnswer(
        answer,
        useBiz && !S.isClosedFaqQuestion(askText) ? "BIZ_ANSWER" : "WAKE_ANSWER",
        state,
        a2aTrace,
        kbStatus,
        qFp,
        ark,
        {
          cacheQuestion: askText,
          speakReason: bayes.reason || "",
          speakTitle: bayes.title || "",
          oralize: true
        }
      );
    }
  }

  if (hadMaterial && completeAsk(askText)) {
    const preferredTitle = String(
      (bayes && bayes.shadow && bayes.shadow.formalWinnerId) || (bayes && bayes.title) || ""
    ).trim();
    const late = playChainHit(
      matchChainStep(askText, state.lastDesign && state.lastDesign.hypothesisId, { preferredTitle }),
      preferredTitle
    );
    if (late) return late;
  }

  // Formal empty / clarify, but shadow already grounded → kb-fallback (no silent).
  // Ability-probe style underspecified asks stay abstaining (shadow catalog).
  function playShadowKb() {
    const sh = bayes && bayes.shadow;
    if (!sh || sh.shadowAction !== "answer") return null;
    const ask = String(askText || "");
    if (S.rx("speak", "shadowRecoverSkip").test(ask)) return null;
    const preferredTitle = String(sh.shadowWinner || "").trim();
    if (isBannedCard(state, preferredTitle)) {
      S.debugLog.info("Strategy", "shadow 禁卡跳过", { title: preferredTitle.slice(0, 40) });
      return null;
    }
    const hypo = String((state && state.lastDesign && state.lastDesign.hypothesisId) || preferredTitle || "");
    const viaChain = playChainHit(matchChainStep(askText, hypo, { preferredTitle }), preferredTitle);
    if (viaChain) return viaChain;
    let speak = String(sh.shadowSpeak || "").trim();
    if (!speak) {
      const faq =
        S.matchFaqInstant(askText) || (preferredTitle ? S.matchFaqInstant(preferredTitle) : null);
      speak = String((faq && faq.answer) || "").trim();
    }
    if (!speak) return null;
    if (isHowDoAsk(askText) && S.isDefinitionSpeak(speak)) return null;
    // formal clarify + 影子受众不一致 / 异题无帧：禁止 kb-fallback 念错卡
    const frame = evaluateFrameMatch(ask, preferredTitle, speak);
    const divergedUnsafe =
      Boolean(sh.isDiverged) && Boolean(frame.ask && frame.ask.audience) && !frame.card.audience;
    if (!frame.ok || divergedUnsafe) {
      S.debugLog.info("Strategy", "shadow 帧不一致跳过 fallback", {
        text: ask.slice(0, 40),
        title: preferredTitle.slice(0, 40),
        diverged: Boolean(sh.isDiverged),
        why: frame.why || "diverged_unframed"
      });
      return null;
    }
    const softBayes = {
      action: "answer",
      reason: "shadow-kb",
      posterior: Number(bayes.posterior) || 0,
      align: bayes.align != null ? bayes.align : bayes.shadow && bayes.shadow.align,
      extra: bayes.extra != null ? bayes.extra : bayes.shadow && bayes.shadow.extra,
      title: preferredTitle,
      speak,
      shadow: bayes.shadow
    };
    const shadowRelease = evaluateCommitRelease(softBayes, {
      forceRule: Boolean(ctx.opts?.forceRule),
      hasKey: hasDoubaoKey(),
      askText: ask,
      state
    });
    if (shadowRelease.release) {
      releaseDraft(state, {
        why: shadowRelease.why,
        card: { title: preferredTitle, posterior: softBayes.posterior, align: softBayes.align }
      });
      S.debugLog.info("Strategy", "弱 shadow 定卡放行 Agent", {
        text: askText.slice(0, 40),
        title: preferredTitle.slice(0, 40),
        why: shadowRelease.why,
        ...observeTurn(state, {
          gate: "agent",
          source: "agent",
          posterior: softBayes.posterior,
          align: softBayes.align,
          releasedToAgent: true
        })
      });
      return null;
    }
    if (state) {
      state.lastDesign = {
        type: "answer",
        hypothesisId: preferredTitle || String(askText).slice(0, 40),
        segments: [],
        depth: "final"
      };
      state.lastOpenAsk = "";
      state.pendingAsk = "";
    }
    S.debugLog.info("Strategy", "shadow kb-fallback", {
      text: askText.slice(0, 40),
      title: preferredTitle.slice(0, 40)
    });
    const shadowSpeak = S.stripIntroBoilerplate(S.clipUtterance(speak, 160));
    commitDraft(state, {
      text: shadowSpeak,
      arkMode: "kb-fallback",
      title: preferredTitle || "",
      card: {
        title: preferredTitle,
        speak: shadowSpeak,
        posterior: softBayes.posterior,
        align: softBayes.align
      }
    });
    return S.playAnswer(
      shadowSpeak,
      useBiz && !S.isClosedFaqQuestion(askText) ? "BIZ_ANSWER" : "WAKE_ANSWER",
      state,
      a2aTrace,
      kbStatus,
      qFp,
      "kb-fallback",
      {
        cacheQuestion: askText,
        // Shadow already cleared the answer gate on a FAQ card; keep posterior for eval/logs.
        speakReason: "posterior",
        speakTitle: preferredTitle || "",
        oralize: true
      }
    );
  }

  if (
    completeAsk(askText) &&
    (bayes.action === "clarify" || bayes.action === "repeat") &&
    !definitionMismatch
  ) {
    const kb = playShadowKb();
    if (kb) return kb;
  }

  // 仅「怎么做」类追问在链未命中时立刻 pendingMiss；其它题继续走澄清/Agent。
  if (
    hadMaterial &&
    completeAsk(askText) &&
    isHowDoAsk(askText) &&
    !useBiz &&
    (bayes.action === "clarify" || bayes.action === "repeat")
  ) {
    const { commitFocusAsk } = require("../../../intelligence/memory.cjs");
    commitFocusAsk(state, askText, { asPending: true });
    return S.playAnswer(
      S.speakLine("pendingMiss"),
      "WAKE_ANSWER",
      state,
      a2aTrace,
      kbStatus,
      qFp,
      "clarify",
      { cacheQuestion: askText, speakReason: "pending-miss" }
    );
  }

  if (bayes.action === "clarify" || bayes.action === "repeat" || definitionMismatch) {
    const spoken = definitionMismatch
      ? decideSpeak({
          ask: askText,
          hits: (retrieved?.hits || []).filter((h) => !S.isDefinitionSpeak(h.speak || h.snippet)),
          intent,
          script,
          prevDesign: state?.lastDesign || null,
          meetingId: state?.meetingId || ""
        }).speak
      : bayes.speak;
    const line = String(spoken || bayes.speak || "").trim();
    const probeRelease =
      !line && (bayes.reason === "probe" || bayes.reason === "draft" || bayes.reason === "no_evidence");
    if (probeRelease) {
      const live =
        bayes.reason !== "no_evidence" &&
        hasDoubaoKey() &&
        !ctx.opts?.forceRule &&
        bayes.design?.depth === "final";
      if (live) return null;
      const focus = String(bayes.design?.segments?.[0] || "");
      const offline = offlineFollow(askText, lastHost, focus);
      if (state && bayes.design) state.lastDesign = bayes.design;
      // 完整问句无证据：记待答，不续播上一句
      if (!String(offline || "").trim()) {
        const complete = completeAsk(askText);
        // soft/strategy：无本地证据时放行 Agent，避免静默 skip
        if (
          complete &&
          hasDoubaoKey() &&
          !ctx.opts?.forceRule &&
          isOpenIntelligenceLane(askText)
        ) {
          const { commitFocusAsk } = require("../../../intelligence/memory.cjs");
          commitFocusAsk(state, askText, { asPending: true });
          const laneInfo = classifyAskLane(askText);
          releaseDraft(state, {
            why: `open_lane_no_evidence:${laneInfo.lane}`,
            debug: { askLane: laneInfo.lane, askLaneWhy: laneInfo.why }
          });
          S.debugLog.info("Strategy", "开车道无证据放行 Agent", {
            text: askText.slice(0, 40),
            askLane: laneInfo.lane,
            reason: bayes.reason || "no_evidence"
          });
          return null;
        }
        if (state && complete) {
          const { commitFocusAsk } = require("../../../intelligence/memory.cjs");
          commitFocusAsk(state, askText, { asPending: true });
        }
        // R10e：催答重跑或完整硬问无证据 → 坦诚短答，禁止纯 skip
        if (complete && (ctx._urgeReplay || !isOpenIntelligenceLane(askText))) {
          const clipAsk = S.clipUtterance(askText, 36);
          const honest =
            S.speakFill("focusGapHonest", { ask: clipAsk }) ||
            S.speakLine("pendingMiss");
          S.debugLog.info("Strategy", "Focus 无证据坦诚", {
            text: askText.slice(0, 40),
            urge: Boolean(ctx._urgeReplay)
          });
          return S.playAnswer(honest, "WAKE_ANSWER", state, a2aTrace, kbStatus, qFp, "clarify", {
            speakReason: "focus-gap-honest",
            speakKind: "meta"
          });
        }
        return skipResult(state, a2aTrace, kbStatus, qFp, "OK", bayes.reason || "no_evidence");
      }
      return S.playAnswer(offline, useBiz ? "BIZ_ANSWER" : "WAKE_ANSWER", state, a2aTrace, kbStatus, qFp, bayes.reason, {
        cacheQuestion: askText,
        speakReason: bayes.reason || "",
        speakTitle: bayes.title || ""
      });
    }
    if (line) {
      if (state && bayes.design) state.lastDesign = bayes.design;
      if (state && (bayes.reason === "near" || bayes.reason === "probe")) {
        if (!isTruncatedAsk(askText)) {
          const { commitFocusAsk } = require("../../../intelligence/memory.cjs");
          commitFocusAsk(state, askText, { asPending: true });
        } else {
          state.lastOpenAsk = String(askText || "").slice(0, 200);
          state.lastOpenAskAt = Date.now();
        }
      }
      return S.playAnswer(line, useBiz ? "BIZ_ANSWER" : "WAKE_ANSWER", state, a2aTrace, kbStatus, qFp, bayes.action, {
        cacheQuestion: askText,
        speakReason: bayes.reason || "",
        speakTitle: bayes.title || ""
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
