/**
 * 零硬编码门禁（第一版）。
 * 只数字符串和正则里的禁用词，注释不算。
 * 已知迁移债记在 hardcode-baseline.json。
 * 新增文件，或同一文件里禁用词变多，非零退出。
 * 变少不算失败。更新基线：node test/no-hardcode-lint.cjs --write
 *
 *   node test/no-hardcode-lint.cjs
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..", "lib");
const BASELINE = path.join(__dirname, "hardcode-baseline.json");
const WORDS = [
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

function walk(dir, out = []) {
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    if (fs.statSync(full).isDirectory()) walk(full, out);
    else if (name.endsWith(".cjs")) out.push(full);
  }
  return out;
}

function isRegexStart(src, i) {
  let j = i - 1;
  while (j >= 0 && /\s/.test(src[j])) j -= 1;
  if (j < 0) return true;
  const prev = src[j];
  if ("(,=:[!&|?{};~+-*%<>".includes(prev)) return true;
  const tail = src.slice(Math.max(0, j - 12), j + 1);
  return /(?:return|case|throw|else|do|void|typeof|in|of|delete|await|yield)$/.test(tail);
}

/** 抽出字符串和正则字面量，供禁用词计数。 */
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
      const quote = c;
      i += 1;
      while (i < src.length) {
        if (src[i] === "\\") {
          out += src[i + 1] || "";
          i += 2;
          continue;
        }
        if (src[i] === quote) {
          i += 1;
          break;
        }
        out += src[i];
        i += 1;
      }
      out += "\n";
      continue;
    }
    if (c === "/" && isRegexStart(src, i)) {
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
    i += 1;
  }
  return out;
}

function countWords(text) {
  let n = 0;
  for (const word of WORDS) {
    let i = 0;
    while ((i = text.indexOf(word, i)) >= 0) {
      n += 1;
      i += word.length;
    }
  }
  return n;
}

function scan() {
  const counts = {};
  for (const file of walk(ROOT)) {
    const rel = path.relative(path.join(__dirname, ".."), file).replace(/\\/g, "/");
    const n = countWords(literalText(fs.readFileSync(file, "utf8")));
    if (n > 0) counts[rel] = n;
  }
  return counts;
}

function main() {
  const counts = scan();
  if (process.argv.includes("--write")) {
    fs.writeFileSync(BASELINE, JSON.stringify(counts, null, 2) + "\n");
    console.log("[no-hardcode-lint] wrote", Object.keys(counts).length, "debt files");
    return;
  }
  if (!fs.existsSync(BASELINE)) {
    console.error("[no-hardcode-lint] missing baseline. Run with --write once.");
    process.exit(1);
  }
  const baseline = JSON.parse(fs.readFileSync(BASELINE, "utf8"));
  const fails = [];
  for (const [file, n] of Object.entries(counts)) {
    const prev = baseline[file];
    if (prev == null) fails.push(`new file ${file} has ${n} banned literals`);
    else if (n > prev) fails.push(`${file} grew ${prev} -> ${n}`);
  }
  if (fails.length) {
    console.error("[no-hardcode-lint] FAIL");
    fails.forEach((line) => console.error("  - " + line));
    process.exit(1);
  }
  const debt = Object.keys(counts).length;
  console.log(`[no-hardcode-lint] ok, debt files ${debt}, no new literals`);
}

main();
