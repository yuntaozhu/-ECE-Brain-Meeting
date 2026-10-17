/**
 * 闭题 / 复杂题 / 经营意图 / 残句判定。
 * 句式只读 knowledge/schema/query-classify.json。
 */
const { isQuestionForm } = require("../../duplex");
const { normalizeDazhiAliases, isEnrollmentBenefitAsk } = require("../../meetingSession");
const { load, rx } = require("../../knowledge/schemaStore.cjs");

function lim(name) {
  const value = load().classify.limits[name];
  if (value == null) throw new Error("missing classify limit " + name);
  return value;
}

function pat(name) {
  return rx("classify", name);
}

function compileExport(name) {
  return pat(name);
}

function peelClosedFaqCore(text) {
  const t = normalizeDazhiAliases(String(text || "").trim());
  if (!t) return null;
  const entity = load().classify.patterns.entity;
  const tail = load().classify.patterns.peelTailMark;
  const head = load().classify.patterns.peelWhatIsHead;
  const gap = lim("peelEntityGap");
  const whatGap = lim("peelWhatIsGap");
  const mEntityFirst = t.match(
    new RegExp(`((?:${entity})[^。；;！!？?\\n]{0,${gap}}(?:${tail})[？?]?\\s*)$`, "i")
  );
  if (mEntityFirst) return mEntityFirst[1].replace(/^[，,。.\s]+/, "").trim();
  const mWhatIs = t.match(
    new RegExp(`((?:${head})\\s*(?:${entity})[^。；;！!？?\\n]{0,${whatGap}}[？?]?\\s*)$`, "i")
  );
  if (mWhatIs) return mWhatIs[1].replace(/^[，,。.\s]+/, "").trim();
  if (pat("peelEndMark").test(t) && t.length > lim("peelLongMin")) {
    const parts = t.split(/[。！？!?；;\n]/).map((p) => p.trim()).filter(Boolean);
    const last = parts[parts.length - 1];
    if (last && pat("closedFaq").test(last) && last.length <= lim("peelLastMax")) return last;
  }
  return null;
}

function isResidualUtterance(text) {
  const raw = String(text || "").trim();
  if (!raw) return true;
  const t = normalizeDazhiAliases(raw);
  const bare = t.replace(/[，,。．.!！？?\s]/g, "");
  if (!bare) return true;
  if (pat("residualBare").test(bare) || pat("residualBare").test(t)) return true;
  if (
    bare.length <= lim("residualIsMax") &&
    pat("residualIsEnd").test(bare) &&
    !pat("residualIsOk").test(t)
  ) {
    return true;
  }
  if (
    bare.length <= lim("residualShortMax") &&
    !isQuestionForm(t) &&
    !pat("closedFaq").test(t) &&
    !pat("residualCommand").test(t)
  ) {
    return true;
  }
  if (bare.length <= lim("residualTinyMax") && !pat("residualTinyOk").test(t)) return true;
  return false;
}

function isComplexQuestion(text) {
  if (isClosedFaqQuestion(text)) return false;
  const peeled = peelClosedFaqCore(text);
  if (peeled && pat("closedFaq").test(peeled) && !pat("followUp").test(peeled)) {
    return false;
  }
  const t = normalizeDazhiAliases(String(text || "").trim());
  if (!t || t.length < lim("complexMinLen")) return false;
  if (pat("benefitTopic").test(t) && !pat("complexNotBenefit").test(t)) {
    return false;
  }
  if (pat("complex").test(t)) return true;
  if (pat("complexGarden").test(t) && pat("complexGardenHow").test(t)) return true;
  if (pat("followUp").test(t) && isQuestionForm(t)) return true;
  return false;
}

function isOperateQuestion(question) {
  const q = normalizeDazhiAliases(String(question || ""));
  if (!q || pat("operateQuestionUnless").test(q)) return false;
  return pat("operateQuestion").test(q);
}

function isClosedFaqQuestion(text) {
  const peeled = peelClosedFaqCore(text);
  const t = normalizeDazhiAliases(peeled || String(text || "").trim());
  if (!t) return false;
  if (isResidualUtterance(t)) return false;
  if (pat("closedStickyBlock").test(t)) return false;
  if (pat("closedSceneFaq").test(t)) return true;
  if (pat("openOperate").test(t) && !pat("definitionMark").test(t)) return false;
  if (pat("closedFaq").test(t)) return true;
  if (t.length <= lim("closedShortMax") && pat("closedShortMark").test(t)) return true;
  if (pat("meiyuName").test(t) && pat("meiyuIntro").test(t) && !pat("openOperate").test(t)) {
    return true;
  }
  if (
    pat("benefitTopic").test(t) &&
    t.length <= lim("benefitGuardMax") &&
    pat("benefitHow").test(t) &&
    !pat("benefitNotOpen").test(t)
  ) {
    return true;
  }
  if (
    pat("worthMark").test(t) &&
    (pat("worthMoney").test(t) || t.length <= lim("worthShortMax"))
  ) {
    return true;
  }
  if (
    pat("pricingMark").test(t) &&
    t.length <= lim("pricingMax") &&
    !pat("pricingNotOpen").test(t)
  ) {
    return true;
  }
  if (isEnrollmentBenefitAsk(t)) return true;
  return false;
}

function isBusinessIntent(text) {
  const t = normalizeDazhiAliases(String(text || "").trim());
  if (!t) return false;
  if (isClosedFaqQuestion(t)) return false;
  if (isEnrollmentBenefitAsk(t)) return false;
  const peeled = peelClosedFaqCore(t);
  if (peeled && isClosedFaqQuestion(peeled)) return false;
  return pat("biz").test(t);
}

module.exports = {
  get COMPLEX_RE() {
    return compileExport("complex");
  },
  get CLOSED_FAQ_RE() {
    return compileExport("closedFaq");
  },
  get OPEN_OPERATE_RE() {
    return compileExport("openOperate");
  },
  get RESIDUAL_BARE_RE() {
    return compileExport("residualBare");
  },
  get ENTITY_RE() {
    return compileExport("entity");
  },
  get BIZ_RE() {
    return compileExport("biz");
  },
  get DEEP_RE() {
    return compileExport("deep");
  },
  get FOLLOW_UP_RE() {
    return compileExport("followUp");
  },
  peelClosedFaqCore,
  isResidualUtterance,
  isComplexQuestion,
  isClosedFaqQuestion,
  isBusinessIntent,
  isOperateQuestion
};
