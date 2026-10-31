"use strict";

const assert = require("assert");
const {
  buildWiki2Index,
  retrieveWiki2,
  wiki2EvidenceFacts,
  ingestEpisode,
  reconcileClaims,
  buildWiki2Evidence
} = require("../lib/wiki2/index.cjs");
const {
  buildCopilotPacket,
  clearPrefetch,
  resetTriggerMode
} = require("../lib/copilot/index.cjs");

clearPrefetch?.();
resetTriggerMode?.();

const idx = buildWiki2Index();
assert.ok(idx.page_count >= 3, "golden pages");

const r = retrieveWiki2("双通道音频不要混轨 VAD", { topK: 3 });
assert.ok(r.evidence?.length >= 1, "fast read hits");
assert.ok(r.ms < 2000, `fast read ms=${r.ms}`);
assert.ok(/双通道|Others|Me|VAD|静音/i.test(r.preview || ""), "preview");

const facts = wiki2EvidenceFacts("Whisper 不要 native addon");
assert.ok(facts.facts.length >= 1, "evidence facts");

const pkt = buildCopilotPacket("双通道 ASR 和 VAD 门控方案怎么看？能不能再混成单轨？", {
  agenda: "Wave E",
  force: true
});
assert.ok(pkt.should_trigger, "copilot trigger");
assert.ok(
  (pkt.key_facts || []).some((f) => /双通道|VAD|否决|混|Snapshot|CLAIM|Others/i.test(f)) ||
    pkt.wiki_evidence,
  "wiki evidence wired into packet"
);

const ingested = ingestEpisode(
  {
    transcript:
      "会场: 我们决定弃用每 3 秒切窗\n会场: 继续禁止混轨，副驾驶旁路不要进 decideSpeak",
    agenda: "smoke-e",
    episodeId: "smoke_wave_e"
  },
  { dry: false }
);
assert.ok(ingested.ok && ingested.claim_count >= 1, "ingest");

const recon = reconcileClaims(ingested.extracted_claims.slice(0, 1), { dry: true });
assert.ok(recon.results?.[0]?.ok, "reconcile dry");

const ev = buildWiki2Evidence("副驾驶旁路");
assert.ok(ev.facts?.length >= 1, "evidence helper");

console.log(
  JSON.stringify(
    {
      ok: true,
      pages: idx.page_count,
      retrieveMs: r.ms,
      hitTitles: (r.evidence || []).map((e) => e.title),
      copilotFacts: (pkt.key_facts || []).slice(0, 3),
      ingestClaims: ingested.claim_count,
      wikiEvidenceMs: ev.ms
    },
    null,
    2
  )
);

resetTriggerMode?.();
