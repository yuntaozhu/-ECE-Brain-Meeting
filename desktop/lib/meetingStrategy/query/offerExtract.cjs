/**
 * 从 Host 反问句抽取可选项（「A、B，还是 C」与冒号列举）。
 * 规则只读 query-classify schema。
 */
const { load, rx } = require("../../knowledge/schemaStore.cjs");

function lim(name) {
  return Number(load().classify.limits[name]);
}

function pat(name) {
  return rx("classify", name);
}

function cleanPart(s) {
  return String(s || "")
    .replace(pat("choiceNoisePrefix"), "")
    .replace(/^的?是/, "")
    .replace(/[的呢啊哦呀\s]/g, "")
    .trim();
}

function uniqParts(parts) {
  const out = [];
  for (const p of parts) {
    const s = cleanPart(p);
    if (s.length < lim("choicePartMin") || s.length > lim("choicePartMax")) continue;
    if (pat("choiceNoiseFilter").test(s)) continue;
    if (!out.includes(s)) out.push(s);
  }
  return out;
}

/**
 * @param {string} hostText
 * @returns {string[]}
 */
function extractOfferedChoices(hostText) {
  const h = String(hostText || "").trim();
  if (!h) return [];
  let inviteOk = false;
  try {
    inviteOk = pat("choiceInvite").test(h);
  } catch (_) {
    inviteOk = /还是|或者|最看重|更关心|想先听/.test(h);
  }
  if (!inviteOk) return [];

  // A、B，还是 C
  try {
    const orRe = pat("choiceOrSplit");
    const orIdx = h.search(orRe);
    if (orIdx > 0) {
      let right = h.slice(orIdx).replace(orRe, "").replace(/[？?。.!！\s]+$/g, "").trim();
      let left = h.slice(0, orIdx);
      try {
        left = left.replace(pat("choiceLeadStrip"), "");
      } catch (_) {
        left = left.replace(/^.*?最看重/, "").replace(/^.*?更关心/, "").replace(/^.*?先看/, "");
      }
      left = left.replace(/^[：:\s]+/, "").replace(/[，,、\s]+$/g, "");
      right = right.replace(/[的呢啊哦呀]+$/g, "").trim();
      const leftParts = left.split(/[、，,/／]/);
      const parts = uniqParts([...leftParts, right]);
      if (parts.length >= 2) return parts;
    }
  } catch (_) {}

  // 冒号后列举 / 邀请语前 lookback（旧路径）
  let chunk = "";
  const colon = h.match(pat("choiceColon"));
  if (colon) chunk = colon[1];
  else {
    const idx = h.search(pat("choiceInvite"));
    if (idx > 4) chunk = h.slice(Math.max(0, idx - lim("choiceLookback")), idx);
  }
  chunk = String(chunk || "").replace(/与/g, "、");
  return uniqParts(chunk.split(/[、，,/／]/));
}

function rewriteChoiceLabel(cb) {
  for (const row of load().classify.choiceRewrite || []) {
    if (row && row.test && new RegExp(row.test).test(cb)) return row.rewritten;
  }
  return `${cb}是什么`;
}

/**
 * @param {string} floor
 * @param {string} [lastHostAnswer]
 * @param {string[]} [explicitChoices]
 */
function matchOfferedChoice(floor, lastHostAnswer, explicitChoices) {
  const { normalizeDazhiAliases } = require("../../meetingSession/commands/normalize.cjs");
  const raw = normalizeDazhiAliases(String(floor || "").trim());
  const bare = raw.replace(/[，,。．.!！？?\s]/g, "");
  if (!bare || bare.length < lim("choiceBareMin") || bare.length > lim("choiceBareMax")) {
    return null;
  }
  if (pat("choiceCommand").test(bare)) return null;
  const choices =
    Array.isArray(explicitChoices) && explicitChoices.length
      ? explicitChoices
      : extractOfferedChoices(lastHostAnswer);
  if (!choices.length) return null;
  for (const c of choices) {
    const cb = String(c || "").replace(/\s+/g, "");
    if (!cb) continue;
    if (bare === cb || bare.includes(cb) || cb.includes(bare)) {
      return { choice: cb, rewritten: rewriteChoiceLabel(cb) };
    }
  }
  return null;
}

module.exports = {
  extractOfferedChoices,
  rewriteChoiceLabel,
  matchOfferedChoice
};
