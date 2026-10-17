/** 规则诊断。句式只读 knowledge/schema/advisor-diagnose.json。 */
const { normalizeDazhiAliases } = require("../../meetingSession");
const { load, rx } = require("../../knowledge/schemaStore.cjs");

function pat(name) {
  return rx("diagnose", name);
}

function diagnose(ctx) {
  const blob = normalizeDazhiAliases(String(ctx.question || ""));
  const gardenMatch = blob.match(pat("gardenCount"));
  const gardenCount = gardenMatch ? Number(gardenMatch[1]) : null;
  const pains = [];
  if (pat("painSurvival").test(blob)) pains.push("survival");
  if (pat("painEnrollment").test(blob)) pains.push("enrollment");
  if (pat("painPricing").test(blob)) pains.push("pricing");
  if (pat("painTeacher").test(blob)) pains.push("teacher");
  if (pat("painRollout").test(blob)) pains.push("rollout");
  if (pat("painParent").test(blob)) pains.push("parent-value");
  if (pat("painProfit").test(blob)) pains.push("profit");
  if (
    pat("roiLoss").test(blob) ||
    pat("roiCan").test(blob) ||
    (pat("roiWord").test(blob) &&
      pat("roiParticle").test(blob) &&
      !pat("roiHowBlock").test(blob))
  ) {
    pains.push("roi-confirm");
  }
  if (pat("howCalc").test(blob)) pains.push("how-calc");
  const introduced = pat("introduced").test(blob);
  let stage = "explore";
  if (pains.includes("how-calc") && !pains.includes("roi-confirm")) stage = "how-calc";
  else if (pains.includes("roi-confirm")) stage = "roi-confirm";
  else if (
    pains.includes("parent-value") &&
    pat("parentStageCue").test(blob) &&
    !pains.includes("survival")
  ) {
    stage = "show-value";
  } else if (pains.includes("profit") && !pains.includes("survival")) stage = "profit";
  else if (pains.includes("teacher") && !pains.includes("survival")) stage = "teacher";
  else if (pains.includes("survival") || pains.includes("enrollment")) stage = "rescue";
  else if (pains.includes("rollout") || gardenCount) stage = "rollout";
  else if (pains.includes("parent-value")) stage = "show-value";
  return {
    gardenCount,
    pains,
    introduced,
    stage,
    multiGarden: gardenCount != null && gardenCount >= Number(load().diagnose.multiGardenMin || 3)
  };
}

module.exports = { diagnose };
