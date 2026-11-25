"use strict";

/**
 * 口径答复附带「还可以问」——不改口播正文，单独字段供 UI / 微信尾注
 */
const { listConceptPages } = require("../knowledge/wiki.cjs");
const { loadFaqCards } = require("../knowledge/faq.cjs");
const { normalizeText } = require("../knowledge/parse.cjs");
const { loadOrBuildIndex } = require("../wiki2/buildIndex.cjs");

const DEFAULT_STARTERS = [
  "宁玉有什么特点",
  "什么是脱毒苗",
  "上海哪里种草莓",
  "上海草莓什么时候定植",
  "草莓资料去哪查",
  "宁丰和宁玉有什么区别"
];

function sameQuestion(a, b) {
  const na = normalizeText(a);
  const nb = normalizeText(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  if (na.length >= 4 && (nb.includes(na) || na.includes(nb))) return true;
  return false;
}

function pushUnique(list, q, exclude) {
  const t = String(q || "")
    .replace(/^[Qq][:：]\s*/, "")
    .replace(/[？?]+$/g, "")
    .trim();
  if (t.length < 4 || t.length > 36) return;
  if (exclude.some((e) => sameQuestion(e, t))) return;
  if (list.some((e) => sameQuestion(e, t))) return;
  list.push(t);
}

function pageBySlug(slug) {
  return listConceptPages().find((p) => p.slug === slug) || null;
}

/**
 * @param {string} query
 * @param {{ slug?: string, title?: string, layer?: string, max?: number }} [ctx]
 * @returns {string[]}
 */
function collectMoreQuestions(query, ctx = {}) {
  const max = Number(ctx.max) || 5;
  const out = [];
  const exclude = [query];

  // 1) 当前 Wiki 页常见问法
  if (ctx.slug) {
    const page = pageBySlug(ctx.slug);
    if (page) {
      for (const a of page.aliases || []) pushUnique(out, a, exclude);
      for (const rel of page.related || []) {
        const rp = pageBySlug(rel);
        if (!rp) continue;
        for (const a of (rp.aliases || []).slice(0, 2)) pushUnique(out, a, exclude);
        if (rp.title) pushUnique(out, `${rp.title.replace(/草莓$/, "")}有什么特点`, exclude);
      }
    }
  }

  // 2) Wiki2 命中页的 aliases
  try {
    const index = loadOrBuildIndex();
    const hit = (index.pages || []).find((p) => p.slug === ctx.slug);
    if (hit) {
      for (const a of hit.aliases || []) pushUnique(out, a, exclude);
    }
  } catch (_) {}

  // 3) 相关 FAQ 问法（标题有交集）
  const qn = normalizeText(query);
  const tokens = [];
  const cjk = qn.replace(/[^\u4e00-\u9fff]/g, "");
  for (let i = 0; i + 2 <= cjk.length; i++) tokens.push(cjk.slice(i, i + 2));
  for (const card of loadFaqCards()) {
    let overlap = 0;
    const hay = normalizeText(card.title + (card.questions || []).join(""));
    for (const t of tokens) if (hay.includes(t)) overlap += 1;
    if (overlap < 2) continue;
    for (const qq of card.questions || []) pushUnique(out, qq, exclude);
    if (out.length >= max) break;
  }

  // 4) 身份/缺口时给默认引导
  if (ctx.layer === "identity" || ctx.layer === "gap" || ctx.layer === "llm" || out.length < 3) {
    for (const s of DEFAULT_STARTERS) pushUnique(out, s, exclude);
  }

  return out.slice(0, max);
}

/** 展示用尾注（勿直接塞进 TTS 口播） */
function formatMoreQuestionsNote(questions) {
  const qs = (questions || []).filter(Boolean);
  if (!qs.length) return "";
  return "\n\n还可以问我：\n" + qs.map((q, i) => `${i + 1}. ${q}`).join("\n");
}

/** 微信等短渠道 */
function formatMoreQuestionsInline(questions, limit = 3) {
  const qs = (questions || []).filter(Boolean).slice(0, limit);
  if (!qs.length) return "";
  return "还可以问：" + qs.join("；");
}

module.exports = {
  collectMoreQuestions,
  formatMoreQuestionsNote,
  formatMoreQuestionsInline,
  DEFAULT_STARTERS
};
