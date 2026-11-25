"use strict";

/**
 * 中英切词：英文/数字词 + 中文 2~4 字 n-gram
 */
function tokenize(text) {
  const s = String(text || "").toLowerCase();
  const en = s.match(/[a-z0-9_]{2,}/g) || [];
  const out = new Set(en);
  const runs = s.match(/[\u4e00-\u9fff]+/g) || [];
  for (const run of runs) {
    if (run.length >= 2) out.add(run);
    for (let n = 2; n <= 4; n++) {
      for (let i = 0; i + n <= run.length; i++) {
        out.add(run.slice(i, i + n));
      }
    }
  }
  return [...out];
}

function normalizeSlug(s) {
  return String(s || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-");
}

module.exports = { tokenize, normalizeSlug };
