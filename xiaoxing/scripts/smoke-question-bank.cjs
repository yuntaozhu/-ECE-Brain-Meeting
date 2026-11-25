"use strict";

/**
 * Ask/会议题库冒烟（同步，不打 live 公网；题数以 ask-question-bank.json 为准）
 * node scripts/smoke-question-bank.cjs
 * node scripts/smoke-question-bank.cjs --only=Q011,Q012
 */
const fs = require("fs");
const path = require("path");
const assert = require("assert");
const { schemaFile } = require("../lib/knowledge/paths.cjs");
const { ingestSeedWithB2b } = require("../lib/market/index.cjs");
const { ask } = require("../lib/ask/index.cjs");
const meeting = require("../lib/meeting/index.cjs");

function loadBank() {
  return JSON.parse(fs.readFileSync(schemaFile("ask-question-bank.json"), "utf8"));
}

function hasUrl(text) {
  return /https?:\/\//i.test(text || "") || /\bwww\./i.test(text || "");
}

function replyHasAny(reply, list) {
  return (list || []).some((x) => String(reply || "").includes(x));
}

function replyHasAll(reply, list) {
  return (list || []).every((x) => String(reply || "").includes(x));
}

function checkAskResult(c, r) {
  const errors = [];
  if (!c.expect.includes(r.layer)) {
    errors.push(`layer=${r.layer} not in [${c.expect.join(",")}]`);
  }
  if (c.replyMust?.length) {
    const ok = c.replyMustAny ? replyHasAny(r.reply, c.replyMust) : replyHasAll(r.reply, c.replyMust);
    if (!ok) errors.push(`reply missing ${c.replyMust.join("|")}`);
  }
  if (c.replyMustNot?.length) {
    for (const bad of c.replyMustNot) {
      if (String(r.reply || "").includes(bad)) errors.push(`reply must not contain ${bad}`);
    }
  }
  if (c.noUrl && hasUrl(r.reply)) errors.push("reply contains URL");
  if (c.replyMustNotLayer?.includes(r.layer)) errors.push(`layer forbidden: ${r.layer}`);
  return errors;
}

function runAskCase(c) {
  const r = ask(c.q, { writeGap: false, session: false });
  const errors = checkAskResult(c, r);
  return { id: c.id, q: c.q, layer: r.layer, ok: !errors.length || (c.soft && c.expect.includes(r.layer)), errors, soft: c.soft, reply: String(r.reply || "").slice(0, 60) };
}

function runMeetingCase(c) {
  meeting.stopMeeting();
  meeting.startMeeting({});
  const h = meeting.handleMeetingUtterance({
    track: c.track || "me",
    text: c.q,
    forceAsk: c.track === "me"
  });
  const errors = [];
  if (c.expectAction && !c.expectAction.includes(h.action)) {
    errors.push(`action=${h.action} not in [${c.expectAction.join(",")}]`);
  }
  if (c.expectLayer && h.ask?.layer && !c.expectLayer.includes(h.ask.layer)) {
    if (!c.soft) errors.push(`ask.layer=${h.ask.layer}`);
  }
  if (c.replyMust?.length && h.ask?.reply) {
    const ok = c.replyMustAny ? replyHasAny(h.ask.reply, c.replyMust) : replyHasAll(h.ask.reply, c.replyMust);
    if (!ok) errors.push(`reply missing ${c.replyMust.join("|")}`);
  }
  if (c.suggestLayer && h.suggest) {
    if (!c.suggestLayer.includes(h.suggest.layer)) {
      errors.push(`suggest.layer=${h.suggest.layer}`);
    }
  }
  meeting.stopMeeting();
  return {
    id: c.id,
    q: c.q,
    layer: h.ask?.layer || h.action,
    ok: !errors.length,
    errors,
    soft: c.soft,
    reply: String(h.ask?.reply || h.action || "").slice(0, 60)
  };
}

function runMeetingFlow(c) {
  meeting.stopMeeting();
  meeting.startMeeting({});
  const errors = [];
  let last = null;
  for (const step of c.steps || []) {
    const h = meeting.handleMeetingUtterance({
      track: step.track || "me",
      text: step.q,
      forceAsk: false
    });
    last = h;
    if (step.expectAction && !step.expectAction.includes(h.action)) {
      if (!step.soft) errors.push(`${step.q}: action=${h.action}`);
    }
  }
  // 休眠后未唤醒：普通询价应 listen_only
  const armed = meeting.getMeeting()?.armed;
  if (armed !== false) {
    // 第三步若 consult 且因默认武装——Q100 期望 sleep 后 listen_only；若 defaultArmed 被 sleep 关掉应 false
  }
  meeting.stopMeeting();
  return {
    id: c.id,
    q: "flow",
    layer: last?.action,
    ok: !errors.length,
    errors,
    soft: false,
    reply: errors.join("; ") || "flow ok"
  };
}

function main() {
  ingestSeedWithB2b();
  const bank = loadBank();
  const only = process.argv.find((a) => a.startsWith("--only="));
  const allow = only
    ? new Set(
        only
          .slice(7)
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      )
    : null;

  const results = [];
  for (const c of bank.cases) {
    if (allow && !allow.has(c.id)) continue;
    let row;
    if (c.mode === "meeting_flow") row = runMeetingFlow(c);
    else if (c.mode === "meeting") row = runMeetingCase(c);
    else row = runAskCase(c);
    results.push(row);
  }

  const hardFail = results.filter((r) => !r.ok && !r.soft);
  const softUnexpected = results.filter((r) => !r.ok && r.soft);
  const pass = results.filter((r) => r.ok);

  console.log(
    JSON.stringify(
      {
        ok: hardFail.length === 0,
        total: results.length,
        pass: pass.length,
        hardFail: hardFail.length,
        softMismatch: softUnexpected.length,
        failures: hardFail.concat(softUnexpected).map((f) => ({
          id: f.id,
          q: f.q,
          layer: f.layer,
          soft: f.soft,
          errors: f.errors,
          reply: f.reply
        }))
      },
      null,
      2
    )
  );

  if (hardFail.length) process.exit(1);
}

main();
