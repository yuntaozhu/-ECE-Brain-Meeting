/** 语义检索 */
const { debugLog } = require("../../platform/debugLog.cjs");
const { retrieveKnowledge, extractFaqSpeakText } = require("../corpus.cjs");
const { queryWiki, getPageBySlug } = require("../wiki");
const state = require("./state.cjs");
const {
  EMBED_URL,
  apiKey,
  embeddingModel,
  indexReadFile,
  fileMtimeKey,
  useMultimodal
} = require("./paths.cjs");
const { cosine, titleOverlapBoost } = require("./chunks.cjs");
const { embedOneText, embedTexts } = require("./embed.cjs");
const { ensureIndex, loadIndexFromDisk } = require("./store.cjs");

function buildWikiAwarePreview(hits) {
  return hits
    .map((h, i) => {
      if (h.source === "wiki" || h.slug) {
        const page = h.slug ? getPageBySlug(h.slug) : null;
        const speak = h.speak || page?.speak || "";
        const facts = page?.facts || "";
        const bounds = page?.bounds || "";
        return (
          `【词条${i + 1}·${h.title || page?.title || h.slug}】\n` +
          `口播：${speak}\n` +
          `事实：${facts.slice(0, 520)}\n` +
          `边界：${bounds.slice(0, 280)}`
        );
      }
      const tag = h.source === "faq" ? "FAQ" : "资料";
      const body = h.body || h.snippet || "";
      return `【${tag}${i + 1}·${h.title}】\n${String(body).slice(0, 700)}`;
    })
    .join("\n\n")
    .slice(0, 3600);
}

/**
 * 语义检索；优先 Wiki 整页，失败降级关键词。
 * @param {string} query
 * @param {number} [topK]
 * @param {{ signal?: AbortSignal, preferBiz?: boolean, waitIndex?: boolean }} [opts]
 */
async function retrieveSemantic(query, topK = 4, opts = {}) {
  const q = String(query || "").trim();
  if (!q) return { hits: [], preview: "", fromFaq: false, mode: "empty" };

  // 1) 同步 Wiki Query（整页，零延迟）
  const wiki = queryWiki(q, Math.min(3, topK));
  const wikiStrong = (wiki.hits || []).filter((h) => (h.score || 0) >= 5);

  if (state.embedUnavailable) {
    if (wikiStrong.length) {
      return {
        hits: wikiStrong.map((h) => ({
          title: h.title,
          slug: h.slug,
          score: h.score,
          snippet: h.speak || h.snippet || "",
          speak: h.speak,
          source: "wiki"
        })),
        preview: wiki.preview,
        fromFaq: false,
        instantAnswer: wiki.speakHint || "",
        mode: "wiki",
        embedUnavailable: true,
        embedFailReason: state.embedFailReason
      };
    }
    const fb = retrieveKnowledge(q, topK);
    return {
      ...fb,
      mode: "keyword-fallback",
      embedUnavailable: true,
      embedFailReason: state.embedFailReason
    };
  }

  // 优先同步读本地预建索引，避免每次提问触发「开始构建索引」
  let index =
    state.memIndex && state.memIndex.model === embeddingModel() && state.memIndex.endpoint === EMBED_URL
      ? state.memIndex
      : null;
  if (!index) {
    warmIndexFromDisk();
    index =
      state.memIndex && state.memIndex.model === embeddingModel() && state.memIndex.endpoint === EMBED_URL
        ? state.memIndex
        : null;
  }
  if (!index) {
    if (!state.buildPromise && !state.embedUnavailable) {
      ensureIndex({ signal: opts.signal }).catch(() => {});
    }
    if (opts.waitIndex === true && state.buildPromise) {
      index = await ensureIndex({ signal: opts.signal });
    }
  }

  // Wiki 强命中且索引未就绪：直接用整页
  if (!index?.chunks?.length) {
    if (wikiStrong.length) {
      return {
        hits: wikiStrong.map((h) => ({
          title: h.title,
          slug: h.slug,
          score: h.score,
          snippet: h.speak || h.snippet || "",
          speak: h.speak,
          source: "wiki"
        })),
        preview: wiki.preview,
        fromFaq: false,
        instantAnswer: wiki.speakHint || "",
        mode: "wiki",
        indexing: Boolean(state.buildPromise)
      };
    }
    const fb = retrieveKnowledge(q, topK);
    return {
      ...fb,
      mode: "keyword-fallback",
      indexing: Boolean(state.buildPromise),
      embedUnavailable: state.embedUnavailable,
      embedFailReason: state.embedFailReason
    };
  }

  const qVecs = await embedTexts([q.slice(0, 1200)], { signal: opts.signal, concurrency: 1 });
  const qVec = qVecs?.[0];
  if (!qVec?.length) {
    if (wikiStrong.length) {
      return {
        hits: wikiStrong.map((h) => ({
          title: h.title,
          slug: h.slug,
          score: h.score,
          snippet: h.speak || h.snippet || "",
          speak: h.speak,
          source: "wiki"
        })),
        preview: wiki.preview,
        fromFaq: false,
        instantAnswer: wiki.speakHint || "",
        mode: "wiki"
      };
    }
    const fb = retrieveKnowledge(q, topK);
    return { ...fb, mode: "keyword-fallback" };
  }

  let scored = index.chunks.map((c) => {
    let score = cosine(qVec, c.vec);
    if (c.source === "wiki") score += 0.05;
    if (
      opts.preferBiz &&
      require("../schemaStore.cjs").rx("faq", "preferBiz").test(
        c.title + c.body.slice(0, 120)
      )
    ) {
      score += 0.03;
    }
    score += titleOverlapBoost(q, c.title);
    return { ...c, score };
  });
  scored.sort((a, b) => b.score - a.score);
  scored = scored.slice(0, Math.max(1, topK + 2));

  // 合并：Wiki 关键词命中置顶，语义补缺（按 slug/title 去重）
  const merged = [];
  const seen = new Set();
  for (const h of wiki.hits || []) {
    const key = h.slug || h.title;
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push({
      title: h.title,
      slug: h.slug,
      score: 0.9 + Math.min(0.1, (h.score || 0) / 100),
      snippet: h.speak || h.snippet || "",
      speak: h.speak,
      source: "wiki",
      body: h.body
    });
  }
  for (const c of scored) {
    const key = c.slug || c.title;
    if (seen.has(key)) continue;
    seen.add(key);
    const page = c.slug ? getPageBySlug(c.slug) : null;
    merged.push({
      title: c.title,
      slug: c.slug,
      score: c.score,
      snippet: c.speak || page?.speak || c.body.slice(0, 400),
      speak: c.speak || page?.speak || "",
      source: c.source,
      body: c.source === "wiki" && page ? page.body : c.body
    });
    if (merged.length >= topK) break;
  }
  const finalHits = merged.slice(0, Math.max(1, topK));

  const fromFaq = finalHits.some((h) => h.source === "faq");
  const preview = buildWikiAwarePreview(finalHits);

  const top = finalHits[0];
  let instantAnswer = "";
  if (top?.source === "wiki" && top.speak && (top.score || 0) >= 0.85) {
    instantAnswer = String(top.speak);
  } else if (top?.source === "faq" && (top.score || 0) >= 0.72) {
    instantAnswer = extractFaqSpeakText(top.body || top.snippet || "");
  } else if (wikiStrong[0]?.speak && wikiStrong[0].score >= 8) {
    instantAnswer = String(wikiStrong[0].speak);
  }

  return {
    hits: finalHits.map((h) => ({
      title: h.title,
      slug: h.slug,
      score: Math.round((h.score || 0) * 1000) / 1000,
      snippet: String(h.snippet || "").slice(0, 400),
      speak: h.speak || "",
      source: h.source
    })),
    preview,
    fromFaq,
    instantAnswer,
    mode: wikiStrong.length ? "wiki+semantic" : "semantic"
  };
}

function semanticStatus() {
  return {
    indexReady: Boolean(state.memIndex?.chunks?.length),
    chunks: state.memIndex?.chunks?.length || 0,
    model: embeddingModel(),
    endpoint: EMBED_URL,
    multimodal: useMultimodal(),
    embedUnavailable: state.embedUnavailable,
    embedFailReason: state.embedFailReason,
    indexPath: indexReadFile()
  };
}

/** 仅从磁盘加载索引（听会启动预热，不触发在线重建） */
function warmIndexFromDisk() {
  const mtimeKey = fileMtimeKey();
  const model = embeddingModel();
  if (
    state.memIndex &&
    state.memIndex.mtimeKey === mtimeKey &&
    state.memIndex.model === model &&
    state.memIndex.endpoint === EMBED_URL
  ) {
    return { ok: true, source: "memory", chunks: state.memIndex.chunks.length };
  }
  const disk = loadIndexFromDisk(mtimeKey, model);
  if (disk) {
    state.memIndex = disk;
    debugLog.info("SemanticRag", "已从本地加载索引", {
      chunks: disk.chunks.length,
      model,
      builtAt: disk.builtAt
    });
    return { ok: true, source: "disk", chunks: disk.chunks.length };
  }
  debugLog.info("SemanticRag", "本地无可用索引（请先 npm run rag:index）", {
    model,
    indexPath: indexReadFile()
  });
  return { ok: false, source: "none", chunks: 0 };
}

/** 测试用：重置短路状态 */
function resetEmbedGate() {
  state.embedUnavailable = false;
  state.embedFailReason = "";
}

module.exports = {
  buildWikiAwarePreview,
  retrieveSemantic,
  semanticStatus,
  warmIndexFromDisk,
  resetEmbedGate
};
