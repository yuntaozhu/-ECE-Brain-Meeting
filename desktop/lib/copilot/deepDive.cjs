/**
 * Tier-2 Deep Dive：在 Option 卡之外给出可口述长一点的支撑口径（旁路模板，默认可离线）。
 */
const { copilotCfg } = require("./gate.cjs");

function clip(s, n) {
  const t = String(s || "").replace(/\s+/g, " ").trim();
  if (t.length <= n) return t;
  return t.slice(0, Math.max(0, n - 1)) + "…";
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

  const thesis =
    clip(s.push_forward, 80) ||
    `围绕「${topic}」，建议先对齐事实与边界再推进。`;
  const bullets = [];
  if (facts[0]) bullets.push(`论据：${clip(facts[0], 72)}`);
  if (facts[1]) bullets.push(`论据：${clip(facts[1], 72)}`);
  const supersededFact = facts.find((f) => /否决|SUPERSEDED|历史已否决/i.test(f));
  if (supersededFact) bullets.push(`避坑：${clip(supersededFact, 72)}`);
  else if (s.push_back) bullets.push(`权衡：${clip(s.push_back, 72)}`);
  if (bullets.length < 2 && s.counter_inquiry) {
    bullets.push(`引导：${clip(s.counter_inquiry, 72)}`);
  }
  while (bullets.length < 2) {
    bullets.push("论据：结合现场转写与知识库口径再补一条可验证事实。");
  }

  const speakScript = clip(
    [
      thesis,
      bullets[0]?.replace(/^论据：/, ""),
      packet?.faq_title ? `可参考 FAQ「${clip(packet.faq_title, 28)}」。` : "",
      s.counter_inquiry ? `可反问：${clip(s.counter_inquiry, 48)}` : ""
    ]
      .filter(Boolean)
      .join(" "),
    160
  );

  return {
    enabled: true,
    thesis,
    bullets: bullets.slice(0, 3),
    speak_script: speakScript,
    hint: hint.slice(0, 120),
    category: packet?.category || "",
    topic
  };
}

module.exports = { buildDeepDive };
