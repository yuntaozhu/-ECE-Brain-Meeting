/** 经营顾问 LLM 调用与 JSON 解析 */
const { debugLog } = require("../../platform/debugLog.cjs");
const { stripIntroBoilerplate, clipUtterance } = require("../../duplex");
const { apiKey, chatModelL2, resolveThinkingType } = require("./config.cjs");

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
  const wikiRule =
    "【知识】为 Wiki 词条：tts 优先改写「口播」段；数字只能来自「事实」；必须遵守「边界」禁说内容；cite 用词条标题。";
  if (tier === "L3") {
    return (
      "你是「大智」经营顾问，开启深度分析模式。只依据【知识】给可执行方案，禁止编造数字/园名。\n" +
      wikiRule +
      "\n先深度想透园长处境与路径利弊，再给口播抓手。输出纯 JSON，不要 markdown：\n" +
      '{"tts":"口播一句说完不超过160字","analysis":"深度分析120—250字","steps":["步骤1","步骤2","步骤3","步骤4"],"risks":["风险"],"cite":["依据标题"]}\n' +
      "若用户要「其他/更好方案」必须换路径，不得复读【上一答】；禁止「不在解答范围」。"
    );
  }
  return (
    "你是「大智」经营顾问。只依据 Wiki 词条给可执行方案。输出纯 JSON，不要 markdown：\n" +
    '{"tts":"口播一句说完不超过160字","steps":["步骤1","步骤2","步骤3"],"risks":["风险"],"cite":["依据标题"]}\n' +
    wikiRule +
    "\n禁止编造数字/园名；禁止「不在解答范围」；若用户要「其他方案」必须换路径不得复读上一答。"
  );
}

module.exports = { arkJsonChat, parsePlanJson, buildSystemPrompt };
