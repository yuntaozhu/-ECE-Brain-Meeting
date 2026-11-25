#!/usr/bin/env node
/**
 * 一键：把 Cursor 本仓库 agent 聊天导出为 Obsidian Markdown 并打开
 *
 * node scripts/export-chat-obsidian.cjs
 * node scripts/export-chat-obsidian.cjs --recent=60
 * node scripts/export-chat-obsidian.cjs --full
 * node scripts/export-chat-obsidian.cjs --no-open
 *
 * 环境变量（可选）：
 *   OBSIDIAN_VAULT  默认 OneDrive\Documents\Obsidian Vault
 *   OBSIDIAN_EXE    默认 G:\Program Files\Obsidian\Obsidian.exe
 */
"use strict";

const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const REPO = path.join(__dirname, "..");
const DEFAULT_VAULT = path.join(
  process.env.USERPROFILE || process.env.HOME || "",
  "OneDrive",
  "Documents",
  "Obsidian Vault"
);
const DEFAULT_EXE = "G:\\Program Files\\Obsidian\\Obsidian.exe";
const TRANSCRIPT_ROOT = path.join(
  process.env.USERPROFILE || "",
  ".cursor",
  "projects",
  "e-project-ECE-Brain-Meeting",
  "agent-transcripts"
);

function argVal(name, def) {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : def;
}

function extractText(content) {
  if (!Array.isArray(content)) return "";
  const parts = [];
  let tools = 0;
  for (const c of content) {
    if (c.type === "text" && c.text) {
      let t = String(c.text)
        .replace(/<timestamp>[\s\S]*?<\/timestamp>\s*/g, "")
        .replace(/<\/?user_query>/g, "")
        .replace(/<\/?agent_transcripts>[\s\S]*$/g, "")
        .trim();
      // 过长 tool 叙述截断
      if (t.length > 6000) t = t.slice(0, 6000) + "\n\n…（已截断）";
      if (t) parts.push(t);
    } else if (c.type === "tool_use") {
      tools += 1;
    }
  }
  return { text: parts.join("\n\n").trim(), tools };
}

function findLatestTranscript() {
  if (!fs.existsSync(TRANSCRIPT_ROOT)) {
    throw new Error("找不到 agent-transcripts: " + TRANSCRIPT_ROOT);
  }
  const dirs = fs
    .readdirSync(TRANSCRIPT_ROOT, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => {
      const id = d.name;
      const file = path.join(TRANSCRIPT_ROOT, id, `${id}.jsonl`);
      const st = fs.existsSync(file) ? fs.statSync(file) : null;
      return { id, file, mtime: st ? st.mtimeMs : 0 };
    })
    .filter((x) => x.mtime)
    .sort((a, b) => b.mtime - a.mtime);
  if (!dirs.length) throw new Error("无可用 jsonl 会话");
  return dirs[0];
}

function parseTurns(file) {
  const lines = fs.readFileSync(file, "utf8").split(/\r?\n/).filter(Boolean);
  const turns = [];
  for (const line of lines) {
    let obj;
    try {
      obj = JSON.parse(line);
    } catch {
      continue;
    }
    const role = obj.role;
    if (role !== "user" && role !== "assistant") continue;
    const { text, tools } = extractText(obj.message?.content || []);
    if (!text && !tools) continue;
    if (!text && tools) {
      // 纯工具回合：合并记一行，避免 Obsidian 刷屏
      const prev = turns[turns.length - 1];
      if (prev && prev.role === "assistant" && prev.toolOnly) {
        prev.tools += tools;
        continue;
      }
      turns.push({
        role: "assistant",
        text: `_(工具调用 ×${tools})_`,
        tools,
        toolOnly: true
      });
      continue;
    }
    turns.push({ role, text, tools, toolOnly: false });
  }
  return turns;
}

function toMarkdown({ id, turns, recent }) {
  const now = new Date();
  const stamp = now.toISOString().slice(0, 19).replace("T", " ");
  const title = `Cursor 会话 ${id.slice(0, 8)} · ${now.toISOString().slice(0, 10)}`;
  const body = turns
    .map((t, i) => {
      const who = t.role === "user" ? "🧑 用户" : "🤖 助手";
      return `### ${i + 1}. ${who}\n\n${t.text}\n`;
    })
    .join("\n---\n\n");

  return `---
title: "${title.replace(/"/g, "")}"
source: cursor-agent
transcript_id: ${id}
exported_at: ${now.toISOString()}
turns: ${turns.length}
mode: ${recent ? "recent-" + recent : "full"}
tags:
  - cursor
  - ece-brain-meeting
  - chat-export
---

# ${title}

> 从 Cursor agent-transcripts 一键导出 · ${stamp}  
> 仓库：\`ECE-Brain-Meeting\` · 会话 \`${id}\`

## 目录提示

- 打开本笔记即可在 Obsidian 内检索对话
- 工具调用已折叠为一行摘要；原文仍在 Cursor transcript

## 对话

${body}
`;
}

function openInObsidian({ vault, exe, relFile }) {
  const vaultName = path.basename(vault);
  const fileParam = relFile.replace(/\\/g, "/");
  const uri =
    `obsidian://open?vault=${encodeURIComponent(vaultName)}` +
    `&file=${encodeURIComponent(fileParam)}`;

  // 优先 URI（已打开则跳转）；再兜底启动 exe
  try {
    spawn("cmd", ["/c", "start", "", uri], { detached: true, stdio: "ignore" }).unref();
  } catch (_) {}

  if (fs.existsSync(exe)) {
    try {
      spawn(exe, ["obsidian://open?vault=" + encodeURIComponent(vaultName)], {
        detached: true,
        stdio: "ignore"
      }).unref();
    } catch (_) {}
  }
  return uri;
}

function main() {
  const vault = process.env.OBSIDIAN_VAULT || DEFAULT_VAULT;
  const exe = process.env.OBSIDIAN_EXE || DEFAULT_EXE;
  const full = process.argv.includes("--full");
  const noOpen = process.argv.includes("--no-open");
  const recent = full ? 0 : Number(argVal("recent", "80")) || 80;

  if (!fs.existsSync(vault)) {
    console.error("Obsidian vault 不存在:", vault);
    console.error("请设置环境变量 OBSIDIAN_VAULT");
    process.exit(1);
  }

  const { id, file } = findLatestTranscript();
  let turns = parseTurns(file);
  if (recent > 0 && turns.length > recent) {
    turns = turns.slice(-recent);
  }

  const outDir = path.join(vault, "Cursor Chats", "ECE-Brain-Meeting");
  fs.mkdirSync(outDir, { recursive: true });
  const day = new Date().toISOString().slice(0, 10);
  const outName = `${day}-${id.slice(0, 8)}.md`;
  const outPath = path.join(outDir, outName);
  const md = toMarkdown({ id, turns, recent: recent || null });
  fs.writeFileSync(outPath, md, "utf8");

  const relFile = path
    .join("Cursor Chats", "ECE-Brain-Meeting", outName)
    .replace(/\\/g, "/");

  let uri = null;
  if (!noOpen) uri = openInObsidian({ vault, exe, relFile });

  console.log(
    JSON.stringify(
      {
        ok: true,
        transcript: file,
        id,
        turns: turns.length,
        outPath,
        relFile,
        vault,
        uri,
        opened: !noOpen
      },
      null,
      2
    )
  );
}

main();
