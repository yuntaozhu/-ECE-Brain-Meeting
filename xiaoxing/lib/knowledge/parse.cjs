function normalizeText(s) {
  return String(s || "")
    .replace(/\s+/g, "")
    .toLowerCase();
}

function parseConceptMarkdown(md) {
  const text = String(md || "").replace(/\r\n/g, "\n");
  const titleMatch = text.match(/^#\s+(.+)$/m);
  const title = (titleMatch?.[1] || "").trim();

  function section(name) {
    const re = new RegExp(`##\\s*${name}\\s*\\n([\\s\\S]*?)(?=\\n##\\s+|$)`, "i");
    const m = text.match(re);
    return m ? m[1].trim() : "";
  }

  const relatedRaw = section("相关");
  const related = [...relatedRaw.matchAll(/\[\[([^\]]+)\]\]/g)].map((x) => x[1].trim());

  const sources = section("出处")
    .split("\n")
    .map((l) => l.replace(/^[-*]\s*/, "").trim())
    .filter(Boolean);

  const aliases = section("常见问法")
    .split("\n")
    .map((l) => l.replace(/^[-*]\s*/, "").trim())
    .filter(Boolean);

  return {
    title,
    speak: section("口播"),
    facts: section("事实"),
    bounds: section("边界"),
    related,
    sources,
    aliases,
    body: text.trim()
  };
}

function parseFaqCards(raw) {
  const text = String(raw || "").replace(/\r\n/g, "\n");
  const parts = text.split(/\n(?=##\s)/);
  const cards = [];
  for (const part of parts) {
    const t = part.trim();
    if (!/^##\s*Q:/i.test(t)) continue;
    const titleLine = (t.split("\n")[0] || "").replace(/^##\s*/, "").trim();
    const am = t.match(/(?:^|\n)A[:：]\s*([\s\S]+)/i);
    if (!am) continue;
    const answer = am[1]
      .split(/\n##\s/)[0]
      .replace(/\s+/g, " ")
      .trim();
    const questions = titleLine
      .replace(/^Q[:：]\s*/i, "")
      .split(/\s*\/\s*/)
      .map((q) => q.replace(/[？?]/g, "").trim())
      .filter(Boolean);
    cards.push({ title: titleLine, questions, answer, body: t });
  }
  return cards;
}

module.exports = { normalizeText, parseConceptMarkdown, parseFaqCards };
