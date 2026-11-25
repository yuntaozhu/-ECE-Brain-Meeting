/**
 * 会前行业动态 briefing：白名单公开页 → 标题/摘要卡片（禁规程全文）
 */
"use strict";

const fs = require("fs");
const path = require("path");
const {
  schemaFile,
  rawBriefingDir,
  rawBriefingSnapshotsDir,
  rawBucketDir,
  ensureDir
} = require("../knowledge/paths.cjs");

function loadCrawlSources() {
  return JSON.parse(fs.readFileSync(schemaFile("crawl-sources.json"), "utf8"));
}

function listBriefingSources() {
  const cfg = loadCrawlSources();
  return (cfg.sources || []).filter((s) => (s.bucket || "") === "briefing");
}

/** 浏览器升级页 / 站点导航壳，不当会前动态 */
function isHeadlineNoise(t) {
  return /浏览器|Chrome|Firefox|Safari|Edge|QQ浏览器|360极速|不支持您所使用|点击图标|关闭提示|edge新Edge|院内风景|新时代农科精神|管理服务部门|专业所农区所|信息化办公平台|网站首页|学会介绍|组织机构|联系我们|工作动态\s*更多|更多>|Toggle navigation/i.test(
    t
  );
}

function extractHeadlines(md, limit = 8) {
  const text = String(md || "").replace(/\r\n/g, "\n");
  const out = [];
  const seen = new Set();
  const push = (s) => {
    let t = String(s || "")
      .replace(/^#+\s*/, "")
      .replace(/^\*+\s*/, "")
      .replace(/^[-•]\s*/, "")
      .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1")
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .replace(/\\+/g, "")
      .replace(/&nbsp;|&#\d+;|&amp;/gi, " ")
      .replace(/\s+/g, " ")
      .trim();
    // 去掉行尾残缺标点/转义
    t = t.replace(/[\\/|]+$/g, "").trim();
    if (t.length < 6 || t.length > 80) return;
    if (/^RAW|source_id|fetched_at|url:|tags:|---|DOCTYPE|function\s|var\s|{|}/i.test(t)) return;
    if (isHeadlineNoise(t)) return;
    if (!/[\u4e00-\u9fff]/.test(t)) return;
    const key = t.slice(0, 40);
    if (seen.has(key)) return;
    seen.add(key);
    out.push(t);
  };
  for (const line of text.split("\n")) {
    if (/^#{1,3}\s+\S/.test(line)) push(line);
    else if (/^[-*]\s+\S/.test(line) && /[\u4e00-\u9fff]/.test(line)) push(line);
    if (out.length >= limit) break;
  }
  if (out.length < 3) {
    for (const line of text.split("\n")) {
      if (/[\u4e00-\u9fff]{6,}/.test(line) && !/http|www\./i.test(line)) push(line);
      if (out.length >= limit) break;
    }
  }
  return out.slice(0, limit);
}

function latestSnapshotForSource(sourceId) {
  const dir = rawBriefingSnapshotsDir();
  if (!fs.existsSync(dir)) return null;
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.startsWith(`${sourceId}_`) && f.endsWith(".md"))
    .sort()
    .reverse();
  if (!files.length) return null;
  const fp = path.join(dir, files[0]);
  return { path: fp, md: fs.readFileSync(fp, "utf8") };
}

/** 回退：同 url 的其它 bucket 快照（rice/xunbao/firecrawl） */
function fallbackSnapshot(src) {
  const buckets = ["briefing", "rice", "xunbao", "firecrawl", "market"];
  for (const b of buckets) {
    const dir = rawBucketDir(b);
    if (!fs.existsSync(dir)) continue;
    const files = fs
      .readdirSync(dir)
      .filter((f) => f.endsWith(".md") && (f.startsWith(`${src.id}_`) || f.includes(src.id)))
      .sort()
      .reverse();
    // also match brief-moa vs moa-home by hostname keyword
    const more = fs
      .readdirSync(dir)
      .filter((f) => f.endsWith(".md"))
      .filter((f) => {
        if (src.id === "brief-moa" && f.startsWith("moa-home_")) return true;
        if (src.id === "brief-cnrri" && f.startsWith("cnrri_")) return true;
        if (src.id === "brief-sh-nyncw" && f.startsWith("sh-nyncw-nyjs_")) return true;
        if (src.id === "brief-saas" && f.startsWith("saas_")) return true;
        if (src.id === "brief-cshs" && f.startsWith("cshs_")) return true;
        if (src.id === "brief-jaas" && f.startsWith("jaas_")) return true;
        return false;
      })
      .sort()
      .reverse();
    const pick = files[0] || more[0];
    if (!pick) continue;
    const fp = path.join(dir, pick);
    try {
      return { path: fp, md: fs.readFileSync(fp, "utf8"), bucket: b };
    } catch (_) {}
  }
  return null;
}

function cardPathForDate(day) {
  return path.join(rawBriefingDir(), `briefing_${day}.md`);
}

function latestJsonPath() {
  return path.join(rawBriefingDir(), "latest.json");
}

/**
 * @param {{ live?: boolean, scrapeFn?: Function, maxPerSource?: number }} [opts]
 */
async function buildDailyBriefing(opts = {}) {
  const day = new Date().toISOString().slice(0, 10);
  const sources = listBriefingSources();
  const maxPer = Number(opts.maxPerSource) || 5;
  const sections = [];
  const items = [];

  for (const src of sources) {
    let snap = latestSnapshotForSource(src.id);
    if (!snap) snap = fallbackSnapshot(src);

    if (opts.live && typeof opts.scrapeFn === "function") {
      try {
        const data = await opts.scrapeFn(src.url, {
          skipTlsVerification: src.skipTlsVerification === true
        });
        const md = data?.data?.markdown || data?.markdown || "";
        if (md) {
          ensureDir(rawBriefingSnapshotsDir());
          const stamp = new Date().toISOString().replace(/[:.]/g, "-");
          const fp = path.join(rawBriefingSnapshotsDir(), `${src.id}_${stamp}.md`);
          fs.writeFileSync(
            fp,
            [`# RAW · ${src.title}`, `source_id: ${src.id}`, `url: ${src.url}`, "", "---", "", md].join(
              "\n"
            ),
            "utf8"
          );
          snap = { path: fp, md };
        }
      } catch (err) {
        sections.push({
          sourceId: src.id,
          title: src.title,
          error: String(err.message || err).slice(0, 120),
          headlines: []
        });
        continue;
      }
    }

    const headlines = extractHeadlines(snap?.md || "", maxPer);
    const block = {
      sourceId: src.id,
      title: src.title,
      url: src.url,
      headlines,
      snapshot: snap?.path || null,
      note: src.note || null
    };
    sections.push(block);
    for (const h of headlines) {
      items.push({ sourceId: src.id, sourceTitle: src.title, headline: h });
    }
  }

  const mdLines = [
    `# 小星会前动态 · ${day}`,
    "",
    "> 白名单公开页标题/摘要归纳，**非**栽培规程或审定全文。正式操作请对照农委/标签。",
    "",
    `生成时间：${new Date().toISOString()}`,
    `源数：${sections.length} · 条目：${items.length}`,
    ""
  ];
  for (const s of sections) {
    mdLines.push(`## ${s.title}`);
    if (s.error) mdLines.push(`- （抓取失败：${s.error}）`);
    else if (!s.headlines?.length) mdLines.push("- （暂无可用标题，可 `npm run briefing -- --live` 刷新）");
    else s.headlines.forEach((h) => mdLines.push(`- ${h}`));
    mdLines.push("");
  }

  ensureDir(rawBriefingDir());
  const mdPath = cardPathForDate(day);
  fs.writeFileSync(mdPath, mdLines.join("\n"), "utf8");

  const card = {
    ok: true,
    day,
    generatedAt: new Date().toISOString(),
    mdPath,
    itemCount: items.length,
    sections,
    items: items.slice(0, 40),
    speak:
      items.length > 0
        ? `会前补充：已整理 ${items.length} 条公开动态标题（${day}），请点会前卡片查看；不作规程依据。`
        : `会前补充：今日暂无整理到标题，可稍后刷新 briefing。`
  };
  fs.writeFileSync(latestJsonPath(), JSON.stringify(card, null, 2), "utf8");
  return card;
}

function readLatestBriefing() {
  const p = latestJsonPath();
  if (!fs.existsSync(p)) return { ok: false, empty: true, reason: "no_briefing" };
  try {
    const card = JSON.parse(fs.readFileSync(p, "utf8"));
    return { ok: true, empty: false, ...card };
  } catch (err) {
    return { ok: false, empty: true, reason: String(err.message || err) };
  }
}

module.exports = {
  listBriefingSources,
  extractHeadlines,
  buildDailyBriefing,
  readLatestBriefing,
  latestJsonPath,
  cardPathForDate
};
