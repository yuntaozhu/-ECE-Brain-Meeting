/** 定义页口播守卫 */
/** 定义页口播：经营题禁止当抓手 */
function isDefinitionSpeak(text) {
  const s = String(text || "");
  return /全园美语是面向大地合作园|不是单一英语课或账号采购|整合\s*ABCmouse/.test(s);
}

module.exports = { isDefinitionSpeak };
