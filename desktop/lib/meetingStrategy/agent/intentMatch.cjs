/**
 * 按 schema/intent-rules.json 顺序匹配意图。引擎只做匹配，词在 JSON 里。
 */
const { load, rx } = require("../../knowledge/schemaStore.cjs");

const reCache = new Map();

function re(src) {
  const key = String(src || "");
  if (!key) return null;
  if (reCache.has(key)) return reCache.get(key);
  const compiled = new RegExp(key);
  reCache.set(key, compiled);
  return compiled;
}

function hit(src, text) {
  const compiled = re(src);
  return Boolean(compiled && compiled.test(String(text || "")));
}

function hitAny(list, text) {
  return (list || []).some((src) => hit(src, text));
}

function hitAll(list, text) {
  const rows = list || [];
  return rows.length > 0 && rows.every((src) => hit(src, text));
}

function isInterrogative(q) {
  return rx("operators", "interrogative").test(String(q || ""));
}

function isExclamation(q) {
  const s = String(q || "").trim();
  return rx("operators", "exclamationEnd").test(s) && !isInterrogative(s);
}

function rejectIf(rule, q) {
  const gate = rule.rejectIf;
  if (!gate) return false;
  const hardship = hitAll(gate.all, q);
  const hasEscape = hitAny(gate.none, q);
  return hardship && !hasEscape;
}

function ruleMatches(rule, q, lastHost) {
  if (rule.emptyOr != null) {
    if (!q || hit(rule.emptyOr, q)) return true;
    return false;
  }
  if (rule.requireHost && !String(lastHost || "").trim()) return false;
  if (rule.hostTest && !hit(rule.hostTest, lastHost)) return false;
  if (rule.exclamation) return isExclamation(q);
  if (rule.interrogative && !isInterrogative(q)) return false;
  if (rule.unlessAny && hitAny(rule.unlessAny, q)) return false;
  if (rejectIf(rule, q)) return false;
  if (rule.all && !hitAll(rule.all, q)) return false;
  if (rule.test && !hit(rule.test, q)) return false;
  if (!rule.test && !rule.all && !rule.exclamation && !rule.emptyOr) return false;
  return true;
}

function matchIntent(askText, opts = {}) {
  const q = String(askText || "");
  const lastHost = String(opts.lastHostAnswer || "");
  const rules = load().intents.rules || [];
  for (const rule of rules) {
    if (!ruleMatches(rule, q, lastHost)) continue;
    return {
      id: rule.id,
      intent: rule.intent,
      confidence: Number(rule.confidence) || 0,
      must_answer: rule.must_answer == null ? q.slice(0, 40) : rule.must_answer,
      speak_policy: rule.speak_policy || ""
    };
  }
  return null;
}

function softScriptFor(intent, askText) {
  const name = typeof intent === "string" ? intent : intent?.intent;
  const q = String(askText || "");
  for (const row of load().intents.softVariants || []) {
    if (row.whenIntent !== name) continue;
    if (row.unlessAny && hitAny(row.unlessAny, q)) continue;
    if (row.test && !hit(row.test, q)) continue;
    return row.script || "";
  }
  return "";
}

function moneyIntentSet() {
  return new Set(load().intents.moneyIntents || []);
}

function lockedIntentSet() {
  return new Set(load().intents.lockedIntents || []);
}

function contentSpeakSet() {
  return new Set(load().intents.contentSpeakIntents || []);
}

function intentList() {
  return load().intents.intents || [];
}

function enrichFor(intent) {
  return load().intents.enrich?.[intent] || null;
}

function understandSystem() {
  return String(load().intents.understandSystem || "");
}

module.exports = {
  matchIntent,
  softScriptFor,
  moneyIntentSet,
  lockedIntentSet,
  contentSpeakSet,
  intentList,
  enrichFor,
  understandSystem,
  isInterrogative,
  isExclamation
};
