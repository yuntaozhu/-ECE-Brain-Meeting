/** 定义页口播守卫。句式只读 linguistic-operators.definitionSpeak。 */
const { rx } = require("../../knowledge/schemaStore.cjs");

function isDefinitionSpeak(text) {
  return rx("operators", "definitionSpeak").test(String(text || ""));
}

module.exports = { isDefinitionSpeak };
