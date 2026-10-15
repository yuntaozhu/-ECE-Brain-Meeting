/** 先开口 / Wiki 意图挑页 / RAG 口播兜底 */
const { getPageBySlug } = require("../../knowledge");
const { normalizeDazhiAliases, isEnrollmentBenefitAsk } = require("../../meetingSession");
const { stripIntroBoilerplate, clipUtterance } = require("../../duplex");
const { diagnose } = require("./diagnose.cjs");
const {
  heuristicPlan,
  isOperateQuestion,
  isOperateBetterAsk,
  isProfitAsk,
  isRoiConfirmAsk,
  isHowCalcAsk,
  isParentReasonAsk,
  OPERATE_BETTER_TTS,
  PROFIT_TTS,
  ROI_CONFIRM_TTS,
  HOW_CALC_TTS,
  PARENT_REASON_TTS
} = require("./heuristics.cjs");
const { isDefinitionSpeak } = require("./speakGuards.cjs");

function buildFastLead(question, diag) {
  const q = normalizeDazhiAliases(String(question || ""));
  const d = diag || diagnose({ question: q });
  let source = "";
  // 「对招生有帮助吗」走三笔账第三笔口播，禁止探索态样板班
  if (isEnrollmentBenefitAsk(q)) {
    source =
      getPageBySlug("ledger-3-enrollment")?.speak ||
      "有帮助。美语特色要成为家长选择园所的理由；参考测算是新增一名幼儿约一年一点八万、在园三年约五点四万，可能盖过三万九，但不保证招满。";
    const lead = clipUtterance(source, 90);
    return { lead, follow: "", source };
  }
  // 「能回本吗」：先答能不能 + 测算边界，禁止套「引入后盈利算三笔账」
  if (isRoiConfirmAsk(q) || d.stage === "roi-confirm") {
    source = heuristicPlan({ ...d, stage: "roi-confirm" }, q).tts || ROI_CONFIRM_TTS;
  } else if (isHowCalcAsk(q) || d.stage === "how-calc") {
    // 「怎么计算出来的」：拆测算，禁止复读盈利半句或议程
    const body = String(getPageBySlug("ledger-3-enrollment")?.body || "");
    const factBite = body.match(/每年约[^。]{4,40}/)?.[0];
    source = factBite
      ? `${HOW_CALC_TTS.replace(/。$/, "")}；资料写的是${factBite}。`
      : heuristicPlan({ ...d, stage: "how-calc" }, q).tts || HOW_CALC_TTS;
  } else if (isParentReasonAsk(q) || (d.stage === "show-value" && /理由|看得见/.test(q))) {
    // 「家长选择理由」：证据三样，禁止复读「要成为理由」
    source = heuristicPlan({ ...d, stage: "show-value" }, q).tts || PARENT_REASON_TTS;
  } else if (isProfitAsk(q) || d.stage === "profit") {
    // 「如何盈利」：三笔账投入产出，禁止样板班/菲教开场文不对题
    const ledger3 = String(getPageBySlug("ledger-3-enrollment")?.speak || "")
      .replace(/[。．\s]+$/, "")
      .trim();
    const plan = heuristicPlan({ ...d, stage: "profit" }, q);
    if (ledger3 && !isDefinitionSpeak(ledger3)) {
      source = `${clipUtterance(plan.tts || PROFIT_TTS, 55)}。${clipUtterance(ledger3, 45)}`;
    } else {
      source = plan.tts || PROFIT_TTS;
    }
  } else if (/落地|实施|开展|行事历|0.?1|申请|第一步|签约|准备/.test(q) || d.stage === "rollout") {
    const applySpeak = getPageBySlug("apply-project")?.speak || "";
    const rollSpeak = getPageBySlug("rollout-calendar-phase1")?.speak || "";
    if (/签约|申请|准备/.test(q) && applySpeak) {
      const a = applySpeak.replace(/[。．\s]+$/, "");
      const r = String(rollSpeak || "").replace(/[。．\s]+$/, "");
      source = r ? `${a}。${r}。` : `${a}。`;
    } else {
      source = rollSpeak || applySpeak;
    }
  } else if (isOperateBetterAsk(q)) {
    const ledger = String(getPageBySlug("ledger-3-enrollment")?.speak || "")
      .replace(/[。．\s]+$/, "")
      .trim();
    const explore = String(
      heuristicPlan({ ...d, stage: "explore" }, q.replace(/得更好/g, "")).tts || OPERATE_BETTER_TTS
    )
      .replace(/[。．\s]+$/, "")
      .trim();
    if (ledger && !isDefinitionSpeak(ledger)) {
      source = `${clipUtterance(explore, 55)}。${clipUtterance(ledger, 40)}`;
    } else {
      source = explore || OPERATE_BETTER_TTS;
    }
  } else if (
    isOperateQuestion(q) ||
    (/经营|使用/.test(q) && !isEnrollmentBenefitAsk(q) && !isProfitAsk(q))
  ) {
    // 「经营得更好」已在上面；其它经营/使用走探索抓手，禁止定义页
    // 勿把「不是很好」喂给换路径启发式；仅明确换方案才保留原句
    const { isAlternatePathAsk: altAsk } = require("./heuristics.cjs");
    const forHeuristic = altAsk(q)
      ? q
      : q.replace(/不是很好|不太好/g, "").replace(/得更好/g, "");
    source = heuristicPlan({ ...d, stage: "explore" }, forHeuristic || q).tts;
  } else if (/招生/.test(q) && /(怎么|如何|破局|招不到)/.test(q)) {
    source = heuristicPlan({ ...d, stage: "explore" }, q).tts;
  } else {
    source = heuristicPlan(d, q).tts;
  }
  if (isDefinitionSpeak(source)) {
    source = isRoiConfirmAsk(q)
      ? ROI_CONFIRM_TTS
      : isHowCalcAsk(q)
        ? HOW_CALC_TTS
        : isParentReasonAsk(q)
          ? PARENT_REASON_TTS
          : isProfitAsk(q)
            ? PROFIT_TTS
            : isOperateBetterAsk(q)
              ? OPERATE_BETTER_TTS
              : heuristicPlan({ ...d, stage: "explore" }, q).tts;
  }
  if (isDefinitionSpeak(source)) {
    // P0：禁止把 OPERATE_BETTER 当任意问句最后兜底
    source = isRoiConfirmAsk(q)
      ? ROI_CONFIRM_TTS
      : isHowCalcAsk(q)
        ? HOW_CALC_TTS
        : isParentReasonAsk(q)
          ? PARENT_REASON_TTS
          : isProfitAsk(q)
            ? PROFIT_TTS
            : isOperateBetterAsk(q)
              ? OPERATE_BETTER_TTS
              : "";
  }
  // 一次播完整短答（约 90 字），避免在「；」处硬切导致听感半截
  const lead = clipUtterance(source, 90);
  return { lead, follow: "", source };
}

function pickWikiForIntent(question, retrieval, diag) {
  const q = normalizeDazhiAliases(String(question || ""));
  const slugs = [];
  if (diag?.stage === "rollout" || /落地|实施|开展|行事历|0.?1|申请|第一步/.test(q)) {
    slugs.push("rollout-calendar-phase1", "apply-project");
  }
  if (isEnrollmentBenefitAsk(q) || (/招生/.test(q) && /(有帮助|有没有用|能帮)/.test(q))) {
    slugs.push("ledger-3-enrollment", "quan-yuan-meiyu");
  }
  if (isRoiConfirmAsk(q) || diag?.stage === "roi-confirm") {
    slugs.push("ledger-3-enrollment", "ledger-1-service-radius", "quan-yuan-meiyu");
  }
  if (isHowCalcAsk(q) || diag?.stage === "how-calc") {
    slugs.push("ledger-3-enrollment", "ledger-1-service-radius", "ledger-2-premium");
  }
  if (isParentReasonAsk(q) || diag?.stage === "show-value") {
    slugs.push("ledger-3-enrollment", "benefit-07-chengguozhan");
  }
  if (isProfitAsk(q) || diag?.stage === "profit") {
    slugs.push("ledger-3-enrollment", "ledger-2-premium", "ledger-1-service-radius", "quan-yuan-meiyu");
  }
  // 经营/落地：优先行事历与三笔账，勿把定义页塞进 instantAnswer
  if (isOperateBetterAsk(q) || isOperateQuestion(q) || /经营得更好|把园经营|如何使用|怎么用/.test(q)) {
    slugs.push("ledger-3-enrollment", "rollout-calendar-phase1", "apply-project");
  }
  if (/八大|权益/.test(q)) slugs.push("eight-core-benefits");
  if (/全美语系统|全园美语/.test(q) && /是什么|什么是/.test(q)) slugs.push("quan-yuan-meiyu");
  if (diag?.stage === "teacher" || /老师|Teacher说/.test(q)) slugs.push("benefit-05-teacher-shuo");
  if (!slugs.length) return retrieval;
  const seen = new Set();
  const picked = [];
  const operate =
    isOperateQuestion(q) || isOperateBetterAsk(q) || isProfitAsk(q) || isRoiConfirmAsk(q);
  for (const slug of slugs) {
    const fromHits = (retrieval?.hits || []).find((h) => h.slug === slug);
    const page = fromHits || getPageBySlug(slug);
    if (!page || seen.has(slug)) continue;
    const speak = page.speak || "";
    if (operate && isDefinitionSpeak(speak)) continue;
    seen.add(slug);
    picked.push({
      title: page.title,
      slug: page.slug || slug,
      score: 0.95,
      snippet: page.speak || page.snippet || "",
      speak,
      source: "wiki",
      body: page.body
    });
  }
  if (!picked.length) return retrieval;
  const instant = picked.find((p) => !isDefinitionSpeak(p.speak))?.speak || "";
  return {
    ...(retrieval || {}),
    hits: [...picked, ...((retrieval?.hits || []).filter((h) => !seen.has(h.slug)))],
    instantAnswer: instant || (operate ? "" : retrieval?.instantAnswer || ""),
    mode: "wiki-intent"
  };
}

function ragSpeakFallback(retrieval, question) {
  const operate = isOperateQuestion(question) || isProfitAsk(question) || isOperateBetterAsk(question);
  const instantRaw = String(retrieval?.instantAnswer || "").trim();
  const instant = operate && isDefinitionSpeak(instantRaw) ? "" : instantRaw;
  if (instant.length >= 12) {
    return {
      tts: stripIntroBoilerplate(clipUtterance(instant, 160)),
      steps: ["对照词条口播口径落地", "需要时再追问具体步骤"],
      risks: [],
      cite: (retrieval.hits || []).slice(0, 2).map((h) => h.title || h.slug).filter(Boolean),
      analysis: ""
    };
  }
  const hit = (retrieval?.hits || []).find((h) => !(operate && isDefinitionSpeak(h.speak || h.snippet || "")));
  if (!hit) return null;
  // Wiki 整页优先用口播段，避免切块半句
  let bite = String(hit.speak || "").replace(/\s+/g, " ").trim();
  if (bite.length < 12) {
    bite = String(hit.snippet || "").replace(/\s+/g, " ").trim();
  }
  bite = bite.replace(/^#+\s*[^\n]+\n?/, "").replace(/^A[:：]\s*/i, "").replace(/^口播[：:]\s*/, "");
  if (bite.length < 20) {
    bite = String(retrieval.preview || "")
      .replace(/【[^】]+】/g, " ")
      .replace(/口播[：:]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }
  if (bite.length < 24) return null;
  const tts = stripIntroBoilerplate(clipUtterance(bite, 160));
  if (tts.length < 12) return null;
  const fromWiki = hit.source === "wiki" || Boolean(hit.slug);
  return {
    tts,
    steps: [
      `依据「${hit.title || "词条"}」先对齐口径`,
      "本周选一个班试点验证",
      "有数据后再扩"
    ].slice(0, 3),
    risks: fromWiki ? [] : ["知识片段较碎，建议再追问具体场景"],
    cite: [hit.title || hit.slug].filter(Boolean),
    analysis: ""
  };
}

module.exports = {
  buildFastLead,
  pickWikiForIntent,
  ragSpeakFallback
};
