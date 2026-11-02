/**
 * Option C 反问子类型：从 schema.counterPatterns 选型填空（instant）。
 */
const { copilotCfg } = require("./gate.cjs");

function fillTpl(tpl, vars) {
  return String(tpl || "").replace(/\{(\w+)\}/g, (_, k) =>
    vars && vars[k] != null ? String(vars[k]) : ""
  );
}

/**
 * @param {string} segment
 * @param {string} topic
 * @returns {{ id: string, text: string }}
 */
function pickCounterPattern(segment, topic) {
  const cfg = copilotCfg();
  const templates = cfg.templates || {};
  const patterns = Array.isArray(cfg.counterPatterns) ? cfg.counterPatterns : [];
  const t = String(segment || "");
  const topicSafe = String(topic || "当前议题");

  for (const p of patterns) {
    if (!p || !p.id || p.id === "generic") continue;
    const src = String(p.test || "").trim();
    if (!src) continue;
    try {
      if (new RegExp(src).test(t)) {
        return {
          id: String(p.id),
          text: fillTpl(p.template || "", { topic: topicSafe })
        };
      }
    } catch (_) {}
  }

  const generic = patterns.find((p) => p && p.id === "generic");
  if (generic) {
    return {
      id: "generic",
      text: fillTpl(generic.template || "", { topic: topicSafe })
    };
  }

  return {
    id: "generic",
    text: fillTpl(
      templates.counter_inquiry_with_topic || templates.counter_inquiry_generic || "",
      { topic: topicSafe }
    )
  };
}

module.exports = { pickCounterPattern, fillTpl };
