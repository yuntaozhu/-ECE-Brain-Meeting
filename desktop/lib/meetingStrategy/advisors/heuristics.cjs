/** 启发式方案与经营题判定 */
const { normalizeDazhiAliases } = require("../../meetingSession");

function heuristicPlan(diag, question) {
  const q = String(question || "");
  // 换路径 / 追问优先于 rescue，避免复读锁死
  if (/还有|其他方案|别的|更好|第\s*\d+\s*条/.test(q)) {
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
  if (diag.stage === "show-value" || /家长.*价值|看得见/.test(q)) {
    return {
      tts: "让家长看见三样：开口实拍进群、月度AI测评报告、成果展；价值靠证据，不靠口号。",
      steps: [
        "日常：样板班开口视频+非教报告进家长群",
        "每月：AI测评报告/证书发给家长",
        "学期：办一场看得见的美语成果展",
        "招生季：把上述证据做成选择理由话术"
      ],
      risks: ["只讲理念不给证据"],
      cite: ["家庭端", "AI测评", "成果展"]
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

/** 换一条与上一答不同的启发式备选（禁止强制 rescue 同句） */
function alternateHeuristic(diag, question, lastTts) {
  const last = String(lastTts || "").replace(/\s+/g, "");
  const tries = [
    () => heuristicPlan({ ...diag, stage: "explore" }, `还有其他方案吗？${question}`),
    () => heuristicPlan({ ...diag, stage: "teacher" }, `如何培育老师？${question}`),
    () => heuristicPlan({ ...diag, stage: "rollout" }, `0到1第一步怎么走？${question}`),
    () => heuristicPlan({ ...diag, stage: "show-value" }, `如何让家长看到价值？${question}`),
    () => heuristicPlan({ ...diag, stage: "explore" }, question)
  ];
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
  return /如何|怎么用|怎样用|经营|使用|落地|实施|开展|行事历|第一步|签约|准备|哪些准备/.test(q);
}

/** 「经营得更好」本地抓手：样板可见 + 三笔账招生，禁止念定义 */
const OPERATE_BETTER_TTS =
  "把美语做成家长看得见的选择理由：样板班开口实拍、月度测评、成果展；对照三笔账里招生增长，先护收费盘面再做增量。";

function isOperateBetterAsk(question) {
  const q = normalizeDazhiAliases(String(question || ""));
  return /经营得更好|把园经营|园所经营不好|如何经营|怎么经营|经营好园/.test(q);
}

module.exports = {
  heuristicPlan,
  alternateHeuristic,
  sameAnswer,
  isOperateQuestion,
  isOperateBetterAsk,
  OPERATE_BETTER_TTS
};
