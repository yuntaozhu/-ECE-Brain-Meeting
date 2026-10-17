/**
 * 离线知识编译。只写索引，不参与开口。
 * 槽位来自 schema 规则，二元组权重来自全库文档频率。
 */
const fs = require("fs");
const path = require("path");
const { load, rx } = require("./schemaStore.cjs");

const ROOT = path.join(__dirname, "..", "..", "knowledge");
const OUT = path.join(ROOT, ".compiled-kb.json");

function read(name) {
  try {
    return fs.readFileSync(path.join(ROOT, name), "utf8");
  } catch (_) {
    return "";
  }
}

function chars(text) {
  return String(text || "").replace(/[^\u4e00-\u9fffA-Za-z0-9]/g, "");
}

function bigrams(text) {
  const s = chars(text);
  const out = [];
  for (let i = 0; i < s.length - 1; i += 1) out.push(s.slice(i, i + 2));
  return out;
}

function metaBigrams() {
  const set = new Set();
  for (const word of load().operators.dialogueMetaLexicon || []) {
    const grams = bigrams(word);
    if (grams.length) grams.forEach((b) => set.add(b));
    else if (String(word).length >= 2) set.add(String(word));
  }
  return set;
}

function parseFaq(raw) {
  const blocks = String(raw || "").replace(/\r\n/g, "\n").split(/\n(?=##\s)/);
  const cards = [];
  for (const block of blocks) {
    const t = block.trim();
    if (!/^##\s/.test(t)) continue;
    const head = (t.split("\n")[0] || "").replace(/^##\s*/, "").replace(/^Q[:：]\s*/, "");
    const titles = head.split(/\s*\/\s*/).map((s) => s.trim()).filter(Boolean);
    const answerMatch = t.match(/A[:：]\s*([\s\S]+)/);
    const spokenText = (answerMatch ? answerMatch[1] : "").replace(/\s+/g, " ").trim();
    if (!titles.length || !spokenText) continue;
    cards.push({ source: "faq", titles, spokenText });
  }
  return cards;
}

function parseHeadings(raw, source) {
  const text = String(raw || "").replace(/\r\n/g, "\n");
  const parts = text.split(/\n(?=#{1,3}\s)/);
  const cards = [];
  for (const part of parts) {
    const t = part.trim();
    if (t.length < 40) continue;
    const title = (t.split("\n")[0] || "").replace(/^#+\s*/, "").trim();
    const body = t.split("\n").slice(1).join("\n").replace(/\s+/g, " ").trim();
    if (!title || !body) continue;
    cards.push({ source, titles: [title], spokenText: body.slice(0, 500) });
  }
  return cards;
}

function parseWiki() {
  const dir = path.join(ROOT, "wiki");
  const cards = [];
  if (!fs.existsSync(dir)) return cards;
  const walk = (current) => {
    for (const name of fs.readdirSync(current)) {
      const full = path.join(current, name);
      const stat = fs.statSync(full);
      if (stat.isDirectory()) walk(full);
      else if (name.endsWith(".md") && name.toLowerCase() !== "index.md") {
        const raw = fs.readFileSync(full, "utf8");
        const rel = path.relative(dir, full).replace(/\\/g, "/").replace(/\.md$/, "");
        for (const card of parseHeadings(raw, "wiki")) {
          cards.push({ ...card, parentChunkId: rel });
        }
      }
    }
  };
  walk(dir);
  return cards;
}

function providedSlots(spokenText) {
  const rules = load().slots.rules || [];
  const got = [];
  for (const rule of rules) {
    const names = rule.answerAll || (rule.answer ? [rule.answer] : []);
    if (!names.length) continue;
    if (names.every((name) => rx("slots", name).test(spokenText))) got.push(rule.id);
  }
  return got;
}

function isDefinitionCard(card) {
  const blob = `${card.titles.join("\n")}\n${card.spokenText}`;
  return rx("operators", "definitionAsk").test(blob);
}

function overlap(aGrams, bSet) {
  if (!aGrams.length || !bSet.size) return 0;
  let hit = 0;
  for (const g of aGrams) if (bSet.has(g)) hit += 1;
  return hit / aGrams.length;
}

function compileKnowledge() {
  const faq = parseFaq(read("faq-meeting.txt")).map((c, i) => ({
    ...c,
    cardId: "faq_" + String(i + 1).padStart(3, "0")
  }));
  const detail = parseHeadings(read("quan-yuan-meiyu.txt"), "detail").map((c, i) => ({
    ...c,
    cardId: "detail_" + String(i + 1).padStart(3, "0"),
    parentChunkId: ""
  }));
  const wiki = parseWiki().map((c, i) => ({
    ...c,
    cardId: c.parentChunkId || "wiki_" + String(i + 1).padStart(3, "0")
  }));
  const cards = [...faq, ...detail, ...wiki];
  const df = new Map();
  const sets = cards.map((card) => {
    const set = new Set(bigrams(`${card.titles.join("")}${card.spokenText}`));
    for (const b of set) df.set(b, (df.get(b) || 0) + 1);
    return set;
  });
  const n = Math.max(1, cards.length);
  const meta = metaBigrams();
  const bigramWeights = {};
  let maxW = 0;
  for (const b of meta) {
    if (!df.has(b)) df.set(b, 0);
  }
  for (const [b, count] of df) {
    const w = meta.has(b) ? 0 : Math.log(1 + n / (1 + count));
    bigramWeights[b] = Number(w.toFixed(6));
    if (w > maxW) maxW = w;
  }
  const detailSets = detail.map((card, i) => ({ id: card.cardId, set: sets[faq.length + i] }));
  const compiled = cards.map((card, i) => {
    const grams = [...sets[i]];
    const weightSum = grams.reduce((acc, b) => acc + (bigramWeights[b] || 0), 0);
    const specificity = !grams.length || !maxW ? 0 : Number((weightSum / grams.length / maxW).toFixed(4));
    let parentChunkId = card.parentChunkId || "";
    if (card.source === "faq") {
      let best = "";
      let bestScore = 0;
      const ask = bigrams(card.titles.join(""));
      for (const row of detailSets) {
        const score = overlap(ask, row.set);
        if (score > bestScore) {
          bestScore = score;
          best = row.id;
        }
      }
      if (bestScore >= 0.18) parentChunkId = best;
    }
    return {
      cardId: card.cardId,
      source: card.source,
      titles: card.titles,
      spokenText: card.spokenText,
      compiledMeta: {
        topicState: providedSlots(card.spokenText)[0] || "GENERAL",
        providedSlots: providedSlots(card.spokenText),
        isDefinition: isDefinitionCard(card),
        specificity,
        parentChunkId
      }
    };
  });
  const payload = {
    builtAt: new Date().toISOString(),
    cardCount: compiled.length,
    bigramCount: Object.keys(bigramWeights).length,
    bigramWeights,
    cards: compiled
  };
  fs.writeFileSync(OUT, JSON.stringify(payload));
  return { out: OUT, cardCount: compiled.length, bigramCount: payload.bigramCount };
}

let compiledCache = null;

function loadCompiled() {
  if (compiledCache) return compiledCache;
  if (!fs.existsSync(OUT)) return null;
  compiledCache = JSON.parse(fs.readFileSync(OUT, "utf8"));
  return compiledCache;
}

function polarityBigrams(text) {
  const s = chars(text);
  const neg = String(load().operators.negationPrev || "");
  const window = Number(load().hyper.negationWindow) || 1;
  const out = new Map();
  for (let i = 0; i < s.length - 1; i += 1) {
    const b = s.slice(i, i + 2);
    let sign = 1;
    for (let k = 1; k <= window && i - k >= 0; k += 1) {
      if (neg.includes(s[i - k])) sign = -1;
    }
    if (!out.has(b)) out.set(b, sign);
    else if (out.get(b) !== sign) out.set(b, 0);
  }
  return out;
}

function ruleAsks(rule, ask, byId, seen) {
  if (!rule || seen.has(rule.id)) return false;
  seen.add(rule.id);
  for (const id of rule.blockedBy || []) {
    if (ruleAsks(byId[id], ask, byId, seen)) return false;
  }
  for (const name of rule.blockedByPattern || []) {
    if (rx("slots", name).test(ask)) return false;
  }
  if (rule.askAll) return rule.askAll.every((name) => rx("slots", name).test(ask));
  if (rule.ask) return rx("slots", rule.ask).test(ask);
  return false;
}

function ruleAnswers(rule, speak) {
  const names = rule.answerAll || (rule.answer ? [rule.answer] : []);
  if (!names.length) return false;
  return names.every((name) => rx("slots", name).test(String(speak || "")));
}

function findCard(index, title) {
  const t = String(title || "");
  if (!t || !index) return null;
  let best = null;
  let bestLen = 0;
  for (const card of index.cards || []) {
    for (const name of card.titles || []) {
      if (!name || name.length < 4) continue;
      if (t.includes(name) && name.length > bestLen) {
        best = card;
        bestLen = name.length;
      }
    }
  }
  return best;
}

/** 与现有对齐并列的影子量。不参与开口。 */
function diagnoseShadow({ ask, title, speak, align, extra } = {}) {
  const index = loadCompiled();
  if (!index || !index.bigramWeights) return { ready: false };
  const weights = index.bigramWeights;
  const qVec = polarityBigrams(ask);
  const tVec = polarityBigrams(`${title || ""}${speak || ""}`);
  let den = 0;
  let num = 0;
  let cancel = 0;
  const ranked = [];
  for (const [b, sign] of qVec) {
    const w = Number(weights[b]) || 0;
    den += w;
    if (w > 0) ranked.push([b, w]);
    const other = tVec.get(b);
    if (other == null) continue;
    if (sign * other < 0) cancel += 1;
    else if (sign * other > 0) num += w;
  }
  let extraDen = 0;
  let extraNum = 0;
  for (const [b] of tVec) {
    const w = Number(weights[b]) || 0;
    extraDen += w;
    if (!qVec.has(b)) extraNum += w;
  }
  const rules = load().slots.rules || [];
  const byId = Object.fromEntries(rules.map((rule) => [rule.id, rule]));
  const reqSlots = rules.filter((rule) => ruleAsks(rule, String(ask || ""), byId, new Set())).map((rule) => rule.id);
  const speakSlots = rules.filter((rule) => ruleAnswers(rule, speak)).map((rule) => rule.id);
  const card = findCard(index, title);
  const cardSlots = card?.compiledMeta?.providedSlots || [];
  const missingSlots = reqSlots.filter((id) => !speakSlots.includes(id));
  ranked.sort((a, b) => b[1] - a[1]);
  return {
    ready: true,
    align: align == null ? undefined : Number(align),
    extra: extra == null ? undefined : Number(extra),
    alignW: den ? Number((num / den).toFixed(4)) : 0,
    extraW: extraDen ? Number((extraNum / extraDen).toFixed(4)) : 0,
    polarityCancel: cancel,
    reqSlots,
    speakSlots,
    cardSlots,
    missingSlots,
    topWeights: ranked.slice(0, 5)
  };
}

module.exports = { compileKnowledge, loadCompiled, diagnoseShadow, OUT };
