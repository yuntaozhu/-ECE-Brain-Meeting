/**
 * 会议会话 — ASR 别名归一与唤醒正文剥离
 */
const { normalizeForMatch } = require("../../duplex");
const { load } = require("../../knowledge/schemaStore.cjs");

function applyPairs(text, pairs) {
  let t = String(text || "");
  for (const pair of pairs || []) {
    t = t.replace(new RegExp(pair[0], "g"), pair[1]);
  }
  return t;
}

function normalizeDazhiAliases(text) {
  const commands = load().commands;
  let t = normalizeForMatch(text);
  if (commands.aliasFrom && commands.aliasFrom.length) {
    t = t.replace(new RegExp(commands.aliasFrom.join("|"), "g"), commands.aliasTo);
  }
  return applyPairs(t, load().operators.asrNormalize);
}

/**
 * 去掉唤醒词，抽出「大智，XXXX」后的正文。
 * 长 ASR 粘连闲聊时取「最后一个大智」之后，避免把前半段工程吐槽当问题。
 * @param {string} text
 */
function peelWakePayload(text) {
  let t = normalizeDazhiAliases(String(text || "").trim());
  if (!t) return "";
  const commands = load().commands;
  const canon = commands.aliasTo;
  const also = commands.alsoNamed;
  const lastDazhi = Math.max(t.lastIndexOf(canon), t.lastIndexOf(also));
  if (lastDazhi > 0) t = t.slice(lastDazhi);
  const lead = new RegExp(`^(?:${canon}|${also})[，,。.\\s]*`);
  t = t.replace(lead, "").replace(lead, "").trim();
  return t;
}

module.exports = {
  normalizeDazhiAliases,
  peelWakePayload
};
