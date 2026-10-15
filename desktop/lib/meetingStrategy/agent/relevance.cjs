/**
 * 检索闸门：召回和「能当答案」分开。
 * 分数量纲来自本仓库，不要照抄外部客服项目的 0.76：
 * - FAQ 关键词（corpus.retrieveKnowledge）强命中约 ≥45
 * - Wiki 关键词（queryWiki）强命中约 ≥5，语义检索里会被抬到 0.9 附近
 * - 纯向量余弦：中文无关句也常在 0.6 上下，作答线取 0.62，只用于没有 Wiki/FAQ 强命中时
 */
const FAQ_KEYWORD_ANSWERABLE = 45;
const WIKI_KEYWORD_ANSWERABLE = 5;
const SEMANTIC_ANSWERABLE = 0.62;
const CLARIFY_CONFIDENCE = 0.5;

const GROUNDED_INTENTS = new Set([
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
  "pricing_follow"
]);

function topScore(retrieval) {
  const hits = retrieval?.hits || [];
  if (!hits.length) return 0;
  return Number(hits[0].score) || 0;
}

function topSource(retrieval) {
  return String(retrieval?.hits?.[0]?.source || "");
}

/**
 * 这次检索能不能直接当口播依据。
 * Wiki 被抬到 0.9 的命中看原始 mode；关键词 FAQ 看 ≥45。
 */
function isAnswerable(retrieval) {
  if (!retrieval) return false;
  const score = topScore(retrieval);
  const source = topSource(retrieval);
  const mode = String(retrieval.mode || "");
  if (retrieval.instantAnswer && source === "faq" && score >= 0.72 && score <= 1.2) return true;
  if (retrieval.instantAnswer && source === "faq" && score >= FAQ_KEYWORD_ANSWERABLE) return true;
  if (source === "faq" && score >= FAQ_KEYWORD_ANSWERABLE) return true;
  if (mode === "wiki" || mode === "wiki+semantic") {
    if (score >= WIKI_KEYWORD_ANSWERABLE || score >= 0.85) return Boolean(retrieval.instantAnswer || retrieval.preview);
  }
  if (source === "wiki" && score >= WIKI_KEYWORD_ANSWERABLE && score < 2) return true;
  if (score > 0 && score <= 1.2 && score >= SEMANTIC_ANSWERABLE && source === "wiki") return true;
  return false;
}

function stripAsk(askText) {
  let q = String(askText || "").trim();
  q = q.replace(/^(大智|大致)[，,：:\s]*/, "");
  const m = q.match(/(?:针对上一答|追问)[^：:]{0,180}[：:]\s*(.{2,120})$/);
  if (m) q = m[1].trim();
  return q.replace(/[？?。！!\s]/g, "");
}

/** 说了一半、动词没收住。完整短问（你如何做/怎么做）不是残句。 */
function isTruncatedAsk(askText) {
  const q = stripAsk(askText);
  if (!q || q.length > 14) return false;
  if (/[吗嘛呢吧]$/.test(q)) return false;
  if (/(什么|哪些|为什么|怎么办|盈利|赚钱|回本|亏损|扭亏|收费|总部|支持)/.test(q)) return false;
  // 「你如何做 / 怎么做 / 如何落地」是完整短问，不是半截
  if (/^(你|您|大智)?(如何|怎么|怎样)(做|办|落地|执行|开展|推进|经营)?$/.test(q)) return false;
  if (/^(我)?(如何|怎么|怎样)(能够|可以|能)?$/.test(q)) return true;
  // 仅「如何通」这类缺宾语残句
  return /(如何|怎么|怎样)/.test(q) && /(通)$/.test(q);
}

function repeatLine() {
  return "后半句没听清，请再说一遍。";
}

function clarifyLine() {
  return "这句我还没对上，请再说具体一点。";
}

/** 虚词二元组：不算问句内容锚点 */
const STOP_BIGRAM = new Set([
  "什么",
  "怎么",
  "如何",
  "怎样",
  "可以",
  "是否",
  "你们",
  "我们",
  "这个",
  "那个",
  "一下",
  "还有",
  "以及",
  "或者",
  "因为",
  "所以",
  "如果",
  "那么",
  "一个",
  "一些",
  "没有",
  "不是",
  "能不能",
  "大智",
  "大致"
]);

function contentBigrams(text) {
  const s = String(text || "")
    .replace(/[^\u4e00-\u9fffA-Za-z0-9]/g, "")
    .toLowerCase();
  const out = [];
  for (let i = 0; i < s.length - 1; i += 1) {
    out.push(s.slice(i, i + 2));
  }
  return out;
}

/**
 * 问句 ↔ 候选（标题/正文）内容重叠比。
 * 结构闸门：不靠业务词表，用字二元组重合；虚词二元组不计入分子。
 */
function askSpeakOverlap(askText, speakText) {
  const askRaw = contentBigrams(stripAsk(askText));
  const speakSet = new Set(contentBigrams(speakText));
  if (!askRaw.length || !speakSet.size) return 0;
  const pool = askRaw.filter((b) => !STOP_BIGRAM.has(b));
  const use = pool.length ? pool : askRaw;
  let hit = 0;
  for (const b of use) {
    if (speakSet.has(b)) hit += 1;
  }
  return hit / use.length;
}

/**
 * 候选是否对得上本句。短问要求更高重合，避免「区别」撞上万能经营句。
 */
function isAlignedSpeak(askText, speakText, opts = {}) {
  const speak = String(speakText || "").trim();
  if (!speak) return false;
  const askLen = stripAsk(askText).length;
  const min = opts.minOverlap != null ? opts.minOverlap : askLen <= 8 ? 0.2 : 0.12;
  return askSpeakOverlap(askText, speak) >= min;
}

/**
 * 经营万能软句指纹（样板开口 + 护收费/三笔账），禁止当任意问句兜底。
 * 不扫业务关键词表，只认这条模板结构。
 */
function isUniversalOperateSoft(text) {
  const t = String(text || "");
  if (!t) return false;
  const hasSample = /样板班开口实拍|月度测评.*成果展|开口实拍/.test(t);
  const hasLedger = /先护收费|护收费盘面|对照三笔账|三笔账里招生/.test(t);
  const hasLead = /把美语做成家长看得见的选择理由/.test(t);
  return (hasLead && (hasSample || hasLedger)) || (hasSample && hasLedger);
}

module.exports = {
  FAQ_KEYWORD_ANSWERABLE,
  WIKI_KEYWORD_ANSWERABLE,
  SEMANTIC_ANSWERABLE,
  CLARIFY_CONFIDENCE,
  GROUNDED_INTENTS,
  topScore,
  isAnswerable,
  stripAsk,
  isTruncatedAsk,
  repeatLine,
  clarifyLine,
  askSpeakOverlap,
  isAlignedSpeak,
  isUniversalOperateSoft
};
