"use strict";

/**
 * 附件链接探测（Phase C 钩子；真正的 xlsx/pdf/VLM 解析后置）
 */
const ATTACH_RE = /\.(xls|xlsx|doc|docx|pdf|csv)(\?|$)/i;

function detectAttachmentLinks(htmlOrMd, baseUrl = "") {
  const text = String(htmlOrMd || "");
  const hrefs = [];
  const re = /href\s*=\s*["']([^"']+)["']/gi;
  let m;
  while ((m = re.exec(text))) {
    const href = m[1];
    if (!ATTACH_RE.test(href)) continue;
    try {
      hrefs.push(baseUrl ? new URL(href, baseUrl).toString() : href);
    } catch (_) {
      hrefs.push(href);
    }
  }
  // markdown links
  const md = text.matchAll(/\[[^\]]*\]\(([^)]+)\)/g);
  for (const x of md) {
    if (ATTACH_RE.test(x[1])) hrefs.push(x[1]);
  }
  return [...new Set(hrefs)];
}

module.exports = { detectAttachmentLinks, ATTACH_RE };
