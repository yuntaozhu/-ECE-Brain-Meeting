"use strict";

/**
 * 豆包编译 Ingest（V3 §6.2）：失败则回退规则版。
 */
const { llmChat } = require("../meetingStrategy/llm/transport.cjs");
const { ingestEpisode } = require("./ingest.cjs");
const { loadOrBuildIndex } = require("./buildIndex.cjs");

const SYSTEM = `你是 Karpathy Wiki 2.0 知识库编译引擎。将会议转写编译为 JSON：
1) contextual_chunks：每段含 speaker、context_prefix（消解代词，≤50字）、raw_text、linked_entities（[[slug]]）
2) extracted_claims：原子决策/事实，含 target_wiki_page、claim_type、statement、replaces_or_contradicts_topic、reason_for_change、valid_from、confidence、source_citation
只输出 JSON，不要 markdown 围栏。`;

function existingEntitySlugs() {
  try {
    const idx = loadOrBuildIndex();
    return (idx.pages || []).map((p) => p.id || p.slug).filter(Boolean).slice(0, 40);
  } catch (_) {
    return [];
  }
}

function extractJson(text) {
  const s = String(text || "").trim();
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = fence ? fence[1].trim() : s;
  const start = body.indexOf("{");
  const end = body.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(body.slice(start, end + 1));
  } catch (_) {
    return null;
  }
}

/**
 * @param {{ transcript: string, episodeId?: string, agenda?: string, participants?: string[] }} input
 * @param {{ dry?: boolean, forceLlm?: boolean, timeoutMs?: number, signal?: AbortSignal }} [opts]
 */
async function ingestEpisodeLlm(input, opts = {}) {
  const rule = ingestEpisode(input, { dry: true });
  if (!rule.ok) return rule;

  const useLlm =
    opts.forceLlm === true ||
    process.env.WIKI2_INGEST_LLM === "1" ||
    process.env.WIKI2_INGEST_LLM === "auto";

  if (!useLlm && opts.forceLlm !== true) {
    return { ...ingestEpisode(input, { dry: opts.dry }), mode: "rule", llm: false };
  }

  const slugs = existingEntitySlugs();
  const user = [
    `episode_id: ${rule.episode_id}`,
    `timestamp: ${new Date().toISOString()}`,
    `agenda: ${input.agenda || ""}`,
    `participants: ${(input.participants || []).join(", ")}`,
    `existing_entities: ${slugs.join(", ")}`,
    `transcript:`,
    String(input.transcript || "").slice(0, 6000)
  ].join("\n");

  let llmRes;
  try {
    llmRes = await llmChat(SYSTEM, user, {
      temperature: 0.2,
      maxTokens: 2400,
      timeoutMs: opts.timeoutMs || 45000,
      signal: opts.signal
    });
  } catch (err) {
    const fallback = ingestEpisode(input, { dry: opts.dry });
    return {
      ...fallback,
      mode: "rule_fallback",
      llm: false,
      llm_error: String(err?.message || err)
    };
  }

  if (!llmRes?.ok || !llmRes.content) {
    const fallback = ingestEpisode(input, { dry: opts.dry });
    return {
      ...fallback,
      mode: "rule_fallback",
      llm: false,
      llm_error: llmRes?.error || "empty"
    };
  }

  const parsed = extractJson(llmRes.content);
  if (!parsed || (!parsed.contextual_chunks && !parsed.extracted_claims)) {
    const fallback = ingestEpisode(input, { dry: opts.dry });
    return {
      ...fallback,
      mode: "rule_fallback",
      llm: false,
      llm_error: "parse_failed",
      llm_preview: String(llmRes.content).slice(0, 200)
    };
  }

  const merged = {
    ...rule,
    contextual_chunks: Array.isArray(parsed.contextual_chunks)
      ? parsed.contextual_chunks
      : rule.contextual_chunks,
    extracted_claims: Array.isArray(parsed.extracted_claims)
      ? parsed.extracted_claims
      : rule.extracted_claims,
    chunk_count: 0,
    claim_count: 0,
    mode: "llm",
    llm: true
  };
  merged.chunk_count = merged.contextual_chunks.length;
  merged.claim_count = merged.extracted_claims.length;

  // 落盘：复用规则版写文件结构
  const written = ingestEpisode(
    {
      ...input,
      episodeId: rule.episode_id,
      // 把 LLM chunks 压回伪转写，保证文件存在；claims 单独覆盖
      transcript: input.transcript
    },
    { dry: opts.dry }
  );

  return {
    ...written,
    contextual_chunks: merged.contextual_chunks,
    extracted_claims: merged.extracted_claims,
    chunk_count: merged.chunk_count,
    claim_count: merged.claim_count,
    mode: "llm",
    llm: true
  };
}

/**
 * auto：有 Key 且 WIKI2_INGEST_LLM!=0 时尝试 LLM，否则规则。
 */
async function ingestEpisodeAuto(input, opts = {}) {
  if (process.env.WIKI2_INGEST_LLM === "0") {
    return { ...ingestEpisode(input, { dry: opts.dry }), mode: "rule", llm: false };
  }
  if (process.env.WIKI2_INGEST_LLM === "1" || opts.forceLlm) {
    return ingestEpisodeLlm(input, { ...opts, forceLlm: true });
  }
  // auto：先规则；若环境像有 key 再试 LLM（失败回退）
  try {
    const { resolveLlmConfig } = require("../meetingStrategy/llm/providers/resolve.cjs");
    const cfg = resolveLlmConfig();
    if (cfg?.ok && cfg.apiKey) {
      return ingestEpisodeLlm(input, { ...opts, forceLlm: true });
    }
  } catch (_) {}
  return { ...ingestEpisode(input, { dry: opts.dry }), mode: "rule", llm: false };
}

module.exports = {
  ingestEpisodeLlm,
  ingestEpisodeAuto,
  extractJson,
  SYSTEM
};
