/** 先开口 / Wiki 意图挑页 / RAG 口播兜底 */
const { getPageBySlug } = require("../../knowledge");
const { normalizeDazhiAliases, isEnrollmentBenefitAsk } = require("../../meetingSession");
const { stripIntroBoilerplate, clipUtterance } = require("../../duplex");
const { diagnose } = require("./diagnose.cjs");
const {
  heuristicPlan,
  isOperateQuestion,
  isOperateBetterAsk,
  OPERATE_BETTER_TTS
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
  if (/落地|实施|开展|行事历|0.?1|申请|第一步|签约|准备/.test(q) || d.stage === "rollout") {
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
  } else if (isOperateQuestion(q) || (/经营|使用/.test(q) && !isEnrollmentBenefitAsk(q))) {
    // 「经营得更好」已在上面；其它经营/使用走探索抓手，禁止定义页
    const forHeuristic = /还有|其他方案|别的方案|换一条/.test(q) ? q : q.replace(/得更好/g, "");
    source = heuristicPlan({ ...d, stage: "explore" }, forHeuristic).tts;
  } else if (/招生/.test(q) && /(怎么|如何|破局|招不到)/.test(q)) {
    source = heuristicPlan({ ...d, stage: "explore" }, q).tts;
  } else {
    source = heuristicPlan(d, q).tts;
  }
  if (isDefinitionSpeak(source)) {
    source = isOperateBetterAsk(q)
      ? OPERATE_BETTER_TTS
      : heuristicPlan({ ...d, stage: "explore" }, q).tts;
  }
  if (isDefinitionSpeak(source)) source = OPERATE_BETTER_TTS;
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
  const operate = isOperateQuestion(q) || isOperateBetterAsk(q);
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
  const operate = isOperateQuestion(question);
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
