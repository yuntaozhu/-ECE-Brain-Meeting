/**
 * Tier-2 Deep Dive：可口述层与内部控场层解耦（旁路模板）。
 */
const { copilotCfg } = require("./gate.cjs");
const { sanitizeSpeakText } = require("./sanitizeSpeakText.cjs");

function clip(s, n) {
  const t = String(s || "").replace(/\s+/g, " ").trim();
  if (t.length <= n) return t;
  return t.slice(0, Math.max(0, n - 1)) + "…";
}

function normBullet(b) {
  return String(b || "")
    .replace(/^(论据|避坑|权衡|引导)[：:]/u, "")
    .replace(/\s+/g, "")
    .trim();
}

function dedupeBullets(items) {
  const seen = new Set();
  const out = [];
  for (const b of items) {
    const n = normBullet(b);
    if (!n || seen.has(n)) continue;
    seen.add(n);
    out.push(b);
  }
  return out;
}

function isInternalFact(f) {
  return /否决|SUPERSEDED|历史已否决|权衡[：:]/i.test(String(f || ""));
}

/**
 * @param {{
 *   target_topic?: string,
 *   category?: string,
 *   suggestions?: object,
 *   key_facts?: string[],
 *   faq_title?: string|null,
 *   segment?: string
 * }} packet
 */
function buildDeepDive(packet) {
  const cfg = copilotCfg();
  const hint = cfg.deepDive?.systemHint || "";
  const topic = packet?.target_topic || "当前议题";
  const facts = Array.isArray(packet?.key_facts) ? packet.key_facts.filter(Boolean) : [];
  const s = packet?.suggestions || {};

  const thesis = sanitizeSpeakText(
    clip(s.push_forward, 80) || `围绕「${topic}」，建议先对齐事实与边界再推进。`
  );

  const internal = [];
  const evidence = [];
  for (const f of facts) {
    if (isInternalFact(f)) internal.push(clip(f, 72));
    else evidence.push(clip(f, 72));
  }
  if (packet?.faq_title) {
    evidence.push(`FAQ：${clip(packet.faq_title, 28)}`);
  }
  if (s.push_back && isInternalFact(s.push_back)) {
    const line = clip(s.push_back, 72);
    if (!internal.some((x) => normBullet(x) === normBullet(line))) internal.push(line);
  } else if (s.push_back) {
    const line = `权衡：${clip(sanitizeSpeakText(s.push_back), 64)}`;
    if (!internal.some((x) => normBullet(x) === normBullet(line))) {
      /* 非否决类 push_back 仍可作展示论据，不进口播 */
    }
  }

  const bullets = [];
  for (const e of evidence) {
    bullets.push(`论据：${clip(e, 72)}`);
    if (bullets.length >= 2) break;
  }
  if (internal[0]) bullets.push(`避坑：${clip(internal[0], 72)}`);
  else if (s.push_back && !isInternalFact(s.push_back)) {
    bullets.push(`权衡：${clip(sanitizeSpeakText(s.push_back), 72)}`);
  }
  if (bullets.length < 2 && s.counter_inquiry) {
    bullets.push(`引导：${clip(sanitizeSpeakText(s.counter_inquiry), 72)}`);
  }
  while (bullets.length < 2) {
    bullets.push("论据：结合现场转写与知识库口径再补一条可验证事实。");
  }

  const speakable = sanitizeSpeakText(clip(thesis, 160));

  return {
    enabled: true,
    thesis,
    bullets: dedupeBullets(bullets).slice(0, 3),
    speakable,
    speak_script: speakable,
    internal: internal.slice(0, 4),
    evidence: evidence.slice(0, 6),
    hint: hint.slice(0, 120),
    category: packet?.category || "",
    topic
  };
}

module.exports = { buildDeepDive, dedupeBullets };
