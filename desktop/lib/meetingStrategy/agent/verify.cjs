/**
 * MeetingAgent Verify：答案是否贴合 intent（本地硬检 + 可选豆包轻量复核）
 */
const { arkChat } = require("../llm/transport.cjs");
const { isMoneyIntent } = require("./intent.cjs");

function localVerify(askText, intentObj, answer) {
  const text = String(answer || "");
  const intent = intentObj?.intent || "other";
  const mustNot = intentObj?.must_not || [];
  const fails = [];

  for (const ban of mustNot) {
    if (ban && text.includes(ban)) fails.push(`must_not:${ban}`);
  }

  // 硬边界：亏损/回本题禁止「第二条路」，且必须有「不保证」类表态
  if (isMoneyIntent(intent) && /第二条路/.test(text)) {
    fails.push("money_intent_alternate_path");
  }
  if (isMoneyIntent(intent) && !/不保证|不包回本|不是承诺|测算非承诺|不必然亏/.test(text)) {
    fails.push("money_missing_stance");
  }
  if (isMoneyIntent(intent) && !/(一点八|1\.8|五点四|5\.4|三万九)/.test(text)) {
    fails.push("money_missing_numbers");
  }
  if (intent === "alternate_path" && !/第二条路|延时|非教|增量/.test(text)) {
    fails.push("alternate_missing_path");
  }
  if (intent === "how_calc" && !/(一点八|1\.8|五点四|5\.4|测算|乘)/.test(text)) {
    fails.push("how_calc_missing_numbers");
  }
  if (intent === "parent_reason" && !/(开口|测评|成果展|实拍)/.test(text)) {
    fails.push("parent_reason_missing_evidence");
  }
  if (intent === "profit_how" && /第二条路/.test(text)) {
    fails.push("profit_alternate_path");
  }
  if (intent === "profit_how" && /样板班开口实拍/.test(text)) {
    fails.push("profit_sample_opener");
  }
  if (intent === "profit_how" && !/三笔账|延时|招生|一点八/.test(text)) {
    fails.push("profit_missing_ledger");
  }
  if (intent === "hq_support" && !/课件|Teacher说|菲教|行事历/.test(text)) {
    fails.push("hq_missing_support");
  }
  if (intent === "hq_support" && /样板班开口实拍|第二条路/.test(text)) {
    fails.push("hq_wrong_template");
  }
  if (intent === "pricing_follow" && /第二条路|样板班开口实拍/.test(text)) {
    fails.push("pricing_wrong_path");
  }
  if (intent === "pricing_follow" && !/保住现有收费|加收|护盘/.test(text)) {
    fails.push("pricing_missing_hold");
  }
  if (/保证不亏|包赚|一定回本/.test(text)) {
    fails.push("promise_blocked");
  } else if (/保证回本/.test(text) && !/不保证回本/.test(text)) {
    fails.push("promise_blocked");
  } else if (/保证招满/.test(text) && !/不保证招满|不是保证招满/.test(text)) {
    fails.push("promise_blocked");
  }
  if (/今天主题是|您可以问全园美语是什么/.test(text)) {
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

  // 仅对 money / profit 做 LLM 复核，控制延迟
  const intent = intentObj?.intent || "";
  if (!isMoneyIntent(intent) && intent !== "profit_how") return local;

  try {
    const res = await arkChat(
      '判断口播是否回答了用户核心问题。只输出 JSON：{"pass":true|false,"reason":"短理由"}',
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
