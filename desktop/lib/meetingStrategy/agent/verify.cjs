/**
 * MeetingAgent Verify：答案是否贴合 intent。
 * 检查规则只读 knowledge/schema/intent-verify.json。
 */
const { arkChat } = require("../llm/transport.cjs");
const { isMoneyIntent } = require("./intent.cjs");
const { load } = require("../../knowledge/schemaStore.cjs");

function V() {
  return load().verify;
}

function localVerify(askText, intentObj, answer) {
  const text = String(answer || "");
  const intent = intentObj?.intent || "other";
  const mustNot = intentObj?.must_not || [];
  const fails = [];
  const cfg = V();

  for (const ban of mustNot) {
    if (ban && text.includes(ban)) fails.push(`must_not:${ban}`);
  }

  if (isMoneyIntent(intent) && new RegExp(cfg.moneyForbidAlternate).test(text)) {
    fails.push("money_intent_alternate_path");
  }
  if (isMoneyIntent(intent) && !new RegExp(cfg.moneyRequireStance).test(text)) {
    fails.push("money_missing_stance");
  }
  if (isMoneyIntent(intent) && !new RegExp(cfg.moneyRequireNumbers).test(text)) {
    fails.push("money_missing_numbers");
  }

  for (const row of cfg.checks || []) {
    if (row.intent !== intent) continue;
    if (row.forbid && new RegExp(row.forbid).test(text)) fails.push(row.fail);
    if (row.require && !new RegExp(row.require).test(text)) fails.push(row.fail);
  }

  if (new RegExp(cfg.promiseHard).test(text)) {
    fails.push("promise_blocked");
  } else if (new RegExp(cfg.promiseReturn).test(text) && !new RegExp(cfg.promiseReturnOk).test(text)) {
    fails.push("promise_blocked");
  } else if (new RegExp(cfg.promiseFull).test(text) && !new RegExp(cfg.promiseFullOk).test(text)) {
    fails.push("promise_blocked");
  }
  if (new RegExp(cfg.agendaMenu).test(text)) {
    fails.push("agenda_menu");
  }

  return {
    pass: fails.length === 0,
    reason: fails.join(",") || "ok",
    source: "local"
  };
}

async function verifyAnswer(askText, intentObj, answer, opts = {}) {
  const local = localVerify(askText, intentObj, answer);
  if (!local.pass) return local;

  const apiKey = (process.env.DOUBAO_API_KEY || process.env.ARK_API_KEY || "").trim();
  if (!apiKey || opts.skipLlm || opts.forceRule) return local;

  const intent = intentObj?.intent || "";
  if (!isMoneyIntent(intent) && intent !== "profit_how") return local;

  try {
    const res = await arkChat(
      V().llmSystem,
      `意图:${intent}\n必须回答:${intentObj.must_answer || askText}\n禁止:${(intentObj.must_not || []).join("、")}\n口播:${String(answer).slice(0, 200)}`,
      {
        fast: true,
        temperature: 0,
        timeoutMs: opts.timeoutMs != null ? opts.timeoutMs : 800,
        signal: opts.signal,
        maxTokens: 80
      }
    );
    if (res?.ok && res.content) {
      const m = String(res.content).match(/\{[\s\S]*\}/);
      if (m) {
        const j = JSON.parse(m[0]);
        if (j.pass === false) {
          return { pass: false, reason: String(j.reason || "llm_reject").slice(0, 80), source: "llm" };
        }
      }
    }
  } catch (_) {
    /* keep local pass */
  }
  return local;
}

/** 只有承诺、换路径、议程菜单才用固定稿覆盖豆包。缺锚点不算。 */
function isRiskRewrite(reason) {
  return /promise_blocked|alternate_path|agenda_menu|wrong_template|wrong_path|sample_opener|must_not:/.test(
    String(reason || "")
  );
}

module.exports = { localVerify, verifyAnswer, isRiskRewrite };
