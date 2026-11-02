/**
 * 智能断句截断：优先在标点处切断，避免半截残词。
 */
function smartClip(s, n) {
  const max = Number(n) > 0 ? Number(n) : 60;
  const t = String(s || "").replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  const lo = Math.floor(max * 0.65);
  const window = t.slice(0, max);
  const punct = /[。！？；，、,.;!?]/;
  let cut = -1;
  for (let i = window.length - 1; i >= lo; i--) {
    if (punct.test(window[i])) {
      cut = i + 1;
      break;
    }
  }
  if (cut > lo) return window.slice(0, cut).trim();
  return window.slice(0, Math.max(0, max - 1)) + "…";
}

/** @deprecated 使用 smartClip；保留别名兼容 */
function clip(s, n) {
  return smartClip(s, n);
}

module.exports = { smartClip, clip };
