/**
 * 策略巡检 IPC：跑会议分析、播报、开场/会末副作用。
 * 可变状态经 rt 读写，与 main 的 let 同一份。
 */
const { runMeetingAnalysis, DEFAULT_AGENDA } = require("../lib/meetingStrategy");
const { warmIndexFromDisk } = require("../lib/knowledge");
const { debugLog } = require("../lib/platform");
const {
  PHASE,
  looksLikeHostEcho,
  isIntroSelfTalk,
  stripIntroBoilerplate,
  WAKE_COOLDOWN_MS
} = require("../lib/duplex");
const {
  MODE_LABEL,
  MEETING_LIFE,
  LIFE_LABEL,
  createMeetingSession,
  deriveMeetingLife,
  setLifecycle
} = require("../lib/meetingSession");
const { appendSession, clearMeetingCache } = require("../lib/runtime");

function createStrategyEvaluate(rt) {
  return async function handleStrategyEvaluate(_e, payload) {
    const transcript = payload?.transcript || "";
    const agenda = payload?.agenda || DEFAULT_AGENDA;
    const phase = rt.listen?.phase || PHASE.IDLE;
    const emitUi = (msg) => {
      if (rt.win && !rt.win.isDestroyed()) rt.win.webContents.send("bridge:event", msg);
    };
    const speakSoft = (text, tag) => {
      const t = stripIntroBoilerplate(String(text || "").trim());
      if (!t || !rt.listen?.isOpen()) return { ok: false };
      debugLog.info("Strategy", tag || "软播报", { text: t.slice(0, 80) });
      const res = rt.listen.speakText(t);
      if (res?.ok || res?.queued) {
        rt.lastHostSpeakAt = Date.now();
        rt.lastHostSpeakText = t;
      }
      return res;
    };
    if (!rt.meetingState) {
      rt.meetingState = createMeetingSession(`mtg_${Date.now()}`);
    }
    // P1：主进程打断缓冲同步进 rt.meetingState，供 CONTINUE 续播
    if (rt.listen?.interruptBuffer?.fullText) {
      rt.meetingState.interruptBuffer = { ...rt.listen.interruptBuffer };
      if (!rt.meetingState.lastInterruptedText) {
        rt.meetingState.lastInterruptedText = rt.listen.interruptBuffer.fullText.slice(0, 800);
      }
    }
    // 新一轮巡检取消上一轮未完成的 Chat（减停听后仍出答 / cancel 风暴）
    if (rt.strategyAbort) {
      try {
        rt.strategyAbort.abort();
      } catch (_) {}
    }
    rt.strategyAbort = new AbortController();
    const thisAbort = rt.strategyAbort;
    const policyOpts = {
      phase,
      listenStartedAt: rt.listen?.listenStartedAt || rt.listenStartedAt || 0,
      lastHostSpeakAt: rt.lastHostSpeakAt,
      lastHostSpeakText: rt.lastHostSpeakText,
      quietMs: payload?.quietMs,
      lastQuestionFp: rt.lastQuestionFp,
      lastQuestionAt: rt.lastQuestionAt,
      // context 认 agentState || meetingState；两处都挂上避免漏传
      agentState: rt.meetingState,
      meetingState: rt.meetingState,
      trigger: payload?.reason || payload?.trigger || "manual",
      signal: thisAbort.signal,
      interruptChunks: rt.listen?.interruptBuffer?.chunks || 0,
      onStatus: (st) => emitUi({ type: "strategy-status", ...st }),
      // P0：思考占位仅 UI，不走 TTS（避免双次触发 / cancel 风暴 / 拆段播报）
      onThinking: (text) => {
        emitUi({ type: "strategy-thinking", text });
      },
      // 听清后立刻播短句；后文在这句播放时生成，说完由排队接上
      onEarlySpeak: (text) => {
        const res = speakSoft(text, "先开口播");
        if ((res?.ok || res?.queued) && rt.meetingState) {
          appendSession(rt.meetingState.meetingId, {
            speaker: "大智",
            text: String(text || "").slice(0, 200),
            mode: rt.meetingState.mode,
            segmentId: rt.meetingState.segmentId
          });
        }
        return res;
      }
    };
    debugLog.info("Strategy", "开始巡检", {
      agenda,
      phase,
      agentMode: rt.meetingState.mode,
      trigger: policyOpts.trigger,
      transcriptChars: transcript.length,
      transcriptPreview: transcript.slice(-240),
      policyOpts: {
        phase: policyOpts.phase,
        listenStartedAt: policyOpts.listenStartedAt,
        lastHostSpeakAt: policyOpts.lastHostSpeakAt,
        quietMs: policyOpts.quietMs,
        lastQuestionFp: policyOpts.lastQuestionFp,
        lastQuestionAt: policyOpts.lastQuestionAt,
        sinceHostMs: rt.lastHostSpeakAt ? Date.now() - rt.lastHostSpeakAt : null,
        lastHostPreview: rt.lastHostSpeakText.slice(0, 60)
      }
    });
    try {
      const result = await runMeetingAnalysis(transcript, agenda, policyOpts);
      emitUi({ type: "strategy-status", phase: "idle" });
      rt.emitInteractionMode();
      debugLog.info("Strategy", "巡检完成", {
        shouldIntervene: result.shouldIntervene,
        reason: result.reason,
        agentMode: result.agentMode || rt.meetingState.mode,
        interventionText: result.interventionText,
        fullAnswer: result.fullAnswer?.slice?.(0, 80),
        spokenPrefix: result.spokenPrefix?.slice?.(0, 40),
        earlyCovered: result.earlyCovered,
        arkMode: result.arkMode,
        arkBillingOverdue: result.arkBillingOverdue,
        questionFp: result.questionFp,
        silenceGate: result.silenceGate,
        wake: result.wake,
        todos: result.latestToDos?.length,
        a2a: result.a2aTrace?.map((e) => `${e.sender}->${e.target}:${e.action}`),
        // P1 可观测：对照「再说具体一点 / 定义粘滞」
        faqScore: result.faqScore,
        retrievalTitle: result.retrievalTitle,
        fallbackGate: result.fallbackGate,
        composeMs: result.composeMs
      });

      if (result.reason === "ABORTED" || thisAbort.signal.aborted) {
        debugLog.info("Strategy", "巡检已取消（停听会或新巡检）", { reason: result.reason });
        return {
          ok: true,
          result,
          speakResult: { ok: false, aborted: true },
          duplex: {
            phase: rt.listen?.phase || PHASE.IDLE,
            holdUntil: rt.listen?.holdUntil || 0,
            cooldownUntil: rt.listen?.cooldownUntil || 0
          },
          agent: {
            mode: rt.meetingState?.mode || null,
            label: rt.meetingState ? MODE_LABEL[rt.meetingState.mode] : null,
            meetingId: rt.meetingState?.meetingId || null,
            segmentId: rt.meetingState?.segmentId || null
          }
        };
      }

      if (result.arkBillingOverdue) {
        debugLog.error("Strategy", "Ark 账号欠费/过期，已走启发式控场", {
          hint: "请到火山方舟控制台充值或换可用 Key（ARK_API_KEY / DOUBAO_API_KEY）"
        });
        emitUi({
          type: "ark-billing",
          overdue: true,
          message: result.arkError || "AccountOverdueError"
        });
      }

      // 仅首句已播完且无尾巴：更新指纹，不再二次 TTS
      if (result.earlyCovered && !result.interventionText && result.questionFp) {
        rt.lastQuestionFp = result.questionFp;
        rt.lastQuestionAt = Date.now();
        if (result.fullAnswer) rt.lastHostSpeakText = result.fullAnswer;
      }

      let speakResult = null;
      if (result.interruptTts && rt.listen) {
        speakResult = rt.listen.interruptSpeak(result.reason || "INTERRUPT");
        if (rt.meetingState && rt.listen.interruptBuffer?.fullText) {
          rt.meetingState.lastInterruptedText = rt.listen.interruptBuffer.fullText.slice(0, 800);
          rt.meetingState.interruptBuffer = { ...rt.listen.interruptBuffer };
        }
        debugLog.info("Strategy", "已打断当前播报", { reason: result.reason });
      }
      if (result.reason === "CONTINUE" && rt.listen) {
        rt.listen.interruptBuffer = null;
      }
      // 防御：先开口已播完全文（或尾巴与已播相同）时清空，避免同一句再排队
      if (result.earlySpoken && result.interventionText) {
        const spoken = stripIntroBoilerplate(String(result.spokenPrefix || ""));
        const planned = stripIntroBoilerplate(String(result.interventionText || ""));
        const full = stripIntroBoilerplate(String(result.fullAnswer || ""));
        const spokeWhole = Boolean(spoken && full && (spoken === full || spoken.length >= full.length - 2));
        if (!planned || planned === spoken || (spokeWhole && (planned === full || planned === spoken))) {
          result.interventionText = "";
          result.earlyCovered = true;
        }
      }
      if (result.shouldIntervene && result.interventionText && rt.listen) {
        let text = stripIntroBoilerplate(result.interventionText);
        result.interventionText = text;
        // 展示用全文（含已提前播的首句）
        if (result.fullAnswer) result.displayText = result.fullAnswer;
        const since = Date.now() - rt.lastHostSpeakAt;
        const echoHit = looksLikeHostEcho(text, [rt.lastHostSpeakText].filter(Boolean), {
          sinceHostMs: since
        });

        if (rt.listen.phase === PHASE.SPEAKING || rt.listen.expectingSpeak) {
          const canQueue = [
            "WAKE_ANSWER",
            "BIZ_ANSWER",
            "SUMMARY",
            "WAKE_ACK",
            "STEER",
            "SUMMARY_ASK",
            "STOP",
            "CONTINUE_HH",
            "CONTINUE",
            "MEETING_START",
            "MEETING_END",
            "MODE_PAUSE",
            "MODE_RESUME"
          ].includes(result.reason);
          if (canQueue) {
            debugLog.info("Strategy", "播报中，话术排队", {
              reason: result.reason,
              text: text.slice(0, 60)
            });
            speakResult = rt.listen.speakText(text);
            if (speakResult?.ok || speakResult?.queued) {
              rt.lastHostSpeakAt = Date.now();
              rt.lastHostSpeakText = result.fullAnswer || text;
              if (result.questionFp) {
                rt.lastQuestionFp = result.questionFp;
                rt.lastQuestionAt = Date.now();
              }
              if (rt.meetingState && !(result.earlySpoken && text === (result.fullAnswer || text))) {
                appendSession(rt.meetingState.meetingId, {
                  speaker: "大智",
                  text: result.earlySpoken ? text : result.fullAnswer || text,
                  mode: rt.meetingState.mode,
                  segmentId: rt.meetingState.segmentId
                });
              }
            }
          } else {
            debugLog.warn("Strategy", "半双工 SPEAKING 跳过非唤起播报", {
              phase: rt.listen.phase,
              reason: result.reason,
              text: text.slice(0, 60)
            });
            speakResult = { ok: false, error: "half_duplex_hold", suppressed: true };
            result.suppressed = true;
          }
        } else if (rt.listen.isInHold() && result.reason === "SILENCE") {
          debugLog.warn("Strategy", "回灌 hold 内跳过冷场", {
            reason: result.reason,
            text: text.slice(0, 60)
          });
          speakResult = { ok: false, error: "half_duplex_hold", suppressed: true };
          result.suppressed = true;
        } else if (rt.listen.isInCooldown() && result.reason === "SILENCE") {
          debugLog.warn("Strategy", "COOLDOWN 内跳过冷场插话", {
            reason: result.reason,
            text: text.slice(0, 60)
          });
          speakResult = { ok: false, error: "cooldown", suppressed: true };
          result.suppressed = true;
        } else if (
          (result.reason === "WAKE_ANSWER" ||
            result.reason === "BIZ_ANSWER" ||
            result.reason === "SUMMARY") &&
          since < WAKE_COOLDOWN_MS &&
          (echoHit.echo || isIntroSelfTalk(text)) &&
          !result.earlyCovered &&
          // FAQ/缓存新答常含「四端/全园美语」，faq-theme 会误杀；lcs/复读仍抑制
          !(
            result.reason === "WAKE_ANSWER" &&
            (result.arkMode === "faq" || result.arkMode === "cache") &&
            echoHit?.reason === "faq-theme"
          )
        ) {
          debugLog.warn("Strategy", "抑制重复自语/回灌唤起", {
            reason: result.reason,
            sinceMs: since,
            echo: echoHit,
            text: text.slice(0, 80)
          });
          speakResult = { ok: false, error: "echo_suppressed", suppressed: true };
          result.suppressed = true;
        } else if (!rt.listen.isOpen()) {
          debugLog.warn("Strategy", "需要发言但 Duplex 未连接，跳过 TTS", {
            text: text.slice(0, 80)
          });
          speakResult = { ok: false, error: "not_open" };
        } else {
          if (rt.listen.expectingSpeak) {
            debugLog.info("Strategy", "Host 正在播报，干预话术排队", {
              text: text.slice(0, 80)
            });
          }
          speakResult = rt.listen.speakText(text);
          if (speakResult?.ok || speakResult?.queued) {
            rt.lastHostSpeakAt = Date.now();
            rt.lastHostSpeakText = result.fullAnswer || text;
            if (result.questionFp) {
              rt.lastQuestionFp = result.questionFp;
              rt.lastQuestionAt = Date.now();
            }
            if (rt.meetingState && !(result.earlySpoken && !text)) {
              appendSession(rt.meetingState.meetingId, {
                speaker: "大智",
                text: result.earlySpoken ? text : result.fullAnswer || text,
                mode: rt.meetingState.mode,
                segmentId: rt.meetingState.segmentId
              });
            }
          }
          debugLog.info("Strategy", "触发 Host 语音进虚拟麦", {
            text,
            listenOpen: true,
            speakRes: speakResult,
            phase: rt.listen.phase
          });
        }
      } else if (result.shouldIntervene && result.earlyCovered && !result.interventionText) {
        speakResult = { ok: true, earlyOnly: true };
        if (rt.meetingState && result.fullAnswer && !result.earlySpoken) {
          appendSession(rt.meetingState.meetingId, {
            speaker: "大智",
            text: result.fullAnswer,
            mode: rt.meetingState.mode,
            segmentId: rt.meetingState.segmentId
          });
        }
      } else if (result.shouldIntervene && !rt.listen) {
        debugLog.warn("Strategy", "需要干预但听会通道未启动，无法 TTS（请先点启动听会）");
        speakResult = { ok: false, error: "listen_not_started" };
      } else if (result.shouldIntervene && rt.listen && !rt.listen.isOpen()) {
        debugLog.warn("Strategy", "需要干预但 Duplex 未连接，等待重连后再试播");
        speakResult = { ok: false, error: "not_open" };
      }

      if (result.bizPlan?.steps?.length) {
        emitUi({
          type: "biz-plan",
          tts: result.bizPlan.tts,
          analysis: result.bizPlan.analysis || "",
          steps: result.bizPlan.steps,
          risks: result.bizPlan.risks || [],
          cite: result.bizPlan.cite || [],
          tier: result.bizTier || null,
          arkMode: result.arkMode || null,
          reason: result.reason
        });
      }

      // P2：会议开始 — 清主上下文 + warm 知识库；开场白后生命周期 → SILENT
      if (result.clearMainContext || result.reason === "MEETING_START") {
        rt.clearMainSpeakContext();
        if (rt.listen?.interruptBuffer) rt.listen.interruptBuffer = null;
        try {
          if (rt.meetingState?.meetingId) clearMeetingCache(rt.meetingState.meetingId);
        } catch (_) {}
      }
      if (result.warmKnowledge) {
        try {
          warmIndexFromDisk();
          debugLog.info("Strategy", "会议开始：已 warm 知识索引");
        } catch (err) {
          debugLog.warn("Strategy", "warm 知识索引失败", { error: String(err?.message || err) });
        }
      }
      if (result.reason === "MEETING_START" && rt.meetingState) {
        // 开场白播完后标静默（短延迟，避免 UI 闪「未开会」）
        setTimeout(() => {
          if (rt.meetingState && rt.meetingState.lifecycle === MEETING_LIFE.OPENING) {
            setLifecycle(rt.meetingState, MEETING_LIFE.SILENT);
            rt.emitInteractionMode();
          }
        }, Math.min(12000, Math.max(3500, String(result.interventionText || "").length * 180)));
      }

      // P2：会议结束 — 沉淀 + 收尾后关 Duplex
      if (result.requestSessionPromote && result.meetingId) {
        const promoteDelay = result.requestListenStop ? 2500 : 400;
        setTimeout(() => rt.promoteMeetingSession(result.meetingId, { summary: true }), promoteDelay);
      }
      if (result.requestListenStop) {
        const closeMs = Math.min(
          22000,
          Math.max(6000, String(result.interventionText || result.fullAnswer || "").length * 200 + 2500)
        );
        const closingId = result.meetingId || rt.meetingState?.meetingId;
        debugLog.info("Strategy", "会末收尾后将停止听会", { closeMs, meetingId: closingId });
        emitUi({
          type: "meeting-closing",
          meetingId: closingId,
          closeInMs: closeMs,
          summaryMarkdown: result.summaryMarkdown || null,
          closing: result.closing || null
        });
        setTimeout(() => {
          debugLog.info("Listen", "会末自动停止听会", { meetingId: closingId });
          if (rt.strategyAbort) {
            try {
              rt.strategyAbort.abort();
            } catch (_) {}
            rt.strategyAbort = null;
          }
          rt.listen?.close();
          rt.listen = null;
          rt.listenStartedAt = 0;
          if (rt.meetingState) {
            setLifecycle(rt.meetingState, MEETING_LIFE.OFF);
            rt.meetingState.meetingOpen = false;
          }
          emitUi({ type: "meeting-ended", meetingId: closingId });
          rt.emitInteractionMode();
          rt.meetingState = null;
        }, closeMs);
      }

      rt.emitInteractionMode();

      const life = deriveMeetingLife(rt.meetingState, {
        holdListening: Boolean(result.holdToEnd || rt.meetingState?.holdToEnd)
      });
      return {
        ok: true,
        result,
        speakResult,
        duplex: {
          phase: rt.listen?.phase || PHASE.IDLE,
          holdUntil: rt.listen?.holdUntil || 0,
          cooldownUntil: rt.listen?.cooldownUntil || 0
        },
        agent: {
          mode: rt.meetingState?.mode || null,
          label: rt.meetingState ? MODE_LABEL[rt.meetingState.mode] : null,
          lifecycle: result.meetingLifecycle || life,
          lifeLabel: LIFE_LABEL[result.meetingLifecycle || life] || life,
          meetingId: rt.meetingState?.meetingId || result.meetingId || null,
          segmentId: rt.meetingState?.segmentId || null,
          meetingOpen: Boolean(rt.meetingState?.meetingOpen)
        }
      };
    } catch (err) {
      emitUi({ type: "strategy-status", phase: "idle" });
      debugLog.error("Strategy", "巡检异常", debugLog.normalizeError(err));
      return { ok: false, error: String(err?.message || err) };
    } finally {
      if (rt.strategyAbort === thisAbort) rt.strategyAbort = null;
    }
  };
}

module.exports = { createStrategyEvaluate };
