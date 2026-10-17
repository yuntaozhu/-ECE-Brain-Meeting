/** 先开口 / Wiki 意图挑页 / RAG 口播兜底。句式与词条映射读 schema。 */
const { getPageBySlug } = require("../../knowledge");
const { normalizeDazhiAliases, isEnrollmentBenefitAsk } = require("../../meetingSession");
const { stripIntroBoilerplate, clipUtterance } = require("../../duplex");
const { load, rx, speakLine } = require("../../knowledge/schemaStore.cjs");
const { diagnose } = require("./diagnose.cjs");
const {
  heuristicPlan,
  isOperateQuestion,
  isOperateBetterAsk,
  isProfitAsk,
  isRoiConfirmAsk,
  isHowCalcAsk,
  isParentReasonAsk,
  isAlternatePathAsk,
  OPERATE_BETTER_TTS,
  PROFIT_TTS,
  ROI_CONFIRM_TTS,
  HOW_CALC_TTS,
  PARENT_REASON_TTS
} = require("./heuristics.cjs");
const { isDefinitionSpeak } = require("./speakGuards.cjs");

function pat(name) {
  return rx("classify", name);
}

function pushSlugs(slugs, list) {
  for (const s of list || []) {
    if (s && !slugs.includes(s)) slugs.push(s);
  }
}

function buildFastLead(question, diag) {
  const q = normalizeDazhiAliases(String(question || ""));
  const d = diag || diagnose({ question: q });
  let source = "";
  if (isEnrollmentBenefitAsk(q)) {
    source =
      getPageBySlug("ledger-3-enrollment")?.speak || speakLine("enrollmentLeadFallback");
    const lead = clipUtterance(source, 90);
    return { lead, follow: "", source };
  }
  if (isRoiConfirmAsk(q) || d.stage === "roi-confirm") {
    source = heuristicPlan({ ...d, stage: "roi-confirm" }, q).tts || ROI_CONFIRM_TTS;
  } else if (isHowCalcAsk(q) || d.stage === "how-calc") {
    const body = String(getPageBySlug("ledger-3-enrollment")?.body || "");
    const factBite = body.match(pat("leadYearFact"))?.[0];
    source = factBite
      ? `${HOW_CALC_TTS.replace(/。$/, "")}；资料写的是${factBite}。`
      : heuristicPlan({ ...d, stage: "how-calc" }, q).tts || HOW_CALC_TTS;
  } else if (isParentReasonAsk(q) || (d.stage === "show-value" && pat("leadParentCue").test(q))) {
    source = heuristicPlan({ ...d, stage: "show-value" }, q).tts || PARENT_REASON_TTS;
  } else if (isProfitAsk(q) || d.stage === "profit") {
    const ledger3 = String(getPageBySlug("ledger-3-enrollment")?.speak || "")
      .replace(/[。．\s]+$/, "")
      .trim();
    const plan = heuristicPlan({ ...d, stage: "profit" }, q);
    if (ledger3 && !isDefinitionSpeak(ledger3)) {
      source = `${clipUtterance(plan.tts || PROFIT_TTS, 55)}。${clipUtterance(ledger3, 45)}`;
    } else {
      source = plan.tts || PROFIT_TTS;
    }
  } else if (pat("leadRollout").test(q) || d.stage === "rollout") {
    const applySpeak = getPageBySlug("apply-project")?.speak || "";
    const rollSpeak = getPageBySlug("rollout-calendar-phase1")?.speak || "";
    if (pat("leadApply").test(q) && applySpeak) {
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
    const forHeuristic = q.replace(new RegExp(load().classify.patterns.leadBetter, "g"), "");
    const explore = String(
      heuristicPlan({ ...d, stage: "explore" }, forHeuristic).tts || OPERATE_BETTER_TTS
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
    (pat("leadOperateUse").test(q) && !isEnrollmentBenefitAsk(q) && !isProfitAsk(q))
  ) {
    const forHeuristic = isAlternatePathAsk(q)
      ? q
      : q
          .replace(new RegExp(load().classify.patterns.leadHardship, "g"), "")
          .replace(new RegExp(load().classify.patterns.leadBetter, "g"), "");
    source = heuristicPlan({ ...d, stage: "explore" }, forHeuristic || q).tts;
  } else if (pat("leadRecruitHow").test(q) && pat("leadRecruitHowAnd").test(q)) {
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
  const lead = clipUtterance(source, 90);
  return { lead, follow: "", source };
}

function pickWikiForIntent(question, retrieval, diag) {
  const q = normalizeDazhiAliases(String(question || ""));
  const slugs = [];
  for (const row of load().classify.wikiIntent || []) {
    if (row.enrollment && (isEnrollmentBenefitAsk(q) || (pat("leadRecruitHow").test(q) && row.and && new RegExp(row.and).test(q)))) {
      pushSlugs(slugs, row.slugs);
      continue;
    }
    if (row.roi && (isRoiConfirmAsk(q) || diag?.stage === "roi-confirm")) {
      pushSlugs(slugs, row.slugs);
      continue;
    }
    if (row.howCalc && (isHowCalcAsk(q) || diag?.stage === "how-calc")) {
      pushSlugs(slugs, row.slugs);
      continue;
    }
    if (row.parent && (isParentReasonAsk(q) || diag?.stage === "show-value")) {
      pushSlugs(slugs, row.slugs);
      continue;
    }
    if (row.profit && (isProfitAsk(q) || diag?.stage === "profit")) {
      pushSlugs(slugs, row.slugs);
      continue;
    }
    if (row.operate && (isOperateBetterAsk(q) || isOperateQuestion(q) || (row.test && new RegExp(row.test).test(q)))) {
      pushSlugs(slugs, row.slugs);
      continue;
    }
    if (row.stage && (diag?.stage === row.stage || (row.test && new RegExp(row.test).test(q)))) {
      pushSlugs(slugs, row.slugs);
      continue;
    }
    if (row.all && row.all.every((src) => new RegExp(src).test(q))) {
      pushSlugs(slugs, row.slugs);
      continue;
    }
    if (row.test && !row.stage && !row.operate && !row.enrollment && new RegExp(row.test).test(q)) {
      pushSlugs(slugs, row.slugs);
    }
  }
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
