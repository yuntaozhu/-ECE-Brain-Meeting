/**
 * 会议会话 — ASR 别名归一与唤醒正文剥离
 */
const { normalizeForMatch } = require("../../duplex");

function normalizeDazhiAliases(text) {
  let t = normalizeForMatch(text);
  t = t.replace(/大致|大志|大制|达智/g, "大智");
  t = t.replace(/原所|我的原(?=要|所|园)/g, "园所");
  t = t.replace(/原要倒闭/g, "园要倒闭");
  t = t.replace(/全美语系统/g, "全园美语系统");
  t = t.replace(/全员美女|全园美女/g, "全园美语");
  t = t.replace(/公办员/g, "公办园");
  t = t.replace(/样板单/g, "样板班");
  t = t.replace(/盐云港/g, "盐城连云港");
  t = t.replace(/非叫/g, "菲教");
  t = t.replace(/色显优势|特色显优势/g, "特色优势");
  t = t.replace(/家园共浴/g, "家园共育");
  t = t.replace(/离院后/g, "离园后");
  // ASR 把「四端联动」听成近音；只替换整词，避免误伤其它「四端」
  t = t.replace(/四元流动|四端灵动|四段联动|四段流动/g, "四端联动");
  return t;
}

/**
 * 去掉唤醒词，抽出「大智，XXXX」后的正文。
 * 长 ASR 粘连闲聊时取「最后一个大智」之后，避免把前半段工程吐槽当问题。
 * @param {string} text
 */
function peelWakePayload(text) {
  let t = normalizeDazhiAliases(String(text || "").trim());
  if (!t) return "";
  const lastDazhi = Math.max(t.lastIndexOf("大智"), t.lastIndexOf("李老师"));
  if (lastDazhi > 0) t = t.slice(lastDazhi);
  t = t
    .replace(/^(大智|李老师)[，,。.\s]*/g, "")
    .replace(/^(大智|李老师)[，,。.\s]*/g, "")
    .trim();
  return t;
}

module.exports = {
  normalizeDazhiAliases,
  peelWakePayload
};
