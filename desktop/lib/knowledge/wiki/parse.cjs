/** 概念页 Markdown 解析 */
function normalizeText(s) {
  return String(s || "")
    .replace(/\s+/g, "")
    .toLowerCase();
}

/**
 * @param {string} md
 * @returns {{ title: string, speak: string, facts: string, bounds: string, related: string[], sources: string[], aliases: string[], body: string }}
 */
function parseConceptMarkdown(md) {
  const text = String(md || "").replace(/\r\n/g, "\n");
  const titleMatch = text.match(/^#\s+(.+)$/m);
  const title = (titleMatch?.[1] || "").trim();

  function section(name) {
    const re = new RegExp(
      `##\\s*${name}\\s*\\n([\\s\\S]*?)(?=\\n##\\s+|$)`,
      "i"
    );
    const m = text.match(re);
    return m ? m[1].trim() : "";
  }

  // 兼容旧 distilled「口播：」行格式
  let speak = section("口播");
  let facts = section("事实");
  let bounds = section("边界");
  if (!speak) {
    const m = text.match(/口播[：:]\s*(.+)/);
    if (m) speak = m[1].trim();
  }
  if (!facts) {
    const m = text.match(/事实[：:]\s*([\s\S]*?)(?=\n边界[：:]|\n##|$)/);
    if (m) facts = m[1].trim();
  }
  if (!bounds) {
    const m = text.match(/边界[：:]\s*([\s\S]*?)(?=\n##|$)/);
    if (m) bounds = m[1].trim();
  }

  const relatedRaw = section("相关");
  const related = [...relatedRaw.matchAll(/\[\[([^\]]+)\]\]/g)].map((x) => x[1].trim());

  const sources = section("出处")
    .split("\n")
    .map((l) => l.replace(/^[-*]\s*/, "").trim())
    .filter((l) => l && !/暂无|待/.test(l));

  const aliases = section("常见问法")
    .split("\n")
    .map((l) => l.replace(/^[-*]\s*/, "").trim())
    .filter((l) => l && !/待沉淀|暂无/.test(l));

  return {
    title,
    speak,
    facts,
    bounds,
    related,
    sources,
    aliases,
    body: text.trim()
  };
}

module.exports = { normalizeText, parseConceptMarkdown };
