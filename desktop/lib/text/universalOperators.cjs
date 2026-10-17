/**
 * 通用文本算子。词和阈值只从 schema / 编译索引读取。
 */
const { load, rx, words, hp } = require("../knowledge/schemaStore.cjs");
const { loadCompiled } = require("../knowledge/compiler.cjs");

function chars(text) {
  return String(text || "").replace(/[^\u4e00-\u9fffA-Za-z0-9]/g, "");
}

function bigramWeights() {
  const index = loadCompiled();
  return (index && index.bigramWeights) || {};
}

/** 字二元组 + IDF 权重 + 否定极性。 */
function extractWeightedPolarityBigrams(text) {
  const s = chars(text);
  const weights = bigramWeights();
  const neg = String(load().operators.negationPrev || "");
  const window = Number(hp("negationWindow")) || 1;
  const out = [];
  for (let i = 0; i < s.length - 1; i += 1) {
    const b = s.slice(i, i + 2);
    let sign = 1;
    for (let k = 1; k <= window && i - k >= 0; k += 1) {
      if (neg.includes(s[i - k])) {
        sign = -1;
        break;
      }
    }
    out.push({ b, w: Number(weights[b]) || 0, p: sign, i });
  }
  return out;
}

function toMap(vec) {
  const map = new Map();
  for (const row of vec || []) {
    if (!map.has(row.b)) map.set(row.b, row);
    else if (map.get(row.b).p !== row.p) map.set(row.b, { ...row, p: 0 });
  }
  return map;
}

/** 极性一致的加权对齐与标题超出度。 */
function computeAlignmentAndExtra(queryVec, titleVec) {
  const q = toMap(queryVec);
  const t = toMap(titleVec);
  let den = 0;
  let num = 0;
  let cancel = 0;
  for (const [b, row] of q) {
    den += row.w;
    const other = t.get(b);
    if (!other) continue;
    if (row.p * other.p < 0) cancel += 1;
    else if (row.p * other.p > 0) num += row.w;
  }
  let extraDen = 0;
  let extraNum = 0;
  for (const [, row] of t) {
    extraDen += row.w;
    if (!q.has(row.b)) extraNum += row.w;
  }
  return {
    align: den ? num / den : 0,
    extra: extraDen ? extraNum / extraDen : 0,
    polarityCancel: cancel
  };
}

function isMetaFragment(frag) {
  if (!frag) return true;
  const drop = words("operators", "dropWords");
  const topicDrop = words("operators", "topicDrop");
  if (drop.has(frag) || topicDrop.has(frag)) return true;
  for (const word of drop) {
    if (word.length > frag.length && word.endsWith(frag)) return true;
  }
  for (const word of load().operators.dialogueMetaLexicon || []) {
    if (frag === word || (word.length >= 2 && frag.includes(word))) return true;
  }
  if (/[怎何如吗呢嘛吧的问]$/.test(frag)) return true;
  if (/^[怎何的么样]/.test(frag)) return true;
  return false;
}

function titleList() {
  const index = loadCompiled();
  if (!index || !index.cards) return [];
  if (titleList.cache) return titleList.cache;
  const list = [];
  for (const card of index.cards || []) {
    for (const title of card.titles || []) {
      const t = chars(title);
      if (t.length >= 2) list.push(t);
    }
  }
  titleList.cache = list;
  return list;
}

function inAnyTitle(frag) {
  if (!frag) return false;
  return titleList().some((title) => title.includes(frag));
}

/** 片段相对最短命中标题的占比；越接近 1 越像标题本身。 */
function titleSpecificity(frag) {
  if (!frag) return 0;
  let best = Infinity;
  for (const title of titleList()) {
    if (!title.includes(frag)) continue;
    if (title.length < best) best = title.length;
  }
  if (!Number.isFinite(best) || best <= 0) return 0;
  return frag.length / best;
}

/**
 * 在 2–6 字窗口中取信息量高、偏向句末、且尽量落在卡片标题里的片段。
 * 元词权重为 0，疑问尾巴也不当焦点。
 */
function extractHighEntropyFocus(text) {
  const s = chars(text);
  if (s.length < 2) return "";
  const weights = bigramWeights();
  const weak = words("operators", "weakTail");
  const min = hp("focusWordMin");
  const max = hp("focusWordMax");
  const weightAt = (i) => Number(weights[s.slice(i, i + 2)]) || 0;

  let best = { score: -1, frag: "" };
  for (let len = min; len <= Math.min(max, s.length); len += 1) {
    for (let i = 0; i + len <= s.length; i += 1) {
      const frag = s.slice(i, i + len);
      if (isMetaFragment(frag)) continue;
      let sum = 0;
      let n = 0;
      for (let j = i; j < i + len - 1; j += 1) {
        sum += weightAt(j);
        n += 1;
      }
      if (!n || sum <= 0) continue;
      const avg = sum / n;
      const endBias = (i + len) / s.length;
      const spec = titleSpecificity(frag);
      const titled = spec > 0 ? 1 + 4 * spec : 1;
      const score = avg * (0.2 + 0.8 * endBias) * titled;
      if (score > best.score) best = { score, frag };
    }
  }
  let focus = best.frag;
  if (!focus) return "";
  if (weak.has(focus)) {
    const idx = s.lastIndexOf(focus);
    if (idx >= min) {
      const prev = s.slice(Math.max(0, idx - max), idx);
      for (let len = Math.min(max, prev.length); len >= min; len -= 1) {
        const cand = prev.slice(prev.length - len);
        if (!isMetaFragment(cand) && !weak.has(cand)) {
          focus = cand;
          break;
        }
      }
    }
  }
  return focus;
}

/**
 * 句尾完备度 ∈ [0,1]。悬空句尾偏低。
 * 转移表在 schema；没有表时退回现有残句特征。
 */
function evaluateSyntacticCompleteness(text) {
  const raw = String(text || "").trim();
  const s = chars(raw);
  if (!s) return 0;
  const cfg = load().operators.completeness || {};
  const dangling = new Set(cfg.danglingMarkers || []);
  const particle = new Set(cfg.particleEnds || []);
  const complete = new Set(cfg.completeEnds || []);
  const tail = s.slice(-2);
  const last = s.slice(-1);
  if (cfg.transitions && cfg.transitions[tail] != null) {
    return Math.max(0, Math.min(1, Number(cfg.transitions[tail])));
  }
  if (dangling.has(tail) || dangling.has(last)) return 0.15;
  if (particle.has(last)) return 0.92;
  if (complete.has(last) || complete.has(tail)) return 0.9;
  if (rx("operators", "ableStub").test(s.replace(rx("operators", "howWordConsume"), ""))) return 0.2;
  if (rx("operators", "bareQuestion").test(s)) return 0.18;
  if (rx("operators", "howShort").test(s) && !rx("operators", "howShortNot").test(s)) return 0.22;
  if (s.length <= 3) return 0.35;
  return 0.75;
}

/** 问句需要的槽位集合。 */
function requiredSlots(ask) {
  const rules = load().slots.rules || [];
  const byId = Object.fromEntries(rules.map((rule) => [rule.id, rule]));
  const out = [];
  for (const rule of rules) {
    if (asksRule(rule, String(ask || ""), byId, new Set())) out.push(rule.id);
  }
  return out;
}

function asksRule(rule, ask, byId, seen) {
  if (!rule || seen.has(rule.id)) return false;
  seen.add(rule.id);
  for (const id of rule.blockedBy || []) {
    if (asksRule(byId[id], ask, byId, seen)) return false;
  }
  for (const name of rule.blockedByPattern || []) {
    if (rx("slots", name).test(ask)) return false;
  }
  if (rule.askAll) return rule.askAll.every((name) => rx("slots", name).test(ask));
  if (rule.ask) return rx("slots", rule.ask).test(ask);
  return false;
}

function providedSlotsFromSpeak(speak) {
  const rules = load().slots.rules || [];
  const out = [];
  for (const rule of rules) {
    const names = rule.answerAll || (rule.answer ? [rule.answer] : []);
    if (!names.length) continue;
    if (names.every((name) => rx("slots", name).test(String(speak || "")))) out.push(rule.id);
  }
  return out;
}

/** ReqSlots ⊆ providedSlots */
function validateSlots(ask, speak) {
  const need = requiredSlots(ask);
  if (!need.length) return true;
  const got = new Set(providedSlotsFromSpeak(speak));
  return need.every((id) => got.has(id));
}

/** 宿主文本里主题是否正面出现（极性窗口）。 */
function topicMentionedPositively(host, topic) {
  const h = chars(host);
  const t = chars(topic);
  if (!h || !t) return false;
  const hostVec = extractWeightedPolarityBigrams(h);
  const topicVec = extractWeightedPolarityBigrams(t);
  if (!topicVec.length) {
    const neg = String(load().operators.negationPrev || "");
    let from = 0;
    while (from <= h.length - t.length) {
      const i = h.indexOf(t, from);
      if (i < 0) return false;
      const prev = i > 0 ? h[i - 1] : "";
      if (!neg.includes(prev)) return true;
      from = i + 1;
    }
    return false;
  }
  const hostMap = toMap(hostVec);
  for (const row of topicVec) {
    const hit = hostMap.get(row.b);
    if (!hit) continue;
    if (row.p * hit.p > 0) return true;
  }
  // 主题整段出现：只看完全落在该段内的二元组极性
  let from = 0;
  while (from <= h.length - t.length) {
    const i = h.indexOf(t, from);
    if (i < 0) return false;
    const around = hostVec.filter((row) => row.i >= i && row.i + 2 <= i + t.length);
    if (!around.length) return true;
    if (around.every((row) => row.p > 0)) return true;
    from = i + 1;
  }
  return false;
}

module.exports = {
  extractWeightedPolarityBigrams,
  computeAlignmentAndExtra,
  extractHighEntropyFocus,
  evaluateSyntacticCompleteness,
  requiredSlots,
  providedSlotsFromSpeak,
  validateSlots,
  topicMentionedPositively
};
