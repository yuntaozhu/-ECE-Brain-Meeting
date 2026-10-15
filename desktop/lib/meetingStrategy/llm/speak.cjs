/** 整段一次口播。思考占位只走 UI。 */
// debugLog / stripIntro 直连底层模块，避开 deps 循环依赖
const { debugLog } = require("../../platform/debugLog.cjs");
const { stripIntroBoilerplate } = require("../../duplex");
const { THINKING_FILLER, FAST_LLM_MS } = require("../internal/scripts.cjs");
const { newEvent, clipSpeak } = require("../internal/result.cjs");
const { arkChat } = require("./transport.cjs");

/**
 * P0：思考占位仅 UI；正式答整段一次 TTS（不再 early+queue 拆播）。
 * stream 超时走非流式短请求；失败不写业务软句，交给调用方知识库兜底。
 */
async function speakViaChat(system, userTask, opts, a2aTrace) {
  let thinkingTimer = null;
  let bridged = false;
  const armThinking = () => {
    thinkingTimer = setTimeout(() => {
      a2aTrace.push(newEvent("HostAgent", "AudioBridge", "THINKING_FILLER", { text: THINKING_FILLER, uiOnly: true }));
      Promise.resolve(opts.onThinking?.(THINKING_FILLER)).catch(() => {});
      const bridge = String(opts.bridgeText || "").trim();
      if (bridge && !bridged) {
        bridged = true;
        Promise.resolve(opts.onEarlySpeak?.(bridge)).catch(() => {});
      }
    }, 650);
  };
  const clearThinking = () => {
    if (thinkingTimer) clearTimeout(thinkingTimer);
    thinkingTimer = null;
  };
  let answer = "";
  let arkBillingOverdue = false;
  let arkError = null;
  let arkMode = "llm";
  try {
    if (opts.signal?.aborted) throw new Error("aborted");
    armThinking();
    let res = await arkChat(system, userTask, {
      fast: opts.fast !== false,
      stream: true,
      temperature: opts.temperature,
      signal: opts.signal,
      timeoutMs: opts.timeoutMs || FAST_LLM_MS,
      onClause: (clause) => {
        bridged = true;
        clearThinking();
        opts.onClause?.(clause);
      }
    });
    if (opts.signal?.aborted) {
      clearThinking();
      return {
        answer: "",
        speakTail: "",
        spokenPrefix: "",
        earlyCovered: false,
        arkMode: "aborted",
        arkBillingOverdue: false,
        arkError: "aborted",
        aborted: true
      };
    }
    if (!res.ok || !res.content) {
      const http403 = Number(res.status) === 403 || /Ark HTTP 403/.test(String(res.error || ""));
      // 403 不重试：鉴权/欠费不会因再发一次非流式变好
      if (http403) {
        debugLog.warn("Strategy", "ark_http_403", {
          error: res.error,
          billingOverdue: Boolean(res.billingOverdue),
          hint: "检查 ARK/DOUBAO Key、Endpoint 权限与账户状态"
        });
      } else if (res.error === "aborted" && !opts.signal?.aborted) {
        // 定时器 abort ≠ 用户取消：走第二次非流式短请求
        debugLog.warn("Strategy", "arkChat stream_timeout，改非流式短请求", {
          timeoutMs: opts.timeoutMs || FAST_LLM_MS
        });
        res = await arkChat(system, String(userTask || "").slice(0, 280), {
          fast: true,
          stream: false,
          temperature: opts.temperature,
          signal: opts.signal,
          timeoutMs: Math.min(Number(opts.timeoutMs) || FAST_LLM_MS, 4000),
          maxTokens: 100
        });
        if (res.ok && res.content) {
          debugLog.info("Strategy", "arkChat retry_ok", { preview: String(res.content).slice(0, 80) });
        } else {
          debugLog.warn("Strategy", "arkChat retry_fail", { error: res.error || "empty" });
        }
      } else if (res.error === "aborted") {
        clearThinking();
        return {
          answer: "",
          speakTail: "",
          spokenPrefix: "",
          earlyCovered: false,
          arkMode: "aborted",
          arkBillingOverdue: false,
          arkError: "aborted",
          aborted: true
        };
      } else {
        res = await arkChat(system, String(userTask || "").slice(0, 280), {
          fast: true,
          stream: false,
          temperature: opts.temperature,
          signal: opts.signal,
          timeoutMs: Math.min(Number(opts.timeoutMs) || FAST_LLM_MS, 4000),
          maxTokens: 100
        });
        if (res.ok && res.content) {
          debugLog.info("Strategy", "arkChat retry_ok", { preview: String(res.content).slice(0, 80) });
        } else {
          debugLog.warn("Strategy", "arkChat retry_fail", { error: res.error || "empty" });
        }
      }
    }
    clearThinking();
    if (opts.signal?.aborted || (res.error === "aborted" && opts.signal?.aborted)) {
      return {
        answer: "",
        speakTail: "",
        spokenPrefix: "",
        earlyCovered: false,
        arkMode: "aborted",
        arkBillingOverdue: false,
        arkError: "aborted",
        aborted: true
      };
    }
    if (res.billingOverdue) {
      arkBillingOverdue = true;
      arkError = res.error;
    }
    // 403：欠费 / 鉴权 / 配额 — 显式记日志，不把未对齐软句当先开口
    if (!res.ok && (Number(res.status) === 403 || /Ark HTTP 403/.test(String(res.error || "")))) {
      debugLog.warn("Strategy", "ark_http_403", {
        error: res.error,
        billingOverdue: Boolean(res.billingOverdue),
        hint: "检查 ARK/DOUBAO Key、Endpoint 权限与账户状态"
      });
      arkError = res.error || "Ark HTTP 403";
      throw new Error(arkError);
    }
    if (res.ok && res.content) answer = stripIntroBoilerplate(clipSpeak(res.content, opts.maxLen || 100));
    else throw new Error(res.error || "empty");
  } catch (err) {
    clearThinking();
    if (opts.signal?.aborted || err?.message === "aborted" || err?.name === "AbortError") {
      return {
        answer: "",
        speakTail: "",
        spokenPrefix: "",
        earlyCovered: false,
        arkMode: "aborted",
        arkBillingOverdue: false,
        arkError: "aborted",
        aborted: true
      };
    }
    arkMode = "heuristic";
    arkError = String(err?.message || err);
    const is403 = /403/.test(arkError);
    debugLog.warn("Strategy", is403 ? "ark_http_403_fallback" : "对话回退", { error: arkError });
    // 403 / 失败：只用调用方已对齐的 fallback；空串交给 MeetingAgent 澄清
    answer = String(opts.fallback || "").trim();
  }
  return {
    answer,
    speakTail: answer,
    spokenPrefix: "",
    earlyCovered: false,
    arkMode,
    arkBillingOverdue,
    arkError,
    aborted: false
  };
}

module.exports = { speakViaChat, FAST_LLM_MS };
