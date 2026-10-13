/** Wiki Lint */
const fs = require("fs");
const path = require("path");
const { knowledgeReadRoot } = require("../../platform/appPaths.cjs");
const { listConceptPages } = require("./catalog.cjs");

function lintWiki() {
  const pages = listConceptPages();
  const slugs = new Set(pages.map((p) => p.slug));
  const issues = [];

  const numberClaims = [];
  for (const p of pages) {
    if (!p.speak || p.speak.length < 8) {
      issues.push({ level: "warn", type: "missing_speak", slug: p.slug, detail: "缺少口播" });
    }
    if (!p.facts || p.facts.length < 20) {
      issues.push({ level: "warn", type: "missing_facts", slug: p.slug, detail: "事实段过短" });
    }
    if (!p.bounds) {
      issues.push({ level: "info", type: "missing_bounds", slug: p.slug, detail: "缺少边界" });
    }
    for (const rel of p.related || []) {
      if (!slugs.has(rel)) {
        issues.push({
          level: "warn",
          type: "broken_link",
          slug: p.slug,
          detail: `相关页不存在: ${rel}`
        });
      }
    }
    const nums = (p.facts + " " + p.speak).match(
      /\d[\d,]*(?:\.\d+)?(?:\s*万)?|\d+\s*%|1\.3\s*倍|150\s*[—\-～~到至]\s*500/g
    );
    if (nums) {
      for (const n of nums) {
        numberClaims.push({ slug: p.slug, num: n.replace(/\s+/g, "") });
      }
    }
  }

  // 入链
  const inbound = new Map([...slugs].map((s) => [s, 0]));
  for (const p of pages) {
    for (const rel of p.related || []) {
      if (inbound.has(rel)) inbound.set(rel, (inbound.get(rel) || 0) + 1);
    }
  }
  for (const [slug, n] of inbound) {
    if (n === 0 && !/quan-yuan-meiyu|apply-project/.test(slug)) {
      issues.push({ level: "info", type: "orphan", slug, detail: "无入链" });
    }
  }

  // 关键数字一致性抽检（同一数字应出现在相关页合理范围；冲突靠人工看 facts）
  const critical = [
    { key: "39000", pages: ["revenue-guarantee", "ledger-1-service-radius", "quan-yuan-meiyu"] },
    { key: "1.3", pages: ["benefit-08-account-space", "ledger-1-service-radius"] },
    { key: "25", pages: ["benefit-04-feijiao"] },
    { key: "150", pages: ["ledger-2-premium", "one-garden-two-systems"] }
  ];
  for (const c of critical) {
    for (const slug of c.pages) {
      const p = pages.find((x) => x.slug === slug);
      if (!p) {
        issues.push({ level: "error", type: "missing_page", slug, detail: `关键页缺失` });
        continue;
      }
      const blob = p.facts + p.speak;
      if (!blob.includes(c.key) && !(c.key === "39000" && /3\s*万\s*9|39,000/.test(blob))) {
        issues.push({
          level: "warn",
          type: "number_gap",
          slug,
          detail: `关键数字 ${c.key} 未在事实/口播出现`
        });
      }
    }
  }

  // FAQ 与口播一致性：抽样读 faq
  let faqRaw = "";
  try {
    faqRaw = fs.readFileSync(path.join(knowledgeReadRoot(), "faq-meeting.txt"), "utf8");
  } catch (_) {}
  if (faqRaw && /测完就能招生翻倍|每月一场成果展|必须向每个家庭收\s*250/.test(faqRaw)) {
    issues.push({
      level: "error",
      type: "faq_violation",
      slug: "faq-meeting",
      detail: "FAQ 含边界禁止表述"
    });
  }

  return {
    ok: !issues.some((i) => i.level === "error"),
    pageCount: pages.length,
    issues,
    numberClaims: numberClaims.slice(0, 80)
  };
}

module.exports = { lintWiki };
