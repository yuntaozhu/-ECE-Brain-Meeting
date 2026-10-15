/**
 * 问句 ↔ 标题的结构对齐。
 * 高频二元组（出现在大量标题里）和虚词不计分，避免「全园美语」把定义页抬到任何问句上。
 */
const STOP = new Set([
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

function grams(text) {
  const s = String(text || "").replace(/[^\u4e00-\u9fffA-Za-z0-9]/g, "");
  const out = [];
  for (let i = 0; i < s.length - 1; i += 1) out.push(s.slice(i, i + 2));
  return out;
}

function buildDf(titles) {
  const df = new Map();
  const list = titles || [];
  for (const t of list) {
    for (const g of new Set(grams(t))) df.set(g, (df.get(g) || 0) + 1);
  }
  return { df, n: Math.max(1, list.length) };
}

function keepGram(g, model) {
  if (STOP.has(g)) return false;
  const c = model?.df?.get(g) || 0;
  return c / (model?.n || 1) < 0.35;
}

/** 0–1。问句没有区分性二元组时退回「去掉虚词」的重合。 */
function alignScore(ask, title, model) {
  const askG = grams(ask);
  const titleSet = new Set(grams(title));
  if (!askG.length || !titleSet.size) return 0;
  let use = askG.filter((g) => keepGram(g, model));
  if (!use.length) use = askG.filter((g) => !STOP.has(g));
  if (!use.length) use = askG;
  let hit = 0;
  for (const g of use) if (titleSet.has(g)) hit += 1;
  return hit / use.length;
}

/** FAQ 标题常把多条问法拼在一起。按分隔符拆开，各自对齐。 */
function titleSegments(title) {
  const raw = String(title || "")
    .replace(/^#+\s*/, "")
    .replace(/^Q[:：]\s*/i, "");
  const parts = raw
    .split(/[/／|｜]/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 2);
  return parts.length ? parts : [String(title || "")];
}

/**
 * 问句只对应标题里的一条问法。
 * 对齐取最高的那条，窄度也只看那一条，避免别的问法把 extra 抬高。
 */
function bestTitleView(ask, title, model) {
  let best = { align: 0, extra: 1, segment: "" };
  for (const seg of titleSegments(title)) {
    const align = alignScore(ask, seg, model);
    const extra = titleExtraRatio(ask, seg, model);
    const key = align - 0.35 * extra;
    if (!best.segment || key > best.key) best = { align, extra, segment: seg, key };
  }
  return best;
}

/** 标题里有、问句里没有的区分性二元组占比。高 = 标题比问句更窄。 */
function titleExtraRatio(ask, title, model) {
  const askSet = new Set(grams(ask).filter((g) => keepGram(g, model)));
  const titleG = [...new Set(grams(title).filter((g) => keepGram(g, model)))];
  if (!titleG.length) return 0;
  let extra = 0;
  for (const g of titleG) if (!askSet.has(g)) extra += 1;
  return extra / titleG.length;
}

module.exports = { grams, buildDf, alignScore, titleExtraRatio, titleSegments, bestTitleView, STOP };
