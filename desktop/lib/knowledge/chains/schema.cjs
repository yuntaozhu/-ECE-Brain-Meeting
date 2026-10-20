/**
 * Load distill-chains schema. Chinese prompts live only in JSON.
 */
const { load } = require("../schemaStore.cjs");

function distillCfg() {
  return load().distillChains || {};
}

function fillTpl(tpl, vars) {
  return String(tpl || "").replace(/\{(\w+)\}/g, (_, key) =>
    vars && vars[key] != null ? String(vars[key]) : ""
  );
}

module.exports = { distillCfg, fillTpl };
