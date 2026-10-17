/**
 * 无证据短引导才使用的分词。
 * 结巴懒加载；对齐、回声、普通检索不经过这里。
 * 本机用 @node-rs/jieba（jieba-rs 预编译）。nodejieba 在 Node 26 / 无 MSVC 时装不上。
 */
const fs = require("fs");
const path = require("path");

const DROP = new Set([
  "什么",
  "怎么",
  "如何",
  "怎样",
  "可以",
  "是否",
  "你们",
  "我们",
  "这个",
  "那个",
  "一下",
  "还有",
  "以及",
  "或者",
  "因为",
  "所以",
  "如果",
  "那么",
  "一个",
  "一些",
  "没有",
  "不是",
  "能不能",
  "不会",
  "不具备",
  "怎么办",
  "现在",
  "一起",
  "大智",
  "大致",
  "能够",
  "怎么做",
  "可以让",
  "第一次",
  "问题",
  "回复",
  "刚才",
  "刚刚",
  "打断"
]);

/** 句末弱动词：再往前取一个内容词。 */
const WEAK_TAIL = new Set(["实施", "执行", "处理", "解决", "开展", "进行", "办理", "完成", "具备"]);

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
  if (s.length < 2 || s.length > 6) return "";
  if (DROP.has(s)) return "";
  return s;
}

/** 本句内容词，2–6 字，给短引导和下一轮检索。 */
function focusPhrase(text) {
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
  if (WEAK_TAIL.has(focus) && kept.length >= 2) focus = kept[kept.length - 2];
  return focus;
}

module.exports = { focusPhrase };
