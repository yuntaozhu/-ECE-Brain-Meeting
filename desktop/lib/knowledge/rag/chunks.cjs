/** 切块与向量工具 */
function splitSentences(body) {
  const sentences = [];
  for (const line of String(body || "").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const parts = trimmed.split(/(?<=[。！？!?])/);
    for (const part of parts) {
      const s = part.trim();
      if (s) sentences.push(s);
    }
  }
  return sentences;
}

/**
 * 以标题为一块；超长再按句打包。每块正文带上标题。
 * @param {string} raw
 * @param {string} source
 * @param {number} maxBody
 */
function splitChunks(raw, source, maxBody = 700) {
  const text = String(raw || "").replace(/\r\n/g, "\n");
  if (!text.trim()) return [];
  const parts = text.split(/\n(?=#{1,3}\s)/);
  const out = [];
  let i = 0;
  const push = (title, body) => {
    const b = String(body || "").trim();
    if (b.length < 24) return;
    out.push({
      id: `${source}_${i++}`,
      title: String(title || "资料").slice(0, 100),
      body: b.slice(0, 1800),
      source
    });
  };
  for (const p of parts) {
    const t = p.trim();
    if (t.length < 30) continue;
    const lines = t.split("\n");
    const title = (lines[0] || "").replace(/^#+\s*/, "").slice(0, 100) || "资料";
    const rest = lines.slice(1).join("\n").trim();
    const whole = rest ? `${title}\n${rest}` : title;
    if (whole.length <= maxBody) {
      push(title, whole);
      continue;
    }
    const sentences = splitSentences(rest || t);
    let buf = [];
    let len = title.length + 1;
    const flush = () => {
      if (!buf.length) return;
      push(title, `${title}\n${buf.join("\n")}`);
      buf = [];
      len = title.length + 1;
    };
    for (const sentence of sentences) {
      if (sentence.length > maxBody) {
        flush();
        push(title, `${title}\n${sentence}`);
        continue;
      }
      if (len + sentence.length + 1 > maxBody && buf.length) flush();
      buf.push(sentence);
      len += sentence.length + 1;
    }
    flush();
  }
  return out;
}

function titleOverlapBoost(query, title) {
  const q = String(query || "").replace(/\s+/g, "").toLowerCase();
  const t = String(title || "").replace(/\s+/g, "").toLowerCase();
  if (!q || !t) return 0;
  let bonus = 0;
  const keys = ["teacher说", "family说", "行事历", "收益保障", "一园两制", "三笔账", "四端"];
  for (const k of keys) {
    if (q.includes(k) && t.includes(k)) bonus += 0.05;
  }
  if ((q.includes("teacher") || q.includes("老师")) && t.includes("teacher说")) bonus += 0.06;
  if (q.includes("落地") && t.includes("行事历")) bonus += 0.08;
  return Math.min(0.12, bonus);
}

function cosine(a, b) {
  if (!a?.length || !b?.length || a.length !== b.length) return 0;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (!na || !nb) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

/** 展平 embedding：有的版本返回 number[]，有的返回 [[...]] */
function normalizeVec(raw) {
  if (!raw) return null;
  if (Array.isArray(raw) && typeof raw[0] === "number") return raw;
  if (Array.isArray(raw) && Array.isArray(raw[0])) return raw[0];
  return null;
}

module.exports = {
  splitSentences,
  splitChunks,
  titleOverlapBoost,
  cosine,
  normalizeVec
};
