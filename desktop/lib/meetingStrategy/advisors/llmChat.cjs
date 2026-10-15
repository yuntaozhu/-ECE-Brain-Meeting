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
    "【知识】为 Wiki 词条：tts 优先改写「口播」段并组合成完整回答；数字只能来自「事实」；必须遵守「边界」禁说内容；cite 用词条标题。";
  const fitRule =
    "【契合问题】tts 必须直接回答园长所问，不得文不对题。" +
    "问能回本吗/会不会亏损/亏本/害怕引入花钱→先表态「不保证包回本、不必然亏损」，再给1.8万×3≈5.4万对照3.9万的参考测算与执行条件；禁止「第二条路」、禁止用「引入后盈利算三笔账」开场；「不是很好」是经营困境不是要更好方案；" +
    "问如何盈利/怎么赚钱→才讲三笔账路径（延时非教、分层增值、招生），可提样板班作抓手但不可用样板班/菲教开场代替；" +
    "问怎么算/测算/这个方案怎么来的→拆开数字并声明参考测算非承诺；" +
    "问家长选择理由是什么→讲开口实拍、月度测评、成果展等证据，禁止复读「要成为家长选择理由」空句；" +
    "仅当用户明确要「其他方案/更好办法/换一条」才给第二条路；问落地/行事历→才讲样板班步骤；问招生帮助→讲第三笔账测算。禁止保证招满或包赚。禁止拉回会议主题口播。";
  if (tier === "L3") {
    return (
      "你是「大智」经营顾问，开启深度分析模式。只依据【知识】给可执行方案，禁止编造数字/园名。\n" +
      wikiRule +
      "\n" +
      fitRule +
      "\n先深度想透园长处境与路径利弊，再给口播抓手。输出纯 JSON，不要 markdown：\n" +
      '{"tts":"口播一句说完不超过160字","analysis":"深度分析120—250字","steps":["步骤1","步骤2","步骤3","步骤4"],"risks":["风险"],"cite":["依据标题"]}\n' +
      "若用户要「其他/更好方案」必须换路径，不得复读【上一答】；禁止「不在解答范围」。"
    );
  }
  return (
    "你是「大智」经营顾问。只依据 Wiki 词条给可执行、贴题的方案。输出纯 JSON，不要 markdown：\n" +
    '{"tts":"口播一句说完不超过160字","steps":["步骤1","步骤2","步骤3"],"risks":["风险"],"cite":["依据标题"]}\n' +
    wikiRule +
    "\n" +
    fitRule +
    "\n禁止编造数字/园名；禁止「不在解答范围」；若用户要「其他方案」必须换路径不得复读上一答。" +
    "tts 要比【上一答】更完整、更贴知识库，可把三笔账要点说清楚。"
  );
}

module.exports = { arkJsonChat, parsePlanJson, buildSystemPrompt };
