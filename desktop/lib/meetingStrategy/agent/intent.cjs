/**
 * MeetingAgent 意图层（M1）：豆包 JSON Understand + 离线规则兜底。
 * 经营语义以 intent 枚举为准，禁止用裸关键词驱动口播模板。
 */
const { normalizeDazhiAliases } = require("../../meetingSession");
const { arkChat } = require("../llm/transport.cjs");
const {
  PROFIT_TTS,
  ROI_CONFIRM_TTS,
  HOW_CALC_TTS,
  PARENT_REASON_TTS,
  OPERATE_BETTER_TTS,
  isRoiConfirmAsk,
  isHowCalcAsk,
  isParentReasonAsk,
  isProfitAsk,
  isOperateBetterAsk,
  isAlternatePathAsk
} = require("../advisors/heuristics.cjs");

const INTENTS = [
  "loss_fear",
  "roi_confirm",
  "profit_how",
  "how_calc",
  "parent_reason",
  "alternate_path",
  "operate",
  "teacher",
  "rollout",
  "hq_support",
  "pricing_follow",
  "chitchat",
  "other"
];

const MONEY_INTENTS = new Set(["loss_fear", "roi_confirm"]);

const UNDERSTAND_MS = 900;

const UNDERSTAND_SYSTEM = `你是会场经营顾问的意图分类器。只输出一个 JSON 对象，不要 markdown。
字段：
{"intent":"...","confidence":0.0-1.0,"must_answer":"用户要你回答的核心","must_not":["禁止说的"],"retrieve_queries":["检索词"],"speak_policy":"neutral_bridge|content_ok|wait","depth":"L1|L2|L3"}

intent 只能是其一：
loss_fear | roi_confirm | profit_how | how_calc | parent_reason | alternate_path | operate | teacher | rollout | hq_support | pricing_follow | chitchat | other

规则（必须遵守）：
1. 「不是很好/不太好/不好」= 经营困境，绝不是要「更好方案」。只有用户明确说「还有更好的方案/其他办法/换一条/第二条路」才是 alternate_path。
2. 「亏损/亏本/会不会亏/害怕引入花钱/怕亏」→ loss_fear（与回本确认同答法族）。
3. 「能回本吗/投资能回本吗」→ roi_confirm。
4. 「如何盈利/怎么赚钱/扭亏/扭亏为盈」→ profit_how。禁止当成 operate。
5. 「怎么算/测算怎么来的」→ how_calc。
6. 「家长选择理由是什么」→ parent_reason。
7. 「总部支持/指导/帮助」→ hq_support。
8. 「收费盘面/护盘/互助」且上一句在讲收费或护盘 → pricing_follow。禁止 alternate_path。
9. loss_fear/roi_confirm/profit_how/pricing_follow 的 must_not 必须含「第二条路」「保证不亏/包赚」；speak_policy 用 content_ok。
10. 听不清、置信度低于 0.5、且不属于以上意图 → other，speak_policy 用 wait。
11. retrieve_queries 面向知识库：三笔账/招生增长/1.8万/总部支持 等。`;

function emptyIntent(partial = {}) {
  return {
    intent: "other",
    confidence: 0,
    must_answer: "",
    must_not: [],
    retrieve_queries: [],
    speak_policy: "neutral_bridge",
    depth: "L2",
    source: "default",
    ...partial
  };
}

function normalizeIntent(raw, askText) {
  const q = String(askText || "");
  let intent = String(raw?.intent || "other").trim();
  if (!INTENTS.includes(intent)) intent = "other";
  const confidence = Math.max(0, Math.min(1, Number(raw?.confidence) || 0));
  const must_answer = String(raw?.must_answer || q).slice(0, 120);
  let must_not = Array.isArray(raw?.must_not)
    ? raw.must_not.map((x) => String(x).slice(0, 40)).slice(0, 8)
    : [];
  let retrieve_queries = Array.isArray(raw?.retrieve_queries)
    ? raw.retrieve_queries.map((x) => String(x).slice(0, 40)).filter(Boolean).slice(0, 4)
    : [];
  let speak_policy = String(raw?.speak_policy || "").trim();
  if (!["neutral_bridge", "content_ok", "wait"].includes(speak_policy)) {
    speak_policy = MONEY_INTENTS.has(intent) || intent === "how_calc" || intent === "profit_how"
      ? "content_ok"
      : "neutral_bridge";
  }
  let depth = String(raw?.depth || "L2").trim();
  if (!["L1", "L2", "L3"].includes(depth)) depth = "L2";

  if (MONEY_INTENTS.has(intent)) {
    must_not = [
      ...new Set([
        ...must_not,
        "第二条路",
        "保证不亏",
        "包赚",
        "保证回本",
        "今天主题是"
      ])
    ];
    if (!retrieve_queries.length) {
      retrieve_queries = ["三笔账 招生增长", "一点八万 五点四万 三万九"];
    }
    speak_policy = "content_ok";
  }
  if (intent === "alternate_path" && !retrieve_queries.length) {
    retrieve_queries = ["延时非教", "一园两制", "样板班"];
  }
  if (intent === "profit_how") {
    must_not = [...new Set([...must_not, "第二条路", "样板班开口实拍", "保证不亏", "包赚"])];
    if (!retrieve_queries.length) retrieve_queries = ["三笔账", "延时非教", "招生增长"];
    speak_policy = "content_ok";
  }
  if (intent === "hq_support") {
    must_not = [...new Set([...must_not, "第二条路", "样板班开口实拍"])];
    if (!retrieve_queries.length) retrieve_queries = ["总部给予哪些支持"];
    speak_policy = "content_ok";
  }
  if (intent === "pricing_follow") {
    must_not = [...new Set([...must_not, "第二条路", "样板班开口实拍", "保证不亏"])];
    if (!retrieve_queries.length) retrieve_queries = ["收费盘面", "保住现有收费"];
    speak_policy = "content_ok";
  }
  if (intent === "how_calc" && !retrieve_queries.length) {
    retrieve_queries = ["三笔账第三笔", "服务半径"];
  }
  if (intent === "parent_reason" && !retrieve_queries.length) {
    retrieve_queries = ["开口实拍", "成果展", "AI测评"];
  }
  if (!retrieve_queries.length && q) retrieve_queries = [q.slice(0, 40)];

  return {
    intent,
    confidence,
    must_answer,
    must_not,
    retrieve_queries,
    speak_policy,
    depth,
    source: raw?.source || "llm"
  };
}

/**
 * 离线/超时规则 Understand（冻结经营语义：只服务 intent 枚举，不直接吐「第二条路」误伤）
 */
function currentUtterance(askText) {
  const q = normalizeDazhiAliases(String(askText || ""));
  const m = q.match(/(?:针对上一答|追问)[^：:]{0,180}[：:]\s*(.{2,120})$/);
  if (m) return normalizeDazhiAliases(m[1]);
  return q;
}

/** 有疑问形态才算提问。感叹/陈述不靠业务词收成盈利脚本。 */
function isInterrogative(q) {
  return /[？?]|(如何|怎么|怎样|吗|呢|嘛|能否|会不会|能不能|是不是|什么|哪些|为什么|多久|多长时间|什么时候|可不可以)/.test(
    String(q || "")
  );
}

function isExclamation(q) {
  const s = String(q || "").trim();
  return /[！!]$/.test(s) && !isInterrogative(s);
}

/** 问能不能盈利：先表态，不走「如何盈利」三笔账开场，也不因「园所」收成经营万能句。期限问仍留给回报时间卡。 */
function isProfitConfirmAsk(q) {
  const s = String(q || "");
  if (/多久|多长时间|什么时候/.test(s)) return false;
  if (/(如何|怎么|怎样)/.test(s)) return false;
  return /(能不能|能否|可不可以|能让|可以让|会让).{0,16}盈利|能盈利|盈利吗/.test(s);
}

function isExecuteAsk(q) {
  return /(如何|怎么|怎样).{0,6}执行|执行过程|怎么执行/.test(String(q || ""));
}

function ruleUnderstand(askText, opts = {}) {
  const q = currentUtterance(askText);
  const lastHost = String(opts.lastHostAnswer || "");

  if (!q || /^(大智|大致)[。.!！？?\s]*$/.test(q)) {
    return emptyIntent({
      intent: "chitchat",
      confidence: 0.9,
      must_answer: "应答在场",
      speak_policy: "content_ok",
      source: "rule"
    });
  }

  // loss_fear 优先于 alternate / operate（「不是很好…会不会亏损」）
  if (
    /亏损|亏本|会不会亏|会不会让我亏|怕亏|害怕.*(?:花|投入|引入)|引入后.*亏/.test(q) ||
    (/害怕/.test(q) && /(三万九|39000|3\s*万\s*9|引入|课程)/.test(q))
  ) {
    return normalizeIntent(
      {
        intent: "loss_fear",
        confidence: 0.95,
        must_answer: "引入后会不会亏损",
        source: "rule"
      },
      q
    );
  }

  if (isRoiConfirmAsk(q)) {
    return normalizeIntent(
      { intent: "roi_confirm", confidence: 0.95, must_answer: "能不能回本", source: "rule" },
      q
    );
  }
  if (isHowCalcAsk(q) || (/怎么算|如何计算|测算/.test(q) && lastHost)) {
    return normalizeIntent(
      { intent: "how_calc", confidence: 0.92, must_answer: "测算怎么来的", source: "rule" },
      q
    );
  }
  if (isParentReasonAsk(q)) {
    return normalizeIntent(
      { intent: "parent_reason", confidence: 0.92, must_answer: "家长选择理由", source: "rule" },
      q
    );
  }
  if (isHqSupportAsk(q)) {
    return normalizeIntent(
      { intent: "hq_support", confidence: 0.93, must_answer: "总部能提供什么支持", source: "rule" },
      q
    );
  }
  if (isAlternatePathAsk(q)) {
    return normalizeIntent(
      {
        intent: "alternate_path",
        confidence: 0.9,
        must_answer: "换一条经营路径",
        source: "rule"
      },
      q
    );
  }
  if (isPricingFollowAsk(q, lastHost)) {
    return normalizeIntent(
      {
        intent: "pricing_follow",
        confidence: 0.9,
        must_answer: "收费盘面怎么保住",
        source: "rule"
      },
      q
    );
  }
  // 感叹表态不是提问，不挂盈利/经营脚本
  if (isExclamation(q)) {
    return emptyIntent({
      intent: "other",
      confidence: 0.35,
      must_answer: q.slice(0, 40),
      speak_policy: "wait",
      source: "rule"
    });
  }
  if (isProfitConfirmAsk(q)) {
    return normalizeIntent(
      { intent: "profit_how", confidence: 0.92, must_answer: "能不能盈利", source: "rule" },
      q
    );
  }
  if (isProfitAsk(q) || (/扭亏/.test(q) && isInterrogative(q))) {
    return normalizeIntent(
      { intent: "profit_how", confidence: 0.9, must_answer: "如何扭亏或盈利", source: "rule" },
      q
    );
  }
  if (/老师|抵触|养老师|培育老师/.test(q)) {
    return normalizeIntent(
      { intent: "teacher", confidence: 0.85, must_answer: "老师怎么配合", source: "rule" },
      q
    );
  }
  if (isExecuteAsk(q) || /落地|实施|行事历|0.?1|第一步|签约|准备/.test(q)) {
    return normalizeIntent(
      { intent: "rollout", confidence: 0.85, must_answer: "怎么落地", source: "rule" },
      q
    );
  }
  if (isOperateBetterAsk(q)) {
    return normalizeIntent(
      { intent: "operate", confidence: 0.8, must_answer: "经营怎么办", source: "rule" },
      q
    );
  }
  return emptyIntent({
    intent: "other",
    confidence: 0.4,
    must_answer: q.slice(0, 80),
    retrieve_queries: [q.slice(0, 40)],
    speak_policy: "neutral_bridge",
    source: "rule"
  });
}

function parseIntentJson(raw) {
  if (!raw) return null;
  const s = String(raw).trim();
  const m = s.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try {
    return JSON.parse(m[0]);
  } catch (_) {
    return null;
  }
}

/**
 * @returns {Promise<object>} normalized intent
 */
async function understandIntent(askText, opts = {}) {
  const q = String(askText || "").trim();
  const floors = Array.isArray(opts.recentFloors) ? opts.recentFloors.slice(-4).join("\n") : "";
  const lastHost = String(opts.lastHostAnswer || "").slice(0, 120);
  const rule = ruleUnderstand(q, { lastHostAnswer: lastHost });

  const apiKey = (process.env.DOUBAO_API_KEY || process.env.ARK_API_KEY || "").trim();
  if (!apiKey || opts.forceRule) {
    return rule;
  }

  const user =
    `【近场】\n${floors.slice(0, 300) || "（无）"}\n【上一答】${lastHost || "（无）"}\n【园长说】${q}\n请分类。`;

  try {
    const res = await arkChat(UNDERSTAND_SYSTEM, user, {
      fast: true,
      temperature: 0,
      timeoutMs: opts.timeoutMs != null ? opts.timeoutMs : UNDERSTAND_MS,
      signal: opts.signal,
      maxTokens: 220
    });
    if (res?.ok && res.content) {
      const parsed = parseIntentJson(res.content);
      if (parsed?.intent) {
        const norm = normalizeIntent({ ...parsed, source: "llm" }, q);
        // 规则高置信 money/alternate 与 LLM 冲突时：money/alternate 规则优先防误伤
        const locked = new Set([
          "loss_fear",
          "roi_confirm",
          "profit_how",
          "hq_support",
          "pricing_follow",
          "how_calc",
          "parent_reason"
        ]);
        if (locked.has(rule.intent) && rule.confidence >= 0.85 && norm.intent === "alternate_path") {
          return { ...rule, source: "rule-override" };
        }
        if (rule.intent === "profit_how" && /扭亏/.test(q) && norm.intent !== "profit_how") {
          return { ...rule, source: "rule-override" };
        }
        if (isProfitConfirmAsk(q) && rule.intent === "profit_how" && norm.intent !== "profit_how") {
          return { ...rule, source: "rule-override" };
        }
        if (rule.intent === "rollout" && isExecuteAsk(q) && norm.intent !== "rollout") {
          return { ...rule, source: "rule-override" };
        }
        if (
          (rule.intent === "hq_support" || rule.intent === "pricing_follow") &&
          norm.intent !== rule.intent &&
          rule.confidence >= 0.9
        ) {
          return { ...rule, source: "rule-override" };
        }
        if (rule.intent === "alternate_path" && norm.intent !== "alternate_path" && rule.confidence >= 0.9) {
          return rule;
        }
        if ((Number(norm.confidence) || 0) < 0.5 && rule.intent === "other") {
          return { ...norm, intent: "other", speak_policy: "wait", confidence: norm.confidence };
        }
        return norm;
      }
    }
  } catch (_) {
    /* fall through */
  }
  return rule;
}

/** 同意图 KB/模板软兜底（超时或无 LLM 时用，禁止换意图） */
function intentSoftAnswer(intentObj, askText) {
  const intent = intentObj?.intent || ruleUnderstand(askText).intent;
  switch (intent) {
    case "loss_fear":
    case "roi_confirm":
      return ROI_CONFIRM_TTS;
    case "how_calc":
      return HOW_CALC_TTS;
    case "parent_reason":
      return PARENT_REASON_TTS;
    case "profit_how":
      if (isProfitConfirmAsk(askText) || isProfitConfirmAsk(currentUtterance(askText))) {
        return "资料不保证引入后就盈利。按说明测算：新增一名幼儿约一年一点八万、在园三年约五点四万，可能盖过三万九；关键是认真执行。这是参考测算，不是承诺招满。";
      }
      return PROFIT_TTS;
    case "hq_support":
      return "支持在系统里：总部课件、Teacher说师资训练、每班菲教、AI测评和成果活动，还有落地指导和行事历。不是只丢一批账号让园自己扛。";
    case "pricing_follow":
      return "收费盘面要先保住现有收费，再用开口和续费做出加收；先护住在园家长，再谈增量。";
    case "alternate_path":
      return "第二条路：先做延时非教增量班，用增收养老师；样板班并行，别只押招生一口价。";
    case "operate":
      return OPERATE_BETTER_TTS;
    case "teacher":
      return "培育老师先减负再激励：只拍十秒+转发报告，不备课；有美语增量后再给配合者小补贴。";
    case "rollout":
      if (isExecuteAsk(askText) || isExecuteAsk(currentUtterance(askText))) {
        return "执行分四步：定班、上非教、拍十秒、转发报告。本周只做定班和第一次开口视频。";
      }
      return "0到1就四步：定班、上非教、拍十秒、转发报告；本周只做定班和第一次开口视频。";
    case "chitchat":
      return "我在，请讲。";
    default:
      return "";
  }
}

function neutralBridgeFor(intentObj) {
  const intent = intentObj?.intent || "other";
  if (MONEY_INTENTS.has(intent) || intent === "how_calc" || intent === "profit_how") {
    return "我按资料帮你看这笔账。";
  }
  if (intent === "alternate_path") return "我换一条路径说。";
  return "嗯，我想一下。";
}

/**
 * 检索完成前不允许内容型先开口。口播只在闸门放行之后由 MeetingAgent 发出。
 */
function contentLeadForIntent() {
  return "";
}

function isHqSupportAsk(question) {
  const q = normalizeDazhiAliases(String(question || ""));
  if (!q) return false;
  if (/总部/.test(q) && /支持|指导|帮助/.test(q)) return true;
  if (/(给予|提供).*(支持|指导|帮助)/.test(q)) return true;
  if (/哪些支持|有哪些支持|会给予哪些/.test(q)) return true;
  return false;
}

function isPricingFollowAsk(question, lastHost) {
  const q = normalizeDazhiAliases(String(question || ""));
  if (!q || isAlternatePathAsk(q)) return false;
  if (/收费盘面|护盘/.test(q)) return true;
  if (/互助/.test(q) && /收费|盘面|护盘/.test(q)) return true;
  if (/互助|这个|刚才|那笔/.test(q) && /收费盘面|护盘|保住现有收费/.test(String(lastHost || ""))) {
    return true;
  }
  return false;
}

function isMoneyIntent(intent) {
  return MONEY_INTENTS.has(String(intent || ""));
}

module.exports = {
  INTENTS,
  MONEY_INTENTS,
  UNDERSTAND_MS,
  understandIntent,
  ruleUnderstand,
  normalizeIntent,
  intentSoftAnswer,
  neutralBridgeFor,
  contentLeadForIntent,
  isMoneyIntent
};
