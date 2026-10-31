/**
 * Catch Me Up：近 N 分钟转写启发式速览（旁路，不改 decideSpeak）。
 */
const { lastTranscriptSegment } = require("./gate.cjs");
const { detectMermaidHint } = require("./mermaidHint.cjs");
const { buildWiki2Evidence } = require("../wiki2/index.cjs");

const DISAGREE_RE =
  /(不同意|反对|有分歧|争议|不行|不对|质疑|风险|担心|但是|不过|我反对|有问题)/;
const DECISION_RE =
  /(拍板|决定|定下来|要不要|是否采用|确认一下|下一步|待定|谁负责|截止日期|DDL)/;
const TOPIC_RE =
  /(方案|架构|接口|收费|价格|排期|上线|ASR|TTS|Whisper|双通道|副驾驶|FAQ|知识库)/;

function parseLines(transcript) {
  return String(transcript || "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const m = l.match(/^([^:]{1,16})[:：]\s*(.+)$/);
      if (m) return { speaker: m[1].trim(), text: m[2].trim() };
      return { speaker: "会场", text: l };
    });
}

function windowByMs(lines, windowMs, now = Date.now()) {
  const withAt = lines.map((l, i) => ({
    ...l,
    at: l.at || now - (lines.length - i) * 4000
  }));
  const cut = now - (Number(windowMs) || 5 * 60 * 1000);
  const recent = withAt.filter((l) => l.at >= cut);
  return recent.length ? recent : withAt.slice(-24);
}

/**
 * @param {string|Array} transcriptOrLines
 * @param {{ windowMs?: number, agenda?: string }} [opts]
 */
function buildCatchMeUp(transcriptOrLines, opts = {}) {
  const windowMs = Number(opts.windowMs) || 5 * 60 * 1000;
  const lines =
    typeof transcriptOrLines === "string"
      ? parseLines(transcriptOrLines)
      : Array.isArray(transcriptOrLines)
        ? transcriptOrLines
        : [];
  const recent = windowByMs(lines, windowMs);
  const texts = recent.map((l) => String(l.text || "").trim()).filter(Boolean);
  const joined = texts.join("\n");

  const topicHits = [];
  for (const t of texts) {
    const m = t.match(TOPIC_RE);
    if (m) topicHits.push(m[0]);
  }
  const topicFreq = {};
  for (const t of topicHits) topicFreq[t] = (topicFreq[t] || 0) + 1;
  const topicSorted = Object.entries(topicFreq).sort((a, b) => b[1] - a[1]);
  const currentTopic =
    topicSorted[0]?.[0] ||
    lastTranscriptSegment(joined).slice(0, 36) ||
    opts.agenda ||
    "（近窗无明显议题词）";

  const disagreements = texts
    .filter((t) => DISAGREE_RE.test(t))
    .slice(-5)
    .map((t) => t.slice(0, 80));
  const decisions = texts
    .filter((t) => DECISION_RE.test(t))
    .slice(-5)
    .map((t) => t.slice(0, 80));

  const speakers = {};
  for (const l of recent) {
    const sp = l.speaker || "会场";
    if (/大智|AI|Host/i.test(sp)) continue;
    speakers[sp] = (speakers[sp] || 0) + 1;
  }

  const mermaid = detectMermaidHint(joined);
  let wikiBits = [];
  try {
    const ev = buildWiki2Evidence(currentTopic || joined.slice(0, 80), { topK: 2 });
    wikiBits = (ev.facts || []).slice(0, 3);
  } catch (_) {}

  const packet = {
    type: "catch-me-up",
    ts: Date.now(),
    windowMs,
    lineCount: recent.length,
    agenda: opts.agenda || "",
    current_topic: currentTopic,
    disagreements,
    pending_decisions: decisions,
    wiki_facts: wikiBits,
    active_speakers: Object.entries(speakers)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, n]) => ({ name, lines: n })),
    mermaid_diagram: mermaid,
    digest: [
      `【当前议题】${currentTopic}`,
      disagreements.length
        ? `【分歧】${disagreements.map((d) => `· ${d}`).join(" ")}`
        : "【分歧】近窗未检出明显反对/风险表述",
      decisions.length
        ? `【待拍板】${decisions.map((d) => `· ${d}`).join(" ")}`
        : "【待拍板】近窗未检出明确决策句",
      wikiBits.length
        ? `【Wiki】${wikiBits.map((f) => `· ${f}`).join(" ")}`
        : "【Wiki】近窗主题暂无 Snapshot 命中"
    ].join("\n")
  };

  return packet;
}

module.exports = {
  buildCatchMeUp,
  parseLines,
  windowByMs
};
