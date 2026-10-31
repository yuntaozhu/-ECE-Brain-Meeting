"use strict";

/**
 * 用法：
 *   node scripts/wiki2-ingest.cjs --dry --transcript "会场: 我们决定弃用 3 秒切窗"
 *   node scripts/wiki2-ingest.cjs --apply  （合入 extracted claims，慎用）
 */
const fs = require("fs");
const {
  ingestEpisode,
  ingestEpisodeAuto,
  reconcileClaims
} = require("../lib/wiki2/index.cjs");

function arg(name, fallback = "") {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
}

async function main() {
  const dry = process.argv.includes("--dry") || !process.argv.includes("--apply");
  const useLlm = process.argv.includes("--llm");
  const transcript =
    arg("transcript") ||
    (arg("file") && fs.existsSync(arg("file"))
      ? fs.readFileSync(arg("file"), "utf8")
      : "") ||
    [
      "会场: 我们讨论双通道 ASR，不要再混轨",
      "会场: 决定弃用每 3 秒切窗直传 Whisper，改用 VAD 门控",
      "会场: 副驾驶继续走旁路，禁止改 decideSpeak"
    ].join("\n");

  const input = {
    transcript,
    agenda: arg("agenda", "Wave F wiki2"),
    episodeId: arg("id") || undefined
  };

  const ingested = useLlm
    ? await ingestEpisodeAuto(input, { dry: false, forceLlm: true })
    : { ...ingestEpisode(input, { dry: false }), mode: "rule", llm: false };

  let recon = null;
  if (!dry && ingested.ok && ingested.extracted_claims?.length) {
    recon = reconcileClaims(ingested.extracted_claims, { dry: false });
  } else {
    recon = reconcileClaims(ingested.extracted_claims || [], { dry: true });
  }

  console.log(
    JSON.stringify(
      {
        ok: ingested.ok,
        dry,
        mode: ingested.mode,
        llm: ingested.llm,
        episode: ingested.episode_id,
        path: ingested.path,
        chunks: ingested.chunk_count,
        claims: ingested.claim_count,
        extracted: ingested.extracted_claims,
        reconcile: recon,
        llm_error: ingested.llm_error || null
      },
      null,
      2
    )
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
