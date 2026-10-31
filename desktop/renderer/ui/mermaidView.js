/**
 * Mermaid 侧栏渲染：优先解析本仓库模板为简易节点图；失败则展示源码。
 * 不捆绑 mermaid 运行时，保证离线可扫视。
 */
import { $ } from "../state.js";

function escapeHtml(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** 解析 flowchart 行：`  A[Label] --> B{Label}` / `A -->|x| B` */
function parseFlowchart(src) {
  const lines = String(src || "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (!lines.length) return null;
  const dirMatch = lines[0].match(/^flowchart\s+(LR|TD|RL|BT)/i);
  const dir = dirMatch ? dirMatch[1].toUpperCase() : "TD";
  const nodes = new Map();
  const edges = [];
  const nodeRe = /([A-Za-z0-9_]+)(?:\[([^\]]+)\]|\{([^}]+)\}|\(([^)]+)\))?/g;
  for (const line of lines.slice(1)) {
    if (/^(flowchart|graph)\b/i.test(line)) continue;
    const edgeMatch = line.match(
      /^([A-Za-z0-9_]+)(?:\[[^\]]*\]|\{[^}]*\}|\([^)]*\))?\s*-->\s*(?:\|([^|]*)\|\s*)?([A-Za-z0-9_]+)(?:\[[^\]]*\]|\{[^}]*\}|\([^)]*\))?/
    );
    if (edgeMatch) {
      const [, a, label, b] = edgeMatch;
      // also capture node labels from full line
      let m;
      const local = new RegExp(nodeRe.source, "g");
      while ((m = local.exec(line))) {
        const id = m[1];
        const lab = m[2] || m[3] || m[4] || id;
        if (!nodes.has(id)) nodes.set(id, lab);
      }
      if (!nodes.has(a)) nodes.set(a, a);
      if (!nodes.has(b)) nodes.set(b, b);
      edges.push({ from: a, to: b, label: label || "" });
      continue;
    }
    const only = line.match(/^([A-Za-z0-9_]+)(?:\[([^\]]+)\]|\{([^}]+)\}|\(([^)]+)\))?$/);
    if (only) {
      nodes.set(only[1], only[2] || only[3] || only[4] || only[1]);
    }
  }
  if (!nodes.size) return null;
  return { dir, nodes, edges };
}

function renderFlowHtml(parsed) {
  const isRow = parsed.dir === "LR" || parsed.dir === "RL";
  const order = [];
  const seen = new Set();
  for (const e of parsed.edges) {
    if (!seen.has(e.from)) {
      order.push(e.from);
      seen.add(e.from);
    }
    if (!seen.has(e.to)) {
      order.push(e.to);
      seen.add(e.to);
    }
  }
  for (const id of parsed.nodes.keys()) {
    if (!seen.has(id)) order.push(id);
  }
  const nodesHtml = order
    .map((id) => {
      const lab = escapeHtml(parsed.nodes.get(id) || id);
      return `<div class="mm-node" title="${escapeHtml(id)}">${lab}</div>`;
    })
    .join(isRow ? '<span class="mm-arrow">→</span>' : '<div class="mm-arrow">↓</div>');
  const edgeNotes = parsed.edges
    .filter((e) => e.label)
    .map((e) => `${escapeHtml(e.from)}→${escapeHtml(e.to)}: ${escapeHtml(e.label)}`)
    .join(" · ");
  return `
    <div class="mm-flow ${isRow ? "mm-row" : "mm-col"}">${nodesHtml}</div>
    ${edgeNotes ? `<p class="mm-edge-notes">${edgeNotes}</p>` : ""}
  `;
}

export function renderMermaidBox(src, boxEl) {
  const box = boxEl || $("mermaidBox");
  if (!box) return;
  const text = String(src || "").trim();
  if (!text) {
    box.style.display = "none";
    box.innerHTML = "";
    return;
  }
  box.style.display = "block";
  const parsed = parseFlowchart(text);
  if (parsed) {
    box.innerHTML = `
      <div class="mm-wrap">
        ${renderFlowHtml(parsed)}
        <details class="mm-src"><summary>Mermaid 源码</summary><pre>${escapeHtml(text)}</pre></details>
        <button type="button" class="ghost mm-copy" data-mm="${escapeHtml(text)}">复制源码</button>
      </div>
    `;
  } else {
    box.innerHTML = `
      <pre class="mm-fallback">${escapeHtml(text)}</pre>
      <button type="button" class="ghost mm-copy" data-mm="${escapeHtml(text)}">复制源码</button>
    `;
  }
  box.querySelectorAll(".mm-copy").forEach((btn) => {
    btn.onclick = async () => {
      try {
        await navigator.clipboard.writeText(btn.getAttribute("data-mm") || text);
      } catch (_) {}
    };
  });
}

export function ensureMermaidStyles() {
  if (document.getElementById("mm-style")) return;
  const st = document.createElement("style");
  st.id = "mm-style";
  st.textContent = `
    .mm-wrap{font-size:12px}
    .mm-flow{display:flex;gap:6px;align-items:center;flex-wrap:wrap}
    .mm-col{flex-direction:column;align-items:flex-start}
    .mm-node{background:#0f172a;color:#e2e8f0;border:1px solid #334155;border-radius:8px;padding:6px 10px;max-width:220px}
    .mm-arrow{opacity:.7;padding:0 2px}
    .mm-edge-notes{margin:6px 0 0;opacity:.75}
    .mm-src{margin-top:6px}
    .mm-src pre,.mm-fallback{white-space:pre-wrap;margin:4px 0;font-size:11px}
  `;
  document.head.appendChild(st);
}
