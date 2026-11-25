#!/usr/bin/env node
/**
 * 按 schema/crawl-sources.json 用 Firecrawl 抓公开页
 * bucket=xunbao → knowledge/raw/xunbao/snapshots/；默认 → raw/firecrawl/
 */
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const fs = require("fs");
const path = require("path");
const { scrapeUrl } = require("../lib/firecrawl/client.cjs");
const { schemaFile, rawBucketDir, ensureDir } = require("../lib/knowledge/paths.cjs");

const dry = process.argv.includes("--dry");
const onlyRaw = process.argv.find((a) => a.startsWith("--only="))?.slice(7);
const bucketFilter = process.argv.find((a) => a.startsWith("--bucket="))?.slice(9);
const onlyIds = onlyRaw
  ? onlyRaw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
  : null;

async function main() {
  const cfg = JSON.parse(fs.readFileSync(schemaFile("crawl-sources.json"), "utf8"));
  let sources = cfg.sources || [];
  if (onlyIds?.length) sources = sources.filter((s) => onlyIds.includes(s.id));
  if (bucketFilter) sources = sources.filter((s) => (s.bucket || "firecrawl") === bucketFilter);

  const manifest = [];
  for (const src of sources) {
    const bucket = src.bucket || "firecrawl";
    const outDir = ensureDir(rawBucketDir(bucket));
    console.log(`[crawl] ${src.id} (${bucket}) ${src.url}`);
    if (dry) {
      manifest.push({ id: src.id, url: src.url, bucket, dry: true });
      continue;
    }
    try {
      const data = await scrapeUrl(src.url, {
        skipTlsVerification: src.skipTlsVerification === true
      });
      const md = data?.data?.markdown || data?.markdown || "";
      const meta = data?.data?.metadata || data?.metadata || {};
      const stamp = new Date().toISOString().replace(/[:.]/g, "-");
      const base = `${src.id}_${stamp}`;
      const mdPath = path.join(outDir, `${base}.md`);
      const metaPath = path.join(outDir, `${base}.meta.json`);
      const header = [
        `# RAW · ${src.title}`,
        "",
        `source_id: ${src.id}`,
        `url: ${src.url}`,
        `fetched_at: ${new Date().toISOString()}`,
        `tags: ${(src.tags || []).join(", ")}`,
        src.district ? `district: ${src.district}` : null,
        src.valid_until ? `valid_until: ${src.valid_until}` : null,
        "",
        "---",
        "",
        md || "_（无 markdown 正文）_"
      ]
        .filter((x) => x !== null)
        .join("\n");
      fs.writeFileSync(mdPath, header, "utf8");
      fs.writeFileSync(
        metaPath,
        JSON.stringify(
          {
            id: src.id,
            title: src.title,
            url: src.url,
            tags: src.tags || [],
            bucket,
            district: src.district || null,
            validUntil: src.valid_until || null,
            fetchedAt: new Date().toISOString(),
            metadata: meta,
            ok: true,
            chars: md.length
          },
          null,
          2
        ),
        "utf8"
      );
      console.log(`  -> ${bucket}/${path.basename(mdPath)} (${md.length} chars)`);
      manifest.push({ id: src.id, bucket, file: path.basename(mdPath), chars: md.length, ok: true });
    } catch (err) {
      console.error(`  !! [${err.code || "error"}] ${err.message}`);
      if (err.hint) console.error(`     hint: ${err.hint}`);
      const stamp = new Date().toISOString().replace(/[:.]/g, "-");
      const failMeta = path.join(outDir, `${src.id}_${stamp}.fail.json`);
      try {
        fs.writeFileSync(
          failMeta,
          JSON.stringify(
            {
              id: src.id,
              title: src.title,
              url: src.url,
              bucket,
              ok: false,
              code: err.code || "error",
              hint: err.hint || null,
              status: err.status || null,
              error: String(err.message || err),
              fetchedAt: new Date().toISOString()
            },
            null,
            2
          ),
          "utf8"
        );
      } catch (_) {}
      manifest.push({
        id: src.id,
        bucket,
        ok: false,
        code: err.code || "error",
        hint: err.hint || null,
        error: String(err.message || err)
      });
    }
  }

  const manDir = ensureDir(rawBucketDir(bucketFilter || "firecrawl"));
  if (!dry) fs.writeFileSync(path.join(manDir, `manifest_${Date.now()}.json`), JSON.stringify(manifest, null, 2), "utf8");
  console.log(JSON.stringify(manifest, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
