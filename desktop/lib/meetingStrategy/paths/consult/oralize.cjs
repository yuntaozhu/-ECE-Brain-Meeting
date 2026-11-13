/**
 * Wave R9b：定卡后口播改写（channel=oralize）。
 * 证据已定 → 短句；支持首句先行 / abort 不覆盖业务槽为半成品。
 */
const S = require("./kit.cjs");
const { commitContentSpeak, DRAFT_STATES } = require("../../../intelligence/memory.cjs");

function hasDoubaoKey() {
  return Boolean(
    (process.env.LLM_API_KEY || process.env.DOUBAO_API_KEY || process.env.ARK_API_KEY || "").trim()
  );
}

/**
 * 按标点拆 lead + follow（无模型时也可首句先行）。
 * @param {string} text
 * @returns {{ lead: string, follow: string, full: string }}
 */
function splitLeadFollow(text) {
  const full = String(text || "").trim();
  if (!full) return { lead: "", follow: "", full: "" };
  const m = full.match(/^([\s\S]{6,90}?[。！？!?；;])([\s\S]*)$/);
  if (m) {
    return { lead: m[1].trim(), follow: String(m[2] || "").trim(), full };
  }
  if (full.length > 36) {
    return { lead: full.slice(0, 36).trim(), follow: full.slice(36).trim(), full };
  }
  return { lead: full, follow: "", full };
}

function negationOk(card, draft) {
  const neg = /不能|不要|不保证|没有写|不会|禁止/;
  if (neg.test(card) && !neg.test(draft)) return false;
  return true;
}

function numberBoundaryOk(card, draft) {
  const nums = String(card).match(/\d+(?:\.\d+)?/g) || [];
  if (!nums.length) return true;
  // 原稿数字若草稿全丢，回退（允许省略个别）
  const kept = nums.filter((n) => String(draft).includes(n));
  return kept.length >= Math.min(1, nums.length);
}

/**
 * @param {object} local playAnswer 结果（oralize:true）
 * @param {object} ctx
 */
async function oralizeCommitted(local, ctx) {
  if (!local || !local.oralize || !local.cardSpeak) return local;
  const ask = String(ctx.askText || ctx.lastFloor || "").trim();
  const card = String(local.cardSpeak || local.fullAnswer || "").trim();
  if (!card || card.length < 12) return local;

  const parentSignal = ctx.opts?.signal;
  if (parentSignal?.aborted) {
    return {
      ...local,
      draftState: DRAFT_STATES.INTERRUPTED,
      incomplete: true,
      oralize: false
    };
  }

  // forceRule / 无 Key：仍拆首句，便于 TTS 先播；不改写正文
  if (!hasDoubaoKey() || ctx.opts?.forceRule) {
    const parts = splitLeadFollow(
      S.stripIntroBoilerplate(S.clipUtterance(local.interventionText || card, 160))
    );
    if (parts.lead && ctx.opts?.onEarlySpeak) {
      try {
        S.emitLead(ctx.opts, S.leadClause(parts.lead, 72));
      } catch (_) {}
    }
    return {
      ...local,
      leadSentence: parts.lead,
      followUp: parts.follow,
      spokenPrefix: parts.lead || "",
      earlySpoken: Boolean(parts.lead && ctx.opts?.onEarlySpeak),
      oralize: false,
      draftState: DRAFT_STATES.COMMITTED
    };
  }

  const { arkChatStream, arkChat } = require("../../llm");
  const ac = new AbortController();
  const onParentAbort = () => ac.abort();
  if (parentSignal) parentSignal.addEventListener("abort", onParentAbort, { once: true });
  const timer = setTimeout(() => ac.abort(), 4500);

  let streamedLead = "";
  try {
    const user = S.speakFill("composeCard", {
      ask: ask.slice(0, 80) || "（无）",
      card: card.slice(0, 220)
    });
    const system = S.speakLine("oralizeSystem");
    if (!system) return { ...local, oralize: false };

    const chatOpts = {
      channel: "oralize",
      fast: true,
      disableThinking: true,
      temperature: 0.35,
      signal: ac.signal,
      timeoutMs: 4500,
      onClause: (clause) => {
        if (streamedLead || ac.signal.aborted) return;
        const lead = S.leadClause(clause, 72);
        if (!lead || lead.length < 8) return;
        streamedLead = S.emitLead(ctx.opts, lead) || lead;
      }
    };

    // 优先流式拿首句；失败回落非流式
    let res = await arkChatStream(system, user, chatOpts);
    if ((!res?.ok || !res.content) && !ac.signal.aborted) {
      res = await arkChat(system, user, { ...chatOpts, stream: false });
    }

    if (ac.signal.aborted || parentSignal?.aborted) {
      // 已先开口：保留 lead；不把半截 LLM 写入 content 槽（仍保留原稿 fullAnswer）
      if (streamedLead) {
        const rest = S.continuationAfter
          ? S.continuationAfter(card, streamedLead)
          : String(card || "")
              .slice(streamedLead.length)
              .replace(/^[，,；;。\s]+/, "");
        return {
          ...local,
          spokenPrefix: streamedLead,
          earlySpoken: true,
          leadSentence: streamedLead,
          followUp: rest || "",
          interventionText: rest || "",
          fullAnswer: card,
          arkMode: "compose-card-partial",
          oralize: false,
          draftState: DRAFT_STATES.INTERRUPTED,
          incomplete: true
        };
      }
      return {
        ...local,
        oralize: false,
        draftState: DRAFT_STATES.INTERRUPTED,
        incomplete: true
      };
    }

    const draft = S.stripIntroBoilerplate(S.clipUtterance(String(res?.content || ""), 140));
    if (!res?.ok || !draft || draft.length < 10) {
      const parts = splitLeadFollow(card);
      return {
        ...local,
        leadSentence: streamedLead || parts.lead,
        followUp: parts.follow,
        spokenPrefix: streamedLead || parts.lead || "",
        earlySpoken: Boolean(streamedLead),
        oralize: false,
        draftState: DRAFT_STATES.COMMITTED
      };
    }
    if (!negationOk(card, draft) || !numberBoundaryOk(card, draft)) {
      return { ...local, oralize: false, draftState: DRAFT_STATES.COMMITTED };
    }

    const parts = splitLeadFollow(draft);
    const lead = streamedLead || parts.lead;
    // 若首句已播，intervention 只送后续，避免整段重播
    let intervention = draft;
    if (streamedLead && draft.startsWith(streamedLead.slice(0, Math.min(12, streamedLead.length)))) {
      intervention = String(draft.slice(streamedLead.length) || parts.follow || "").replace(
        /^[，,；;。\s]+/,
        ""
      );
    }

    if (ctx.state) {
      commitContentSpeak(ctx.state, draft, { draftState: DRAFT_STATES.COMMITTED });
    }

    return {
      ...local,
      interventionText: intervention,
      fullAnswer: draft,
      leadSentence: lead,
      followUp: parts.follow,
      spokenPrefix: streamedLead || lead || "",
      earlySpoken: Boolean(streamedLead),
      arkMode: "compose-card",
      oralize: false,
      draftState: DRAFT_STATES.COMMITTED,
      incomplete: false
    };
  } catch (_) {
    return { ...local, oralize: false, draftState: DRAFT_STATES.COMMITTED };
  } finally {
    clearTimeout(timer);
    if (parentSignal) parentSignal.removeEventListener("abort", onParentAbort);
  }
}

module.exports = { oralizeCommitted, splitLeadFollow, negationOk, numberBoundaryOk };
