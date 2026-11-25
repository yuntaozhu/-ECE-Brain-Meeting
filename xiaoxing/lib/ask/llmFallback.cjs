/**
 * 库缺口 → 方舟 LLM 参考答复（带弱证据 + 边界）
 */
"use strict";

const fs = require("fs");
const { schemaFile } = require("../knowledge/paths.cjs");
const { listConceptPages } = require("../knowledge/wiki.cjs");
const { llmChat } = require("../llm/chat.cjs");
const { hasLlmKey, llmStatus } = require("../llm/resolve.cjs");

let _cfg;

function loadLlmAskCfg() {
  if (_cfg) return _cfg;
  try {
    _cfg = JSON.parse(fs.readFileSync(schemaFile("llm-ask.json"), "utf8"));
  } catch (_) {
    _cfg = { enabled: true, onGap: true, onMarketMiss: false };
  }
  return _cfg;
}

function clearLlmAskCfgCache() {
  _cfg = null;
}

function envEnabled() {
  const v = String(process.env.XIAOXING_LLM_ON_GAP || "").trim().toLowerCase();
  if (v === "0" || v === "false" || v === "off") return false;
  if (v === "1" || v === "true" || v === "on") return true;
  return null;
}

function llmAskEnabled(kind = "gap") {
  const cfg = loadLlmAskCfg();
  const env = envEnabled();
  if (env === false) return false;
  if (cfg.enabled === false && env !== true) return false;
  if (kind === "market_miss") return Boolean(cfg.onMarketMiss);
  return cfg.onGap !== false;
}

function buildEvidence(candidates = [], limit) {
  const cfg = loadLlmAskCfg();
  const topN = Number(limit) || cfg.topEvidence || 3;
  const maxChars = Number(cfg.maxEvidenceChars) || 1800;
  const pages = listConceptPages();
  const bySlug = Object.fromEntries(pages.map((p) => [p.slug, p]));
  const chunks = [];
  let used = 0;
  for (const c of candidates.slice(0, topN)) {
    const p = bySlug[c.slug];
    if (!p) continue;
    const speak = String(p.speak || "").trim();
    const facts = String(p.facts || "").trim().slice(0, 400);
    const block = `【${p.title || c.slug}】\n口播：${speak}\n要点：${facts}`.trim();
    if (!block || used + block.length > maxChars) continue;
    chunks.push(block);
    used += block.length;
  }
  return chunks.join("\n\n");
}

function systemPrompt(evidence) {
  const cfg = loadLlmAskCfg();
  const rules = (cfg.systemRules || []).join("\n");
  const ev = evidence
    ? `库内摘录（可能不完整，仅供参考）：\n${evidence}`
    : "库内摘录：暂无高相关词条。请谨慎作答，不足处明确说明需对照正式规程或记待补库。";
  return `${rules}\n\n${ev}`;
}

/**
 * @param {string} query
 * @param {{ candidates?: Array<{slug:string,score?:number}>, chatFn?: Function }} [opts]
 */
async function tryLlmGapAnswer(query, opts = {}) {
  const q = String(query || "").trim();
  if (!q) return { ok: false, error: "empty" };
  if (!llmAskEnabled("gap")) return { ok: false, error: "disabled" };
  if (!hasLlmKey() && typeof opts.chatFn !== "function") {
    return { ok: false, error: "no_api_key", status: llmStatus() };
  }

  const cfg = loadLlmAskCfg();
  const evidence = buildEvidence(opts.candidates || []);
  const system = systemPrompt(evidence);
  const user = `用户问题：${q}\n请用中文直接回答。`;

  const chat = typeof opts.chatFn === "function" ? opts.chatFn : llmChat;
  const res = await chat(system, user, {
    temperature: cfg.temperature,
    maxTokens: cfg.maxTokens,
    timeoutMs: cfg.timeoutMs,
    disableThinking: true
  });

  if (!res?.ok || !res.content) {
    return { ok: false, error: res?.error || "llm_fail", raw: res };
  }

  let reply = String(res.content).trim();
  const disc = String(cfg.disclaimer || "").trim();
  if (disc && !reply.includes("审定库") && !reply.includes("参考答复")) {
    reply = `${reply}${reply.endsWith("。") || reply.endsWith("！") || reply.endsWith("？") ? "" : "。"}${disc}`;
  }

  return {
    ok: true,
    layer: "llm",
    reply,
    score: 40,
    sources: [
      `llm:${res.provider || "doubao"}`,
      res.model || "model",
      ...(opts.candidates || []).slice(0, 2).map((c) => `wiki/concepts/${c.slug}.md`)
    ].filter(Boolean),
    reason: evidence ? "llm_with_evidence" : "llm_open",
    llm: {
      provider: res.provider,
      model: res.model,
      evidenceChars: evidence.length
    },
    candidates: opts.candidates || []
  };
}

module.exports = {
  loadLlmAskCfg,
  clearLlmAskCfgCache,
  llmAskEnabled,
  tryLlmGapAnswer,
  buildEvidence
};
