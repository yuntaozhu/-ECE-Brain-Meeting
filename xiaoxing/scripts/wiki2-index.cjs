"use strict";

/**
 * 重建 Wiki2 快读索引
 * node scripts/wiki2-index.cjs
 */
const { buildWiki2Index, wiki2IndexPath, clearWiki2Cache } = require("../lib/wiki2/index.cjs");

clearWiki2Cache();
const index = buildWiki2Index();
console.log(
  JSON.stringify(
    {
      ok: true,
      path: wiki2IndexPath(),
      page_count: index.page_count,
      built_at: index.built_at,
      links: (index.links || []).length
    },
    null,
    2
  )
);
