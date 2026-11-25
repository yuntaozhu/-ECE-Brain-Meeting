"use strict";

const fs = require("fs");
const path = require("path");
const { knowledgeRoot, ensureDir } = require("../knowledge/paths.cjs");
const { normalizeText } = require("../knowledge/parse.cjs");

function pestDir() {
  return path.join(knowledgeRoot(), "market", "alerts");
}

function seedPestFile() {
  return path.join(knowledgeRoot(), "market", "seed-pest-alerts.json");
}

function loadPestAlerts() {
  const out = [];
  const seed = seedPestFile();
  if (fs.existsSync(seed)) {
    try {
      out.push(...JSON.parse(fs.readFileSync(seed, "utf8")));
    } catch (_) {}
  }
  ensureDir(pestDir());
  for (const f of fs.readdirSync(pestDir()).filter((x) => x.endsWith(".jsonl"))) {
    const raw = fs.readFileSync(path.join(pestDir(), f), "utf8");
    for (const line of raw.split(/\r?\n/)) {
      if (!line.trim()) continue;
      try {
        out.push(JSON.parse(line));
      } catch (_) {}
    }
  }
  return out;
}

function speakPest(a) {
  const { speakSource } = require("./sourceLabel.cjs");
  const crops = (a.crop_affected || []).join("、") || "相关作物";
  const cities = (a.affected_cities || []).join("、") || "部分产区";
  return (
    `${a.publish_date} ${a.province}${a.alert_level ? "（" + a.alert_level + "）" : ""}：` +
    `${crops}关注${a.pest_or_disease}，影响窗口${a.impact_window || "近期"}，波及${cities}。` +
    `${a.supply_risk_summary || ""}${speakSource({
      source_url: a.source_url,
      source_id: a.source_id,
      market_or_region: a.province
    })}`
  );
}

const PEST_CUES = /病虫|灰霉|晚疫|条锈|预警|测报|植保|疫情|供给风险/;

function looksLikePestQuery(q) {
  return PEST_CUES.test(String(q || ""));
}

function matchPestAlert(query, opts = {}) {
  const q = String(query || "").trim();
  if (!q) return null;
  if (!opts.force && !looksLikePestQuery(q)) return null;
  const qn = normalizeText(q);
  const alerts = loadPestAlerts();
  let best = null;
  for (const a of alerts) {
    let score = 0;
    const hay = normalizeText(
      [a.province, a.pest_or_disease, ...(a.crop_affected || []), ...(a.affected_cities || []), a.supply_risk_summary]
        .join("")
    );
    if (/草莓/.test(qn) && /草莓/.test(hay)) score += 15;
    if (/番茄|西红柿/.test(qn) && /番茄|西红柿/.test(hay)) score += 12;
    if (/灰霉/.test(qn) && /灰霉/.test(hay)) score += 20;
    if (/白粉/.test(qn) && /白粉/.test(hay)) score += 20;
    if (/炭疽/.test(qn) && /炭疽/.test(hay)) score += 18;
    if (/蚜虫/.test(qn) && /蚜虫/.test(hay)) score += 16;
    if (/晚疫/.test(qn) && /晚疫/.test(hay)) score += 20;
    if (/山东/.test(qn) && /山东/.test(hay)) score += 10;
    if (/河南/.test(qn) && /河南/.test(hay)) score += 10;
    if (/四川|川西|双流/.test(qn) && /四川|双流|郫都|邛崃/.test(hay)) score += 10;
    if (/广东|粤/.test(qn) && /广东|湛江|茂名|惠州/.test(hay)) score += 10;
    if (/陕西|关中/.test(qn) && /陕西|西安|渭南|宝鸡/.test(hay)) score += 10;
    if (/病虫|预警|测报/.test(qn)) score += 6;
    for (let i = 0; i + 2 <= qn.length; i++) {
      if (hay.includes(qn.slice(i, i + 2))) score += 1;
    }
    if (!best || score > best.score) best = { alert: a, score };
  }
  if (!best || best.score < (opts.minScore || 12)) return null;
  const reply = speakPest(best.alert);
  const { sourceLabel } = require("./sourceLabel.cjs");
  const label = sourceLabel({
    source_url: best.alert.source_url,
    source_id: best.alert.source_id,
    market_or_region: best.alert.province
  });
  return {
    ok: true,
    layer: "pest",
    reply,
    alert: best.alert,
    score: best.score,
    source_label: label,
    sources: [label, best.alert.source_url, best.alert.province].filter(Boolean),
    moreQuestions: [
      "山东草莓灰霉病风险如何",
      "河南番茄晚疫病预警",
      "新发地草莓多少钱"
    ]
  };
}

module.exports = {
  loadPestAlerts,
  matchPestAlert,
  looksLikePestQuery,
  speakPest
};
