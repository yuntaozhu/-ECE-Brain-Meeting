/**
 * 无证据短引导用的焦点抽取。
 * 主路径：编译索引上的高信息连续二元组。索引未就绪时退回结巴。
 */
const fs = require("fs");
const path = require("path");
const { words, hp } = require("../knowledge/schemaStore.cjs");
const { extractHighEntropyFocus } = require("./universalOperators.cjs");
const { loadCompiled } = require("../knowledge/compiler.cjs");

let jieba = null;

function getJieba() {
  if (jieba) return jieba;
  const { Jieba } = require("@node-rs/jieba");
  const { dict } = require("@node-rs/jieba/dict");
  jieba = Jieba.withDict(dict);
  const userPath = path.join(__dirname, "jieba-userdict.txt");
  if (fs.existsSync(userPath)) {
    jieba.loadDict(fs.readFileSync(userPath));
  }
  return jieba;
}

function keepWord(word) {
  const s = String(word || "").replace(/[^\u4e00-\u9fffA-Za-z0-9]/g, "");
  if (s.length < hp("focusWordMin") || s.length > hp("focusWordMax")) return "";
  if (words("operators", "dropWords").has(s)) return "";
  return s;
}

function focusPhraseLegacy(text) {
  const raw = String(text || "").trim();
  if (!raw) return "";
  const jb = getJieba();
  const parts = jb.cut(raw, true) || [];
  const kept = [];
  for (const p of parts) {
    const word = keepWord(p);
    if (word) kept.push(word);
  }
  if (!kept.length) return "";
  let focus = kept[kept.length - 1];
  if (words("operators", "weakTail").has(focus) && kept.length >= 2) focus = kept[kept.length - 2];
  return focus;
}

/** 本句内容词，给短引导和下一轮检索。 */
function focusPhrase(text) {
  const raw = String(text || "").trim();
  if (!raw) return "";
  if (loadCompiled()) {
    const focus = extractHighEntropyFocus(raw);
    if (focus) return focus;
  }
  return focusPhraseLegacy(raw);
}

module.exports = { focusPhrase };
