/** 规则诊断 */
const { normalizeDazhiAliases } = require("../../meetingSession");

function diagnose(ctx) {
  const blob = normalizeDazhiAliases(String(ctx.question || ""));
  const gardenMatch = blob.match(/(\d+)\s*(?:个)?(?:家园|园所|园)/);
  const gardenCount = gardenMatch ? Number(gardenMatch[1]) : null;
  const pains = [];
  if (/倒闭|起死回生|破局|重生/.test(blob)) pains.push("survival");
  if (/招生|招不到|生源/.test(blob)) pains.push("enrollment");
  if (/收费|公办|高收费|降价/.test(blob)) pains.push("pricing");
  if (/老师|抵触|负担|不愿意|培育|养老师/.test(blob)) pains.push("teacher");
  if (/实施|落地|开展|0.?1|第一步/.test(blob)) pains.push("rollout");
  if (/家长|价值|看得见/.test(blob)) pains.push("parent-value");
  const introduced = /引入|已经上|在做|已上美语|买了/.test(blob);
  let stage = "explore";
  if (pains.includes("teacher") && !pains.includes("survival")) stage = "teacher";
  else if (pains.includes("survival") || pains.includes("enrollment")) stage = "rescue";
  else if (pains.includes("rollout") || gardenCount) stage = "rollout";
  else if (pains.includes("parent-value")) stage = "show-value";
  return {
    gardenCount,
    pains,
    introduced,
    stage,
    multiGarden: gardenCount != null && gardenCount >= 3
  };
}

module.exports = { diagnose };
