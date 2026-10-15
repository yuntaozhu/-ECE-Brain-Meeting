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
  if (/家长|价值|看得见|选择.*理由|理由是什么/.test(blob)) pains.push("parent-value");
  if (/盈利|赚钱|营收|投入产出|回本|回报|三笔账/.test(blob)) pains.push("profit");
  // 确认「能不能回本 / 会不会亏损」≠「如何盈利」
  if (
    /亏损|亏本|会不会亏|怕亏|害怕.*(?:花|投入|引入)/.test(blob) ||
    /(能回本|能不能回本|可以回本|回得了本|回本吗|回本嘛)/.test(blob) ||
    (/回本/.test(blob) &&
      /(能|吗|嘛|能否|可不可以|行不行|是否)/.test(blob) &&
      !/(如何|怎么|怎样)(回本|赚钱|盈利)/.test(blob))
  ) {
    pains.push("roi-confirm");
  }
  if (
    /怎么计算|如何计算|怎么算|算出来|测算依据|这个数字|一点八|五点四|1\.8|5\.4|怎么来的|如何得来/.test(
      blob
    )
  ) {
    pains.push("how-calc");
  }
  const introduced = /引入|已经上|在做|已上美语|买了/.test(blob);
  let stage = "explore";
  // 测算拆解 / 回本确认 优先于笼统「如何盈利」
  if (pains.includes("how-calc") && !pains.includes("roi-confirm")) stage = "how-calc";
  else if (pains.includes("roi-confirm")) stage = "roi-confirm";
  else if (
    pains.includes("parent-value") &&
    /(理由|看得见|价值)/.test(blob) &&
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
    multiGarden: gardenCount != null && gardenCount >= 3
  };
}

module.exports = { diagnose };
