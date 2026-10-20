/**
 * 读取 desktop/knowledge/schema/*.json。引擎只拿模式和数字，不在这里写业务词。
 */
const fs = require("fs");
const path = require("path");

const DIR = path.join(__dirname, "..", "..", "knowledge", "schema");

let bag = null;
const rxCache = new Map();
const setCache = new Map();

function readJson(name) {
  return JSON.parse(fs.readFileSync(path.join(DIR, name), "utf8"));
}

function load() {
  if (!bag) {
    bag = {
      commands: readJson("session-commands.json"),
      operators: readJson("linguistic-operators.json"),
      slots: readJson("slot-ontology.json"),
      hyper: readJson("engine-hyperparams.json"),
      scripts: readJson("intent-scripts.json"),
      intents: readJson("intent-rules.json"),
      classify: readJson("query-classify.json"),
      session: readJson("session-intents.json"),
      speak: readJson("speak-lines.json"),
      diagnose: readJson("advisor-diagnose.json"),
      verify: readJson("intent-verify.json"),
      plans: readJson("advisor-plans.json"),
      faq: readJson("faq-match.json"),
      distillChains: readJson("distill-chains.json")
    };
  }
  return bag;
}

function patternSource(group, name) {
  const table = load()[group];
  if (!table) throw new Error("missing schema group " + group);
  const src = table.patterns ? table.patterns[name] : null;
  if (typeof src !== "string" || !src) throw new Error("missing pattern " + group + "." + name);
  return src;
}

function rx(group, name, flags) {
  const key = group + "\0" + name + "\0" + (flags || "");
  if (rxCache.has(key)) return rxCache.get(key);
  const re = new RegExp(patternSource(group, name), flags || "");
  rxCache.set(key, re);
  return re;
}

function words(group, name) {
  const key = group + "\0" + name;
  if (setCache.has(key)) return setCache.get(key);
  const list = load()[group][name];
  if (!Array.isArray(list)) throw new Error("missing word list " + group + "." + name);
  const set = new Set(list);
  setCache.set(key, set);
  return set;
}

function hp(name) {
  const value = load().hyper[name];
  if (value == null) throw new Error("missing hyper " + name);
  return value;
}

function tpl(name) {
  const value = load().operators.templates[name];
  if (typeof value !== "string") throw new Error("missing template " + name);
  return value;
}

function fill(name, vars) {
  return tpl(name).replace(/\{(\w+)\}/g, (_, key) => (vars && vars[key] != null ? String(vars[key]) : ""));
}

function scriptLine(name) {
  const value = load().scripts[name];
  return typeof value === "string" ? value : "";
}

function speakLine(name) {
  const value = load().speak[name];
  return typeof value === "string" ? value : "";
}

function speakFill(name, vars) {
  return speakLine(name).replace(/\{(\w+)\}/g, (_, key) =>
    vars && vars[key] != null ? String(vars[key]) : ""
  );
}

function speakHp(name) {
  const value = load().speak[name];
  if (value == null) throw new Error("missing speak " + name);
  return value;
}

function wakeRe() {
  const key = "wakeNames";
  if (rxCache.has(key)) return rxCache.get(key);
  const names = load().commands.wakeNames || [];
  const re = new RegExp(names.map((s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|"));
  rxCache.set(key, re);
  return re;
}

module.exports = { load, rx, words, hp, tpl, fill, scriptLine, speakLine, speakFill, speakHp, wakeRe };
