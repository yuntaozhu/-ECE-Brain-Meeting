/**
 * 启发式方案与经营题判定。
 * P2 冻结：经营口播与经营题正则不再扩展。新失败只加 eval 用例，
 * 新意图放在 agent/intent.cjs，不要在这里加「扭亏 / 总部 / 收费盘面」分支。
 */
const { normalizeDazhiAliases } = require("../../meetingSession");

/** 盈利/投入产出：三笔账口径（「如何盈利」），禁止把样板班当盈利答案本身 */
const PROFIT_TTS =
  "引入后盈利算三笔账：延时非教扩服务半径、全美语分层增值、招生新增幼儿参考一年一点八万三年约五点四万可能盖过三万九；样板班只是把特色做看得见的抓手，不保证招满。";

/** 「能回本吗」确认：先答能不能，禁止套「如何盈利」开场 */
const ROI_CONFIRM_TTS =
  "资料不保证包回本。按说明测算：因美语特色新增一名幼儿约一年一点八万、在园三年约五点四万，可能盖过三万九投入；关键是认真执行、做成家长选择理由。这是参考测算，不是承诺招满。";

/** 测算拆解：回答「怎么算出来的」 */
const HOW_CALC_TTS =
  "测算口径是这样：因美语特色新增一名幼儿，参考年贡献约一点八万，在园三年约五点四万，对照项目投入三万九；这是说明里的参考测算，不是保证招满。第一笔还可看二百五乘一百五十六约等于三万九的服务半径账。";

/** 家长选择理由：禁止复读「要成为理由」空句 */
const PARENT_REASON_TTS =
  "家长选择园所的理由要做成证据：开口十秒实拍进群、月度AI测评报告、学期成果展；美语看得见，才成为报名理由，不是口号。";

/** 「会不会亏损 / 亏本 / 害怕引入花钱」：与回本确认同答法族 */
function isLossFearAsk(question) {
  const q = normalizeDazhiAliases(String(question || ""));
  if (!q) return false;
  if (/亏损|亏本|会不会亏|会不会让我亏|怕亏/.test(q)) return true;
  if (/害怕/.test(q) && /(三万九|39000|3\s*万\s*9|引入|课程|花)/.test(q)) return true;
  if (/引入后.*亏|花了.*会不会/.test(q) && /(亏|回不了本)/.test(q)) return true;
  return false;
}

/** 「能回本吗 / 投资能回本吗」：确认题，不是「如何盈利」；亏损恐惧并入同档 */
function isRoiConfirmAsk(question) {
  const q = normalizeDazhiAliases(String(question || ""));
  if (!q) return false;
  if (isLossFearAsk(q)) return true;
  if (/(如何|怎么|怎样)(回本|赚钱|盈利)/.test(q)) return false;
  if (/(能回本|能不能回本|可以回本|回得了本|回本吗|回本嘛)/.test(q)) return true;
  if (/回本/.test(q) && /(能|吗|嘛|能否|可不可以|行不行|是否)/.test(q)) return true;
  // 「花了三万九…投资…回本」类口语
  if (
    /(三万九|39000|3\s*万\s*9|投资|投入)/.test(q) &&
    /回本/.test(q) &&
    !/(如何|怎么)盈利/.test(q)
  ) {
    return true;
  }
  // 「投入三万九值得吗」→ 回本/值确认族
  if (/(三万九|39000|3\s*万\s*9|投资|投入)/.test(q) && /值得|值不值/.test(q)) {
    return true;
  }
  return false;
}

/**
 * 明确「换方案」追问。禁止裸匹配「更好」（会误伤「不是很好」）。
 */
function isAlternatePathAsk(question) {
  const q = normalizeDazhiAliases(String(question || ""));
  if (!q) return false;
  // 排除经营困境表述
  if (/不是很好|不太好|不好|经营得?不/.test(q) && !/还有|其他方案|别的办法|换一条|第\s*\d+\s*条/.test(q)) {
    return false;
  }
  if (/还有更好|更好的方案|更好办法|经营得更好的办法/.test(q)) return true;
  if (/还有(?:其他|别的)?(?:方案|办法|路)|其他方案|别的办法|换一条|换个路径|第\s*\d+\s*条/.test(q)) {
    return true;
  }
  return false;
}

function isHowCalcAsk(question) {
  const q = normalizeDazhiAliases(String(question || ""));
  if (!q) return false;
  // 「能回本吗」不是问怎么算
  if (isRoiConfirmAsk(q)) return false;
  return /怎么计算|如何计算|怎么算|算出来|测算依据|这个数字|怎么来的|如何得来|怎么得出/.test(q);
}

function isParentReasonAsk(question) {
  const q = normalizeDazhiAliases(String(question || ""));
  if (!q) return false;
  return /选择.*理由|理由是什么|家长.*理由|看得见.*什么|价值是什么/.test(q);
}

function isProfitAsk(question) {
  const q = normalizeDazhiAliases(String(question || ""));
  if (!q) return false;
  // 期限问（多久/什么时候）不是「如何盈利」，留给回报时间卡片
  if (/多久|多长时间|什么时候/.test(q)) return false;
  // 回本确认 / 测算 / 理由 优先，勿吞进「如何盈利」套路
  if (isRoiConfirmAsk(q) || isHowCalcAsk(q) || isParentReasonAsk(q)) return false;
  if (/是什么|什么是/.test(q) && !/盈利|赚钱|回本/.test(q)) return false;
  if (
    /如何盈利|怎么盈利|如何赚钱|怎么赚钱|走向盈利|机构走向盈利|投入产出|如何回本|怎么回本|靠什么赚钱|营收怎么做|三笔账/.test(
      q
    )
  ) {
    return true;
  }
  return /盈利|赚钱|投入产出|营收/.test(q) && /(如何|怎么|怎样|引入|之后|然后)/.test(q);
}

function heuristicPlan(diag, question) {
  const q = String(question || "");
  // 「会不会亏损 / 能回本吗」优先于换路径 / how-calc / 盈利套路
  if (diag.stage === "roi-confirm" || isRoiConfirmAsk(q) || isLossFearAsk(q)) {
    return {
      tts: ROI_CONFIRM_TTS,
      steps: [
        "先表态：不保证包回本",
        "测算：新增幼儿年约1.8万×3年≈5.4万，对照投入3.9万可能盖过",
        "条件：认真执行、做成招生选择理由",
        "边界：参考测算，非承诺招满"
      ],
      risks: ["不要说一定能回本或包赚"],
      cite: ["三笔账第三笔", "招生增长"]
    };
  }
  // 测算拆解优先于「还有其他方案」
  if (diag.stage === "how-calc" || isHowCalcAsk(q)) {
    return {
      tts: HOW_CALC_TTS,
      steps: [
        "第三笔：新增幼儿年约1.8万×3年≈5.4万，对照投入3.9万",
        "第一笔参考：延伸家庭250元×156人≈3.9万服务半径",
        "边界：测算非承诺，不保证招满"
      ],
      risks: ["不要把参考测算说成保证回本"],
      cite: ["三笔账第三笔", "服务半径"]
    };
  }
  if (diag.stage === "show-value" || isParentReasonAsk(q)) {
    return {
      tts: PARENT_REASON_TTS,
      steps: [
        "日常：开口实拍+非教报告进家长群",
        "每月：AI测评报告发给家长",
        "学期：美语成果展做成选择理由话术"
      ],
      risks: ["只讲理念不给证据"],
      cite: ["家庭端", "AI测评", "成果展"]
    };
  }
  // 换路径：仅明确换方案（禁止「不是很好」误伤）
  if (isAlternatePathAsk(q)) {
    return {
      tts: "第二条路：先做延时非教增量班，用增收养老师；样板班并行，别只押招生一口价。",
      steps: [
        "路径A：样板班开口→续费护盘（主路径）",
        "路径B：延时非教小班增量→补贴配合老师",
        "路径C：一园两制分层，全美语家庭更高频",
        "本周先选一条主路径跑30天"
      ],
      risks: ["两条路同时全力推会分心"],
      cite: ["延时非教", "一园两制"]
    };
  }
  if (diag.stage === "profit" || isProfitAsk(q)) {
    return {
      tts: PROFIT_TTS,
      steps: [
        "第一笔：延时非教/服务半径扩量，别只算账号成本",
        "第二笔：一园两制分层增值（全美语参考月加价）",
        "第三笔：招生引擎——新增幼儿年约1.8万、三年约5.4万对照三万九",
        "执行：样板班开口实拍进群，让特色成为选择理由（测算非承诺）"
      ],
      risks: ["不要保证招满或包赚", "只开样板班不做三笔账等于文不对题"],
      cite: ["三笔账", "招生增长", "延时非教"]
    };
  }
  if (diag.stage === "teacher" || (/培育|养老师|培训老师|老师抵触/.test(q) && !/起死回生|倒闭/.test(q))) {
    return {
      tts: "培育老师先减负再激励：只拍十秒+转发报告，不备课；有美语增量后再给配合者小补贴。",
      steps: [
        "本周：明确老师只做两件事——拍开口十秒、转发系统报告",
        "对接：总部课件+非教课，老师零备课",
        "激励：样板班美语增收后，愿意接的人拿小半补贴",
        "仍抵触：先不摊全员，园长顶一个班看数据"
      ],
      risks: ["一上来全员摊任务会反弹"],
      cite: ["教师端", "增量养老师"]
    };
  }
  if (/0.?1|第一步|怎么走|步骤/.test(q)) {
    return {
      tts: "0到1就四步：定班、上非教、拍十秒、转发报告；本周只做定班和第一次开口视频。",
      steps: [
        "Day1：定样板班+对接总部课件账号",
        "Day2—3：上第一次非教课并录开口",
        "Day3：十秒视频+报告进群",
        "Week2：周复盘开口次数与家长反馈"
      ],
      risks: ["步骤跳过直接全园铺开"],
      cite: ["样板班行事历"]
    };
  }
  if (diag.multiGarden || diag.gardenCount) {
    const n = diag.gardenCount || 20;
    return {
      tts: `您有${n}个园，别齐步走：先挑2—3个试点园各开1个样板班，跑通开口和续费，再按片区复制。`,
      steps: [
        `第1周：从${n}园中选2—3个执行力强的试点园`,
        "每园：1个样板班+园长盯开口实拍进群",
        "4周：对照续费/开口数据，开复盘会",
        "再铺：按片区复制，未试点园只做环境渗透不加压"
      ],
      risks: ["多园齐推导致执行塌方", "缺少统一口径会各说各话"],
      cite: ["多园落地", "样板班"]
    };
  }
  if (diag.stage === "rescue" || /起死回生|倒闭|重生/.test(q)) {
    return {
      tts: "先不赌全员翻盘：开一个月样板班，老师只拍十秒转发，您盯开口实拍和续费，先护盘再用增量养老师。",
      steps: [
        "本周：选定1个整班做样板，启用总部课件+非教课",
        "每日：老师拍10秒开口视频进群，转发AI/非教报告",
        "本月：用开口数据说服本班续费，再谈延时非教增量",
        "下阶段：有增量后再给配合老师小补贴，勿先摊全员"
      ],
      risks: ["一上来全员摊任务会反弹", "只领账号不执行等于纯成本"],
      cite: ["样板班", "招生转化"]
    };
  }
  return {
    tts: "把美语做成家长看得见的选择理由：样板班开口实拍、月度测评、成果展；先护收费盘面再做增量。",
    steps: [
      "定1个样板班跑30天",
      "开口实拍与报告进群",
      "对照续费与招生询问量",
      "再决定是否扩班/扩园"
    ],
    risks: ["空讲系统不做样板"],
    cite: ["招生引擎"]
  };
}

/** 换一条与上一答不同的启发式备选（禁止强制 rescue 同句；勿把盈利题换成回本确认） */
function alternateHeuristic(diag, question, lastTts) {
  const last = String(lastTts || "").replace(/\s+/g, "");
  const tries = [];
  if (isRoiConfirmAsk(question) || diag.stage === "roi-confirm") {
    tries.push(() => heuristicPlan({ ...diag, stage: "roi-confirm" }, question));
    tries.push(() => heuristicPlan({ ...diag, stage: "how-calc" }, `测算怎么算？${question}`));
  } else if (isHowCalcAsk(question) || diag.stage === "how-calc") {
    tries.push(() => heuristicPlan({ ...diag, stage: "how-calc" }, question));
  } else if (isParentReasonAsk(question) || diag.stage === "show-value") {
    tries.push(() => heuristicPlan({ ...diag, stage: "show-value" }, question));
  } else {
    tries.push(() => heuristicPlan({ ...diag, stage: "explore" }, `还有其他方案吗？${question}`));
    tries.push(() => heuristicPlan({ ...diag, stage: "profit" }, `如何盈利？${question}`));
    tries.push(() => heuristicPlan({ ...diag, stage: "show-value" }, `家长选择园所的理由是什么？${question}`));
    tries.push(() => heuristicPlan({ ...diag, stage: "teacher" }, `如何培育老师？${question}`));
    tries.push(() => heuristicPlan({ ...diag, stage: "rollout" }, `0到1第一步怎么走？${question}`));
  }
  tries.push(() => heuristicPlan({ ...diag, stage: "explore" }, question));
  for (const fn of tries) {
    const p = fn();
    const now = String(p.tts || "").replace(/\s+/g, "");
    if (now.length < 12) continue;
    if (now === last || (last.length >= 20 && last.includes(now.slice(0, 24)))) continue;
    return p;
  }
  return heuristicPlan({ ...diag, stage: "explore" }, `还有其他方案吗？${question}`);
}

function sameAnswer(a, b) {
  const x = String(a || "").replace(/\s+/g, "");
  const y = String(b || "").replace(/\s+/g, "");
  if (x.length < 20 || y.length < 20) return false;
  return x === y || x.includes(y.slice(0, 24)) || y.includes(x.slice(0, 24));
}

function isOperateQuestion(question) {
  const q = normalizeDazhiAliases(String(question || ""));
  if (!q || /是什么|什么是/.test(q)) return false;
  return /如何|怎么用|怎样用|经营|盈利|赚钱|营收|使用|落地|实施|开展|行事历|第一步|签约|准备|哪些准备/.test(
    q
  );
}

/** 「经营得更好」本地抓手：样板可见 + 三笔账招生，禁止念定义 */
const OPERATE_BETTER_TTS =
  "把美语做成家长看得见的选择理由：样板班开口实拍、月度测评、成果展；对照三笔账里招生增长，先护收费盘面再做增量。";

function isOperateBetterAsk(question) {
  const q = normalizeDazhiAliases(String(question || ""));
  // 回本/亏损确认 / 盈利走专用路径，勿与「经营得更好」混成样板班半句
  if (isRoiConfirmAsk(q) || isLossFearAsk(q) || isProfitAsk(q) || isAlternatePathAsk(q)) {
    return false;
  }
  return /经营得更好|把园经营|园所经营不好|园所经营的不是很好|如何经营|怎么经营|经营好园/.test(q);
}

module.exports = {
  heuristicPlan,
  alternateHeuristic,
  sameAnswer,
  isOperateQuestion,
  isOperateBetterAsk,
  isProfitAsk,
  isRoiConfirmAsk,
  isLossFearAsk,
  isAlternatePathAsk,
  isHowCalcAsk,
  isParentReasonAsk,
  OPERATE_BETTER_TTS,
  PROFIT_TTS,
  ROI_CONFIRM_TTS,
  HOW_CALC_TTS,
  PARENT_REASON_TTS
};
