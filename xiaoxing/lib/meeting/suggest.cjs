"use strict";

const fs = require("fs");
const { matchFaq } = require("../knowledge/faq.cjs");
const { scorePagesForQuery } = require("../knowledge/wiki.cjs");
const { checkRefuse, loadBoundary } = require("../ask/gate.cjs");
const { schemaFile } = require("../knowledge/paths.cjs");

let _gate = null;

function loadGate() {
  if (_gate) return _gate;
  try {
    _gate = JSON.parse(fs.readFileSync(schemaFile("copilot-gate.json"), "utf8"));
  } catch (_) {
    _gate = {
      enabled: true,
      minScore: 16,
      othersOnlyQuestions: true,
      questionCue: "[？?]|什么|怎么|是否|多少|哪",
      maxSpeakChars: 120,
      speakOnDemandOnly: true
    };
  }
  return _gate;
}

function looksLikeQuestion(text, cue) {
  try {
    return new RegExp(cue || "[？?]", "u").test(String(text || ""));
  } catch (_) {
    return /[？?]/.test(String(text || ""));
  }
}

/**
 * 旁路建议：不写 session/inbox、不自动口播
 * @returns {null | { layer: string, reply: string, score: number, title?: string, slug?: string }}
 */
function suggestSilent(query) {
  const gate = loadGate();
  if (gate.enabled === false) return null;
  const q = String(query || "").trim();
  if (q.length < 4) return null;

  const refused = checkRefuse(q);
  if (refused.refuse) {
    return {
      layer: "refuse",
      reply: refused.reply,
      score: 100,
      title: "边界"
    };
  }

  try {
    const { matchMarketQuote, looksLikePriceQuery } = require("../market/retrieve.cjs");
    if (looksLikePriceQuery(q)) {
      const m = matchMarketQuote(q);
      if (m?.reply) {
        return {
          layer: "market",
          reply: String(m.reply).slice(0, gate.maxSpeakChars || 160),
          score: m.score,
          title: m.quote?.product_name || "行情",
          moreQuestions: m.moreQuestions || []
        };
      }
    }
  } catch (_) {}

  const boundary = loadBoundary();
  const faq = matchFaq(q, boundary.minFaqScore || 18);
  if (faq && faq.score >= (gate.minScore || 16)) {
    let moreQuestions = [];
    try {
      const { collectMoreQuestions } = require("../ask/moreQuestions.cjs");
      const pages = scorePagesForQuery(q, 1);
      moreQuestions = collectMoreQuestions(q, {
        slug: pages[0]?.slug,
        layer: "faq",
        max: 4
      });
    } catch (_) {}
    return {
      layer: "faq",
      reply: String(faq.answer || "").slice(0, gate.maxSpeakChars || 120),
      score: faq.score,
      title: faq.title,
      moreQuestions
    };
  }

  const pages = scorePagesForQuery(q, 2);
  const top = pages[0];
  if (top && top.score >= Math.max(gate.minScore || 16, boundary.minWikiScore || 12) && top.speak) {
    let moreQuestions = [];
    try {
      const { collectMoreQuestions } = require("../ask/moreQuestions.cjs");
      moreQuestions = collectMoreQuestions(q, {
        slug: top.slug,
        layer: top.mode === "wiki2" ? "wiki2" : "wiki",
        max: 4
      });
    } catch (_) {}
    return {
      layer: top.mode === "wiki2" ? "wiki2" : "wiki",
      reply: String(top.speak || "").slice(0, gate.maxSpeakChars || 120),
      score: top.score,
      title: top.title,
      slug: top.slug,
      moreQuestions
    };
  }
  return null;
}

/**
 * Others 句是否值得出建议卡
 */
function shouldSuggestForOthers(text) {
  const gate = loadGate();
  if (gate.enabled === false) return false;
  if (!gate.othersOnlyQuestions) return true;
  return looksLikeQuestion(text, gate.questionCue);
}

function resetSuggestGateCache() {
  _gate = null;
}

/** D4：会中新数据线索（数字/品种/产区）→ 提示可沉淀 inbox */
function looksLikeNewFact(text) {
  const t = String(text || "");
  if (t.length < 8) return false;
  if (/\d+(\.\d+)?\s*(亩|公斤|kg|元|%|头\/丛|百丛)/i.test(t)) return true;
  if (/新品种|审定|示范|基地|订单|亩产|引种/.test(t)) return true;
  return false;
}

function ingestPromptForUtterance(text) {
  try {
    const cmds = JSON.parse(fs.readFileSync(schemaFile("meeting-commands.json"), "utf8"));
    if (cmds.promptIngestOnNewFact === false) return null;
  } catch (_) {}
  if (!looksLikeNewFact(text)) return null;
  return {
    kind: "ingest_prompt",
    tip: "检测到可沉淀信息，可一键记入复盘 inbox 待升格。",
    query: String(text).slice(0, 200)
  };
}

module.exports = {
  suggestSilent,
  shouldSuggestForOthers,
  loadGate,
  resetSuggestGateCache,
  looksLikeNewFact,
  ingestPromptForUtterance
};
