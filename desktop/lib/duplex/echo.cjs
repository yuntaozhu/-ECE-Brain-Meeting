/**
 * 半双工 — Host 回灌/回声判定
 */
const {
  TOPIC_HINT_RE,
  normText,
  isIntroSelfTalk,
  isFollowUpNotEcho
} = require("./textNorm.cjs");
const { POST_HOST_ECHO_MS } = require("./phase.cjs");
const { rx } = require("../knowledge/schemaStore.cjs");

function longestCommonSubstringLen(a, b) {
  const s = normText(a);
  const t = normText(b);
  if (!s || !t) return 0;
  const m = Math.min(s.length, 80);
  const n = Math.min(t.length, 120);
  let best = 0;
  const dp = new Array(n + 1).fill(0);
  for (let i = 1; i <= m; i++) {
    let prev = 0;
    for (let j = 1; j <= n; j++) {
      const tmp = dp[j];
      if (s[i - 1] === t[j - 1]) {
        dp[j] = prev + 1;
        if (dp[j] > best) best = dp[j];
      } else {
        dp[j] = 0;
      }
      prev = tmp;
    }
  }
  return best;
}

function bigramOverlapRatio(a, b) {
  const s = normText(a);
  const t = normText(b);
  if (s.length < 4 || t.length < 4) return 0;
  const grams = new Set();
  for (let i = 0; i < s.length - 1; i++) grams.add(s.slice(i, i + 2));
  let hit = 0;
  for (let i = 0; i < t.length - 1; i++) {
    if (grams.has(t.slice(i, i + 2))) hit += 1;
  }
  return hit / Math.max(1, t.length - 1);
}

/**
 * Host 刚说完后的「好的/嗯 + 主题词」或高度重合碎片 → 回灌假对话。
 * @param {string} text
 * @param {string[]} recentHostUtterances
 * @param {number|null} sinceHostMs
 */
function isPostHostEchoFragment(text, recentHostUtterances = [], sinceHostMs = null) {
  if (sinceHostMs == null || sinceHostMs > POST_HOST_ECHO_MS) return null;
  const t = String(text || "").trim();
  if (!t || t.length < 4) return null;
  const hosts = (recentHostUtterances || []).filter(Boolean);
  if (!hosts.length) return null;

  const affirm = rx("operators", "postAffirm").test(t);
  const hasTheme = TOPIC_HINT_RE.test(t);
  let bestRatio = 0;
  for (const h of hosts) {
    bestRatio = Math.max(bestRatio, bigramOverlapRatio(h, t));
    const lcs = longestCommonSubstringLen(h, t);
    if (lcs >= 10) bestRatio = Math.max(bestRatio, 0.65);
  }
  const hostHasTheme = hosts.some((h) => TOPIC_HINT_RE.test(h));

  if (affirm && hasTheme && hostHasTheme && bestRatio >= 0.22) {
    return { echo: true, score: 0.82, reason: "post-hold-affirm+theme" };
  }
  if (hasTheme && hostHasTheme && bestRatio >= 0.38 && t.length >= 8) {
    return { echo: true, score: Math.max(0.7, bestRatio), reason: "post-hold-theme" };
  }
  if (bestRatio >= 0.5 && t.length >= 8) {
    return { echo: true, score: bestRatio, reason: "post-hold-overlap" };
  }
  return null;
}

/**
 * @param {string} text
 * @param {string[]} recentHostUtterances
 * @param {{ sinceHostMs?: number|null, postHoldMs?: number }} [opts]
 */
function looksLikeHostEcho(text, recentHostUtterances = [], opts = {}) {
  const t = String(text || "").trim();
  if (!t || t.length < 6) return { echo: false, score: 0, reason: "" };
  if (isFollowUpNotEcho(t)) {
    return { echo: false, score: 0, reason: "follow-up-question" };
  }
  if (isIntroSelfTalk(t)) {
    return { echo: true, score: 0.95, reason: "intro-template" };
  }

  const since =
    opts.sinceHostMs != null
      ? opts.sinceHostMs
      : opts.lastHostSpeakAt
        ? Date.now() - opts.lastHostSpeakAt
        : null;
  const post = isPostHostEchoFragment(t, recentHostUtterances, since);
  if (post) return post;

  const { load, rx } = require("../knowledge/schemaStore.cjs");
  const themeFrag = rx("operators", "echoTheme").test(t);
  const hubs = load().operators.echoHubTokens || [];
  if (
    themeFrag &&
    (recentHostUtterances || []).some((h) => {
      const hub = normText(h);
      return hubs.some((token) => hub.includes(token));
    })
  ) {
    if (normText(t).length >= 8) {
      return { echo: true, score: 0.75, reason: "faq-theme" };
    }
  }

  let best = 0;
  let reason = "";
  for (const h of recentHostUtterances || []) {
    if (!h) continue;
    const lcs = longestCommonSubstringLen(h, t);
    const ratio = bigramOverlapRatio(h, t);
    const score = Math.max(lcs / 20, ratio);
    if (lcs >= 12 && score > best) {
      best = Math.max(score, 0.6);
      reason = `lcs=${lcs}`;
    }
    if (ratio >= 0.55 && score > best) {
      best = ratio;
      reason = `bigram=${ratio.toFixed(2)}`;
    }
    const hub = normText(h);
    const tt = normText(t);
    const needle = hub.slice(0, Math.min(16, hub.length));
    if (needle.length >= 10 && tt.includes(needle.slice(0, 12))) {
      best = Math.max(best, 0.7);
      reason = "substr";
    }
  }
  if (best >= 0.62) return { echo: true, score: best, reason };
  return { echo: false, score: best, reason };
}

module.exports = {
  longestCommonSubstringLen,
  bigramOverlapRatio,
  isPostHostEchoFragment,
  looksLikeHostEcho
};
