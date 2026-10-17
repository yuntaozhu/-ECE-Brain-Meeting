const fs = require("fs");
const path = require("path");
const words = [
  "全园美语",
  "园所",
  "回本",
  "个月",
  "收费",
  "付不起",
  "开办条件",
  "经营",
  "不执行",
  "我如何能够通",
  "刚才",
  "问题",
  "回复",
  "打断"
];
const files = process.argv.slice(2);
function literalText(src) {
  let out = "";
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    const n2 = src[i + 1];
    if (c === "/" && n2 === "/") {
      const nl = src.indexOf("\n", i);
      i = nl < 0 ? src.length : nl + 1;
      continue;
    }
    if (c === "/" && n2 === "*") {
      const end = src.indexOf("*/", i + 2);
      i = end < 0 ? src.length : end + 2;
      continue;
    }
    if (c === '"' || c === "'" || c === "`") {
      const q = c;
      i += 1;
      while (i < src.length) {
        if (src[i] === "\\") {
          out += src[i + 1] || "";
          i += 2;
          continue;
        }
        if (src[i] === q) {
          i += 1;
          break;
        }
        out += src[i];
        i += 1;
      }
      out += "\n";
      continue;
    }
    if (c === "/") {
      let j = i - 1;
      while (j >= 0 && /\s/.test(src[j])) j -= 1;
      const prev = j >= 0 ? src[j] : "(";
      if ("(,=:[!&|?{};~+-*%<>".includes(prev)) {
        i += 1;
        while (i < src.length) {
          if (src[i] === "\\") {
            out += src[i + 1] || "";
            i += 2;
            continue;
          }
          if (src[i] === "/") {
            i += 1;
            break;
          }
          if (src[i] === "\n") break;
          out += src[i];
          i += 1;
        }
        out += "\n";
        continue;
      }
    }
    i += 1;
  }
  return out;
}
for (const f of files) {
  const t = literalText(fs.readFileSync(path.resolve(f), "utf8"));
  const hits = [];
  for (const w of words) {
    let i = 0;
    let n = 0;
    while ((i = t.indexOf(w, i)) >= 0) {
      n += 1;
      i += w.length;
    }
    if (n) hits.push(w + "x" + n);
  }
  console.log(f, hits.join(", ") || "(none)");
}
