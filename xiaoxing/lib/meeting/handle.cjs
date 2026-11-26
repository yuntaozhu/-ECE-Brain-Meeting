"use strict";

const { classifyUtterance, loadCommands } = require("./commands.cjs");
const session = require("./session.cjs");
const { ask } = require("../ask/index.cjs");
const { correctAsrText } = require("../asr/correct.cjs");
const { suggestSilent, shouldSuggestForOthers, ingestPromptForUtterance } = require("./suggest.cjs");
const focus = require("./focus.cjs");

function runConsult(query, meta = {}) {
  const q = String(query || "").trim();
  focus.commitFocusAsk({ query: q, source: meta.source || "me" });
  session.appendLine({
    type: "focus_commit",
    query: q,
    source: meta.source || "me"
  });
  const result = ask(q, { session: true, writeGap: true });
  focus.markFocusAnswered({ layer: result.layer, reply: result.reply });
  session.appendLine({
    type: "consult_mark",
    action: "consult",
    query: q,
    layer: result.layer,
    reply: result.reply
  });
  return {
    ok: true,
    action: "consult",
    query: q,
    ask: result,
    focus: focus.getFocus(),
    meeting: session.getMeeting()
  };
}

/**
 * 处理会中一句转写（主路径：Me 唤醒/口令/提问；Others 只记转写）
 * @param {{ track: 'me'|'others', text: string, forceAsk?: boolean, speaker?: string, provider?: string, confirmed?: boolean }} input
 */
function handleMeetingUtterance(input = {}) {
  const track = input.track === "others" ? "others" : "me";
  const text = correctAsrText(String(input.text || "").trim());
  if (!text) return { ok: false, reason: "empty" };

  let mtg = session.getMeeting();
  if (!mtg) {
    session.startMeeting({});
    mtg = session.getMeeting();
  }

  const speaker = input.speaker ? String(input.speaker).trim() : track === "me" ? "me" : "others";
  session.appendLine({
    type: "transcript",
    track,
    text,
    speaker,
    provider: input.provider || "xiaoxing_local",
    // 模型/自动转写默认草稿；用户确认后可传 confirmed:true
    draft: input.confirmed === true ? false : true,
    confirmed: input.confirmed === true
  });

  if (track === "others") {
    const suggest =
      shouldSuggestForOthers(text) ? suggestSilent(text) : null;
    if (suggest) {
      session.appendLine({
        type: "suggest",
        track: "others",
        query: text,
        layer: suggest.layer,
        score: suggest.score,
        reply: suggest.reply
      });
    }
    const cfg = focus.loadFocusCfg();
    if (
      cfg.softCommitOthersSuggest !== false &&
      (suggest || shouldSuggestForOthers(text))
    ) {
      focus.commitFocusAsk({ query: text, source: "others" });
      session.appendLine({ type: "focus_commit", query: text, source: "others" });
    }
    const ingestPrompt = ingestPromptForUtterance(text);
    if (ingestPrompt) {
      session.appendLine({
        type: "ingest_prompt",
        track: "others",
        query: ingestPrompt.query,
        tip: ingestPrompt.tip
      });
    }
    return {
      ok: true,
      action: "log_others",
      meeting: session.getMeeting(),
      text,
      suggest: suggest || null,
      ingestPrompt: ingestPrompt || null,
      focus: focus.getFocus()
    };
  }

  const cfg = loadCommands();
  const half = cfg.halfDuplex || {};
  const speaking = Boolean(session.getMeeting()?.speaking);

  const cls = classifyUtterance(text);

  if (cls.kind === "meeting_start") {
    session.startMeeting({});
    return { ok: true, action: "meeting_start", meeting: session.getMeeting() };
  }
  if (cls.kind === "meeting_stop") {
    const stopped = session.stopMeeting();
    return { ok: true, action: "meeting_stop", meeting: stopped.meeting };
  }
  if (cls.kind === "interrupt") {
    session.setSpeaking(false);
    const reply =
      (cfg.hostReplies && cfg.hostReplies.interrupt) ||
      "好的，我先停下。需要时再叫小星。";
    session.appendLine({ type: "host_interrupt", text, reply });
    return {
      ok: true,
      action: "interrupt",
      reply,
      meeting: session.getMeeting(),
      focus: focus.getFocus(),
      meetingEventHint: "ai.interrupted"
    };
  }
  if (cls.kind === "next_agenda") {
    const reply =
      (cfg.hostReplies && cfg.hostReplies.nextAgenda) ||
      "请进入下一项议程；需要我答知识请直接叫小星。";
    session.appendLine({ type: "host_next_agenda", text, reply });
    return {
      ok: true,
      action: "next_agenda",
      reply,
      meeting: session.getMeeting(),
      focus: focus.getFocus()
    };
  }
  if (cls.kind === "host_wrap") {
    const reply =
      (cfg.hostReplies && cfg.hostReplies.wrap) ||
      "当前以听会与口令控场为主；详细摘要可会后生成。";
    session.appendLine({ type: "host_wrap", text, reply });
    return {
      ok: true,
      action: "host_wrap",
      reply,
      meeting: session.getMeeting(),
      focus: focus.getFocus()
    };
  }
  if (cls.kind === "sleep") {
    session.setArmed(false);
    return {
      ok: true,
      action: "sleep",
      reply: "好的，我继续旁听。需要时再叫小星。",
      meeting: session.getMeeting(),
      focus: focus.getFocus()
    };
  }

  // 回想 / 催答：不依赖武装（有 Focus 即可）
  if (focus.isRecall(text) || cls.kind === "recall") {
    const f = focus.getFocus();
    const reply = f?.query
      ? `你刚才问的是：${f.query}`
      : focus.honestNoFocus();
    session.appendLine({ type: "focus_recall", query: f?.query || null, reply });
    return {
      ok: true,
      action: "focus_recall",
      reply,
      focus: f,
      meeting: session.getMeeting()
    };
  }

  if (focus.isUrge(text) || cls.kind === "urge") {
    const f = focus.getFocus();
    if (!f?.query) {
      const reply = focus.honestNoFocus();
      return {
        ok: true,
        action: "focus_gap",
        reply,
        ask: { ok: true, layer: "meta", reply },
        meeting: session.getMeeting()
      };
    }
    if (speaking && half.ignoreConsultWhileSpeaking) {
      return {
        ok: true,
        action: "skipped_speaking",
        meeting: session.getMeeting(),
        focus: f
      };
    }
    focus.markFocusUrged();
    session.setArmed(true);
    return runConsult(f.query, { source: f.source || "me" });
  }

  if (cls.kind === "wake") {
    session.setArmed(true);
    if (speaking && half.ignoreConsultWhileSpeaking) {
      return {
        ok: true,
        action: "wake_deferred",
        meeting: session.getMeeting(),
        note: "播报中已武装，结束后可再问",
        focus: focus.getFocus()
      };
    }
    return runConsult(cls.body, { source: "me" });
  }

  // 普通 ask：武装后（听会默认武装=说完即问）或 forceAsk（Push）才进咨询
  const armed = Boolean(session.getMeeting()?.armed) || Boolean(input.forceAsk);
  if (!armed) {
    return {
      ok: true,
      action: "listen_only",
      meeting: session.getMeeting(),
      text,
      focus: focus.getFocus(),
      note: "旁听中：请说「小星…」或按住说话 / 提问并播报"
    };
  }
  if (speaking && half.ignoreConsultWhileSpeaking) {
    return {
      ok: true,
      action: "skipped_speaking",
      meeting: session.getMeeting(),
      focus: focus.getFocus()
    };
  }

  let body = cls.body || text;
  const glued = focus.maybeGlueFollowOn(body);
  if (glued) {
    session.appendLine({ type: "focus_glue", from: body, to: glued });
    body = glued;
  }
  return runConsult(body, { source: "me" });
}

module.exports = { handleMeetingUtterance };
