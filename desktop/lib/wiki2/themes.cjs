"use strict";

/**
 * 轻量主题合成：基于 Wiki2 链接共现（无 Leiden/Neo4j）。
 * 找出高频共现实体簇，写出 wiki/themes/*.md 草稿。
 */
const fs = require("fs");
const path = require("path");
const { loadOrBuildIndex, buildWiki2Index } = require("./buildIndex.cjs");
const { themesDir, ensureWiki2Dirs } = require("./paths.cjs");

function pairKey(a, b) {
  return a < b ? `${a}||${b}` : `${b}||${a}`;
}

/**
 * @param {{ minPair?: number, dry?: boolean }} [opts]
 */
function synthesizeThemes(opts = {}) {
  ensureWiki2Dirs();
  const index = loadOrBuildIndex();
  const pages = index.pages || [];
  const byId = Object.fromEntries(pages.map((p) => [p.id, p]));
  const pairCount = {};
  const nodeDegree = {};

  for (const p of pages) {
    const neighbors = [];
    for (const link of p.links_to || []) {
      const hit = pages.find(
        (x) => x.slug === link || x.id === link || (x.aliases || []).some((a) => String(a).toLowerCase() === link)
      );
      if (hit && hit.id !== p.id) neighbors.push(hit.id);
    }
    for (const bid of index.backlinks?.[p.id] || []) {
      if (bid !== p.id) neighbors.push(bid);
    }
    const uniq = [...new Set(neighbors)];
    nodeDegree[p.id] = (nodeDegree[p.id] || 0) + uniq.length;
    for (let i = 0; i < uniq.length; i++) {
      for (let j = i + 1; j < uniq.length; j++) {
        const k = pairKey(uniq[i], uniq[j]);
        pairCount[k] = (pairCount[k] || 0) + 1;
      }
    }
    // 页内自环：与自身 aliases 主题弱共现——改用「同页 claims + links」作为团
    if (uniq.length >= 1) {
      for (const n of uniq) {
        const k = pairKey(p.id, n);
        pairCount[k] = (pairCount[k] || 0) + 1;
      }
    }
  }

  const minPair = Number(opts.minPair) || 1;
  const edges = Object.entries(pairCount)
    .filter(([, c]) => c >= minPair)
    .sort((a, b) => b[1] - a[1]);

  // 贪心成簇：取最高边扩展
  const used = new Set();
  const clusters = [];
  for (const [k, w] of edges) {
    const [a, b] = k.split("||");
    if (used.has(a) && used.has(b)) continue;
    const cluster = new Set([a, b]);
    for (const [k2, w2] of edges) {
      if (w2 < minPair) continue;
      const [x, y] = k2.split("||");
      if (cluster.has(x) || cluster.has(y)) {
        cluster.add(x);
        cluster.add(y);
      }
      if (cluster.size >= 5) break;
    }
    const ids = [...cluster].filter((id) => byId[id] && !used.has(id));
    if (ids.length < 2) continue;
    ids.forEach((id) => used.add(id));
    clusters.push({ ids, weight: w });
    if (clusters.length >= 5) break;
  }

  const themes = clusters.map((c, i) => {
    const titles = c.ids.map((id) => byId[id]?.title || id);
    const slug = `theme_${c.ids
      .map((id) => String(id).replace(/^(dec|ent|theme)_/, ""))
      .slice(0, 2)
      .join("_")
      .replace(/[^\w\-]+/g, "_")
      .slice(0, 40)}`;
    const links = c.ids.map((id) => `[[${id}]]`);
    const snapshot = `跨页高频共现主题：${titles.slice(0, 3).join(" · ")}（权重 ${c.weight}）。`;
    const md = [
      `---`,
      `id: ${slug}`,
      `title: 主题洞察 · ${titles[0] || slug}`,
      `type: theme`,
      `status: draft`,
      `confidence: 0.6`,
      `last_updated: ${new Date().toISOString()}`,
      `aliases: ${JSON.stringify(titles.slice(0, 4))}`,
      `links_to: ${JSON.stringify(links)}`,
      `---`,
      ``,
      `## [1] AI-First Snapshot (会中实时注入区 - 严控 100 字内)`,
      `- **当前生效结论**：${snapshot}`,
      `- **核心红线**：主题页为自动草稿，须人工确认后再升为 active。`,
      ``,
      `## [2] Active Claims (当前有效事实)`,
      `- **[CLAIM-01]** 图共现检测到以下页面反复关联：${titles.join("、")}。`,
      `  - \`valid_from\`: ${new Date().toISOString().slice(0, 10)} | \`invalid_at\`: null | \`confidence\`: 0.6`,
      `  - \`source\`: [[wiki2/theme-synthesis]]`,
      ``,
      `## [3] Superseded & Failure Paths (已淘汰方案 - 严禁直接删除)`,
      `- （暂无）`,
      ``,
      `## Action Items`,
      `- [ ] 确认是否立项专项决策页`,
      `- [ ] 核对 Active Claims 是否与会中结论一致`
    ].join("\n");

    const file = path.join(themesDir(), `${slug}.md`);
    if (!opts.dry) {
      fs.writeFileSync(file, md, "utf8");
    }
    return {
      slug,
      title: titles[0],
      members: c.ids,
      titles,
      weight: c.weight,
      path: opts.dry ? null : file,
      markdown: md
    };
  });

  if (!opts.dry && themes.length) {
    try {
      buildWiki2Index();
    } catch (_) {}
  }

  return {
    ok: true,
    dry: Boolean(opts.dry),
    cluster_count: themes.length,
    themes,
    edge_count: edges.length
  };
}

module.exports = {
  synthesizeThemes,
  pairKey
};
