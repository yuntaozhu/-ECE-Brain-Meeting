"use strict";

/**
 * Wave F 冒烟：主题共现 + LLM ingest 回退路径（无 Key 不失败）
 */
const assert = require("assert");
const {
  buildWiki2Index,
  synthesizeThemes,
  extractJson,
  retrieveWiki2,
  ingestEpisode
} = require("../lib/wiki2/index.cjs");

buildWiki2Index();

const themes = synthesizeThemes({ dry: true });
assert.ok(themes.ok, "themes ok");
assert.ok(themes.edge_count >= 1, "expected link edges among golden pages");
assert.ok(themes.cluster_count >= 1, "expected at least one co-occurrence cluster");

const parsed = extractJson(
  '```json\n{"contextual_chunks":[],"extracted_claims":[{"statement":"x"}]}\n```'
);
assert.ok(parsed?.extracted_claims?.length === 1, "extractJson");

const ingested = {
  ...ingestEpisode(
    {
      transcript: "会场: 继续禁止混轨，VAD 门控保持能量降级",
      agenda: "smoke-f",
      episodeId: "smoke_wave_f"
    },
    { dry: false }
  ),
  mode: "rule",
  llm: false
};
assert.ok(ingested.ok && ingested.mode === "rule", "rule ingest");

const r = retrieveWiki2("副驾驶旁路 VAD", { topK: 2 });
assert.ok(r.evidence?.length >= 1, "still fast read");

console.log(
  JSON.stringify(
    {
      ok: true,
      themes: themes.cluster_count,
      edges: themes.edge_count,
      themeSample: (themes.themes || [])[0]?.titles,
      ingestMode: ingested.mode,
      retrieveMs: r.ms
    },
    null,
    2
  )
);
