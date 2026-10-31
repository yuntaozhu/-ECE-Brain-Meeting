"use strict";
const { buildWiki2Index } = require("../lib/wiki2/index.cjs");
const idx = buildWiki2Index();
console.log(
  JSON.stringify(
    {
      ok: true,
      pages: idx.page_count,
      built_at: idx.built_at,
      sample: (idx.pages || []).slice(0, 3).map((p) => p.id)
    },
    null,
    2
  )
);
