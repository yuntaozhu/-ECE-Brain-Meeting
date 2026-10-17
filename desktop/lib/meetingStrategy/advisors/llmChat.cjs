/** 经营顾问 LLM 调用与 JSON 解析 */
const { debugLog } = require("../../platform/debugLog.cjs");
const { stripIntroBoilerplate, clipUtterance } = require("../../duplex");
const { apiKey, chatModelL2, resolveThinkingType } = require("./config.cjs");
const { speakLine, speakFill } = require("../../knowledge/schemaStore.cjs");

async function arkJsonChat(system, user, opts = {}) {
  const key = apiKey();
  if (!key) return null;
  const timeoutMs = opts.timeoutMs != null ? opts.timeoutMs : 20000;
  const model = opts.model || chatModelL2();
  const thinkingType = resolveThinkingType(Boolean(opts.deep), model);
  const ac = new AbortController();
  const onAbort = () => ac.abort();
  if (opts.signal) {
    if (opts.signal.aborted) return null;
    opts.signal.addEventListener("abort", onAbort, { once: true });
  }
  const timer = setTimeout(() => ac.abort(), timeoutMs);
  try {
    const body = {
      model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user }
      ],
      temperature: opts.temperature != null ? opts.temperature : opts.deep ? 0.5 : 0.4
    };
    // doubao-seed-evolving：必须显式 enabled|disabled（无 auto；默认 enabled）
    // https://docs.volcengine.com/docs/82379/1449737
    if (thinkingType) {
      body.thinking = { type: thinkingType };
    }
    debugLog.info("BusinessAdvisor", "LLM 请求", {
      model,
      deep: Boolean(opts.deep),
      thinking: thinkingType,
      timeoutMs,
      systemLen: system.length,
      userLen: user.length
    });
    const response = await fetch("https://ark.cn-beijing.volces.com/api/v3/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`
      },
      body: JSON.stringify(body),
      signal: ac.signal
    });
    if (!response.ok) {
      const errBody = await response.text().catch(() => "");
      debugLog.warn("BusinessAdvisor", "LLM HTTP 失败", {
        status: response.status,
        model,
        thinking: thinkingType,
        preview: String(errBody).slice(0, 200)
      });
      return null;
    }
    const data = await response.json();
    const msg = data.choices?.[0]?.message || {};
    const content = msg.content || null;
    const reasoning = msg.reasoning_content || "";
    if (reasoning) {
      debugLog.info("BusinessAdvisor", "LLM reasoning", {
        chars: String(reasoning).length,
        preview: String(reasoning).slice(0, 80)
      });
    }
    if (!content) {
      debugLog.warn("BusinessAdvisor", "LLM 空内容", { model, thinking: thinkingType });
    }
    return { content, reasoning: String(reasoning || "") };
  } catch (err) {
    if (ac.signal.aborted || err?.name === "AbortError") {
      debugLog.warn("BusinessAdvisor", "LLM 超时/取消，用启发式", {
        timeoutMs,
        model,
        thinking: thinkingType
      });
      return null;
    }
    debugLog.warn("BusinessAdvisor", "LLM 失败", {
      error: String(err?.message || err),
      model,
      thinking: thinkingType
    });
    return null;
  } finally {
    clearTimeout(timer);
    if (opts.signal) opts.signal.removeEventListener("abort", onAbort);
  }
}

function parsePlanJson(raw, { deep = false } = {}) {
  if (!raw) return null;
  const s = String(raw).trim();
  const m = s.match(/\{[\s\S]*\}/);
  if (!m) {
    debugLog.warn("BusinessAdvisor", "LLM 非 JSON", { preview: s.slice(0, 120) });
    return null;
  }
  try {
    const j = JSON.parse(m[0]);
    if (!j.tts) return null;
    return {
      tts: stripIntroBoilerplate(clipUtterance(String(j.tts), 160)),
      analysis: j.analysis ? String(j.analysis).slice(0, deep ? 600 : 200) : "",
      steps: Array.isArray(j.steps) ? j.steps.map((x) => String(x).slice(0, 100)).slice(0, 6) : [],
      risks: Array.isArray(j.risks) ? j.risks.map((x) => String(x).slice(0, 80)).slice(0, 4) : [],
      cite: Array.isArray(j.cite) ? j.cite.map((x) => String(x).slice(0, 40)).slice(0, 6) : []
    };
  } catch (_) {
    debugLog.warn("BusinessAdvisor", "LLM JSON 解析失败", { preview: m[0].slice(0, 120) });
    return null;
  }
}

function buildSystemPrompt(tier) {
  const wiki = speakLine("advisorWikiRule");
  const fit = speakLine("advisorFitRule");
  if (tier === "L3") return speakFill("advisorL3", { wiki, fit });
  return speakFill("advisorL2", { wiki, fit });
}

module.exports = { arkJsonChat, parsePlanJson, buildSystemPrompt };
