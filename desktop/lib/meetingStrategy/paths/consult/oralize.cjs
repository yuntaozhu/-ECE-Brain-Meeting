/**
 * 定卡后短合成：豆包只重组已承诺口播，失败立刻回退原句。
 */
const S = require("./kit.cjs");

function hasDoubaoKey() {
  return Boolean((process.env.DOUBAO_API_KEY || process.env.ARK_API_KEY || "").trim());
}

async function oralizeCommitted(local, ctx) {
  if (!local || !local.oralize || !local.cardSpeak) return local;
  if (!hasDoubaoKey() || ctx.opts?.forceRule) return local;
  const ask = String(ctx.askText || ctx.lastFloor || "").trim();
  const card = String(local.cardSpeak || local.fullAnswer || "").trim();
  if (!card || card.length < 12) return local;

  const { arkChat } = require("../../llm");
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), 4500);
  try {
    const user = S.speakFill("composeCard", { ask: ask.slice(0, 80) || "（无）", card: card.slice(0, 220) });
    const system = S.speakLine("oralizeSystem");
    if (!system) return local;
    const res = await arkChat(system, user, {
      fast: true,
      temperature: 0.35,
      signal: ac.signal,
      timeoutMs: 4500
    });
    const draft = S.stripIntroBoilerplate(S.clipUtterance(String(res?.content || ""), 140));
    if (!res?.ok || !draft || draft.length < 10) return local;
    // 数字/否定边界：若原句有关键否定而草稿丢掉，回退
    if (/不能|不要|不保证|没有写/.test(card) && !/不能|不要|不保证|没有写/.test(draft)) return local;
    return {
      ...local,
      interventionText: draft,
      fullAnswer: draft,
      arkMode: "compose-card",
      oralize: false
    };
  } catch (_) {
    return local;
  } finally {
    clearTimeout(timer);
  }
}

module.exports = { oralizeCommitted };
