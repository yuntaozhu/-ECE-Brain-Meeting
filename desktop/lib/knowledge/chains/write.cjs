/**
 * Persist continuous chains under knowledge/chains.
 */
const fs = require("fs");
const path = require("path");
const { byCardDir, readableDir, indexPath, tuneSamplePath, chainsWriteDir } = require("./paths.cjs");
const { distillCfg, fillTpl } = require("./schema.cjs");

function ensureDirs() {
  for (const d of [chainsWriteDir(), byCardDir(), readableDir()]) {
    if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
  }
}

function slugOf(cardId, titles) {
  const id = String(cardId || "card").replace(/[^\w-]+/g, "_");
  const head = String((titles && titles[0]) || "")
    .replace(/[\\/:*?"<>|]+/g, "")
    .slice(0, 24);
  return head ? `${id}-${head}` : id;
}

function toReadable(chain) {
  const cfg = distillCfg();
  const seed = (chain.seedTitles || []).join(" / ");
  const lines = [];
  lines.push(`# ${fillTpl(cfg.readableTitleTpl || "{seed}", { seed })}`);
  lines.push("");
  lines.push(`- cardId: \`${chain.cardId}\``);
  lines.push(`- source: ${chain.source}`);
  lines.push(`- ready: ${chain.ready ? "yes" : "no"}`);
  lines.push("");
  lines.push("## Seed");
  lines.push("");
  lines.push(`Q: ${seed}`);
  lines.push(`A: ${chain.seedAnswer || ""}`);
  lines.push("");
  lines.push("## Steps");
  lines.push("");
  const gapLine = String(cfg.gapLine || "");
  (chain.steps || []).forEach((step, i) => {
    lines.push(`### ${i + 1}. ${step.ask}`);
    lines.push("");
    if (step.gap || !step.answer) lines.push(gapLine || "(gap)");
    else lines.push(step.answer);
    if (step.cite) lines.push(`\n> cite: ${step.cite}`);
    if (step.roundtrip) {
      lines.push(
        `\n_roundtrip align=${step.roundtrip.align} via ${step.roundtrip.reason}_`
      );
    }
    lines.push("");
  });
  return lines.join("\n");
}

function writeChain(chain, opts = {}) {
  ensureDirs();
  const dry = Boolean(opts.dry);
  const slug = slugOf(chain.cardId, chain.seedTitles);
  const jsonName = `${slug}.json`;
  const mdName = `${slug}.md`;
  const jsonPath = path.join(byCardDir(), jsonName);
  const mdPath = path.join(readableDir(), mdName);
  const payload = {
    version: 1,
    kind: "followup-chain",
    ...chain,
    writtenAt: new Date().toISOString()
  };
  if (!dry) {
    fs.writeFileSync(jsonPath, JSON.stringify(payload, null, 2), "utf8");
    fs.writeFileSync(mdPath, toReadable(chain), "utf8");
    for (const row of chain.tuneSamples || []) {
      fs.appendFileSync(
        tuneSamplePath(),
        JSON.stringify({
          cardId: chain.cardId,
          ask: row.ask,
          answer: row.answer,
          roundtrip: row.roundtrip,
          supportAlign: row.supportAlign,
          ts: new Date().toISOString()
        }) + "\n",
        "utf8"
      );
    }
  }
  return { jsonPath, mdPath, slug, dry };
}

function writeIndex(entries, meta = {}) {
  ensureDirs();
  const dry = Boolean(meta.dry);
  const index = {
    version: 1,
    kind: "followup-chain-index",
    writtenAt: new Date().toISOString(),
    count: entries.length,
    readyCount: entries.filter((e) => e.ready).length,
    sourceMode: meta.sourceMode || "",
    cards: entries.map((e) => ({
      cardId: e.cardId,
      seed: (e.seedTitles || [])[0] || "",
      steps: (e.steps || []).length,
      ready: Boolean(e.ready),
      source: e.source,
      slug: e.slug
    }))
  };
  if (!dry) fs.writeFileSync(indexPath(), JSON.stringify(index, null, 2), "utf8");
  return index;
}

function writeMergedReadable(chains, opts = {}) {
  ensureDirs();
  const dry = Boolean(opts.dry);
  const file = path.join(chainsWriteDir(), "faq-chains.md");
  const parts = ["# Continuous follow-up chains", ""];
  for (const chain of chains || []) {
    parts.push(toReadable(chain));
    parts.push("\n---\n");
  }
  if (!dry) fs.writeFileSync(file, parts.join("\n"), "utf8");
  return file;
}

module.exports = {
  ensureDirs,
  writeChain,
  writeIndex,
  writeMergedReadable,
  toReadable,
  slugOf
};
