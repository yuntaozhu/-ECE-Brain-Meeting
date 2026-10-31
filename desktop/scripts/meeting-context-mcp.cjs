#!/usr/bin/env node
"use strict";

/**
 * 轻量 MCP（stdio JSON-RPC）：供 Cursor / IDE 读取会中桥接上下文。
 * 不依赖 @modelcontextprotocol/sdk。
 *
 * 启动示例（mcp.json）：
 *   { "command": "node", "args": ["desktop/scripts/meeting-context-mcp.cjs"] }
 */
const {
  readBridge,
  listJots,
  expandJots,
  getLatestScreenContext,
  buildCatchMeUp,
  buildDeepDive,
  buildCopilotPacket
} = require("../lib/copilot/index.cjs");
const {
  retrieveWiki2,
  ingestEpisode,
  ingestEpisodeAuto,
  reconcileClaims,
  buildWiki2Index,
  synthesizeThemes,
  promoteSessionToWiki2
} = require("../lib/wiki2/index.cjs");

const TOOLS = [
  {
    name: "ece_meeting_bridge",
    description: "读取 meeting_bridge.json（最近速记/截屏/速览摘要）",
    inputSchema: { type: "object", properties: {} }
  },
  {
    name: "ece_list_jots",
    description: "列出本场 Quick Jot 速记",
    inputSchema: {
      type: "object",
      properties: {
        meetingId: { type: "string" },
        limit: { type: "number" }
      }
    }
  },
  {
    name: "ece_expand_jots",
    description: "将速记扩写成 Markdown 草稿（可粘贴进 ADR）",
    inputSchema: {
      type: "object",
      properties: {
        meetingId: { type: "string" },
        transcript: { type: "string" }
      }
    }
  },
  {
    name: "ece_latest_screen",
    description: "最近一次按需截屏元数据（路径/备注；OCR 可选）",
    inputSchema: { type: "object", properties: {} }
  },
  {
    name: "ece_catch_me_up",
    description: "对传入转写做近窗 Catch Me Up 速览",
    inputSchema: {
      type: "object",
      properties: {
        transcript: { type: "string" },
        agenda: { type: "string" },
        windowMs: { type: "number" }
      },
      required: ["transcript"]
    }
  },
  {
    name: "ece_copilot_packet",
    description: "生成副驾驶建议卡 JSON（含 Deep Dive / Mermaid 线索）",
    inputSchema: {
      type: "object",
      properties: {
        transcript: { type: "string" },
        agenda: { type: "string" },
        force: { type: "boolean" }
      },
      required: ["transcript"]
    }
  },
  {
    name: "ece_wiki_search",
    description: "Wiki2 Fast Read：返回 AI-First Snapshot / Claims（无 LLM）",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string" },
        topK: { type: "number" }
      },
      required: ["query"]
    }
  },
  {
    name: "ece_wiki_ingest_dry",
    description: "会后 Episode 抽取（规则或 LLM auto；默认不改决策页）",
    inputSchema: {
      type: "object",
      properties: {
        transcript: { type: "string" },
        agenda: { type: "string" },
        apply: { type: "boolean", description: "true 时 reconcile 合入决策页" },
        llm: { type: "boolean", description: "true 强制豆包编译" }
      },
      required: ["transcript"]
    }
  },
  {
    name: "ece_wiki_reindex",
    description: "重建 knowledge_wiki/.graph_index",
    inputSchema: { type: "object", properties: {} }
  },
  {
    name: "ece_wiki_synthesize_themes",
    description: "链接共现主题合成（轻量，无 Leiden）",
    inputSchema: {
      type: "object",
      properties: { dry: { type: "boolean" } }
    }
  },
  {
    name: "ece_wiki_from_session",
    description: "最新/指定 session 转写 → wiki2 episode（可选 apply/llm）",
    inputSchema: {
      type: "object",
      properties: {
        meetingId: { type: "string" },
        apply: { type: "boolean" },
        llm: { type: "boolean" },
        agenda: { type: "string" }
      }
    }
  }
];

function send(msg) {
  process.stdout.write(JSON.stringify(msg) + "\n");
}

function resultText(id, obj) {
  return {
    jsonrpc: "2.0",
    id,
    result: {
      content: [{ type: "text", text: JSON.stringify(obj, null, 2) }]
    }
  };
}

async function handle(msg) {
  if (!msg || msg.jsonrpc !== "2.0") return;
  const { id, method, params } = msg;
  if (method === "initialize") {
    send({
      jsonrpc: "2.0",
      id,
      result: {
        protocolVersion: "2024-11-05",
        capabilities: { tools: {} },
        serverInfo: { name: "ece-meeting-context", version: "0.1.0" }
      }
    });
    return;
  }
  if (method === "notifications/initialized") return;
  if (method === "tools/list") {
    send({ jsonrpc: "2.0", id, result: { tools: TOOLS } });
    return;
  }
  if (method === "tools/call") {
    const name = params?.name;
    const args = params?.arguments || {};
    try {
      if (name === "ece_meeting_bridge") {
        send(resultText(id, readBridge()));
        return;
      }
      if (name === "ece_list_jots") {
        send(
          resultText(id, {
            jots: listJots(args.meetingId || "live", args.limit || 50)
          })
        );
        return;
      }
      if (name === "ece_expand_jots") {
        send(resultText(id, expandJots(args.meetingId || "live", args.transcript || "")));
        return;
      }
      if (name === "ece_latest_screen") {
        send(resultText(id, getLatestScreenContext() || { empty: true }));
        return;
      }
      if (name === "ece_catch_me_up") {
        send(
          resultText(
            id,
            buildCatchMeUp(args.transcript || "", {
              agenda: args.agenda || "",
              windowMs: args.windowMs
            })
          )
        );
        return;
      }
      if (name === "ece_copilot_packet") {
        const pkt = buildCopilotPacket(args.transcript || "", {
          agenda: args.agenda || "",
          force: Boolean(args.force)
        });
        if (pkt?.should_trigger && !pkt.deep_dive) {
          pkt.deep_dive = buildDeepDive(pkt);
        }
        send(resultText(id, pkt));
        return;
      }
      if (name === "ece_wiki_search") {
        send(resultText(id, retrieveWiki2(args.query || "", { topK: args.topK || 3 })));
        return;
      }
      if (name === "ece_wiki_ingest_dry") {
        const apply = Boolean(args.apply);
        const ingested = args.llm
          ? await ingestEpisodeAuto(
              { transcript: args.transcript || "", agenda: args.agenda || "" },
              { dry: false, forceLlm: true }
            )
          : {
              ...ingestEpisode(
                { transcript: args.transcript || "", agenda: args.agenda || "" },
                { dry: false }
              ),
              mode: "rule",
              llm: false
            };
        let recon = null;
        if (apply && ingested.extracted_claims?.length) {
          recon = reconcileClaims(ingested.extracted_claims, { dry: false });
        } else {
          recon = reconcileClaims(ingested.extracted_claims || [], { dry: true });
        }
        send(resultText(id, { ingested, reconcile: recon, applied: apply }));
        return;
      }
      if (name === "ece_wiki_reindex") {
        send(resultText(id, buildWiki2Index()));
        return;
      }
      if (name === "ece_wiki_synthesize_themes") {
        send(resultText(id, synthesizeThemes({ dry: args.dry !== false })));
        return;
      }
      if (name === "ece_wiki_from_session") {
        const res = await promoteSessionToWiki2({
          meetingId: args.meetingId || undefined,
          apply: Boolean(args.apply),
          llm: args.llm,
          agenda: args.agenda || undefined,
          themes: true,
          themesWrite: Boolean(args.apply)
        });
        send(resultText(id, res));
        return;
      }
      send({
        jsonrpc: "2.0",
        id,
        error: { code: -32601, message: `unknown tool ${name}` }
      });
    } catch (err) {
      send({
        jsonrpc: "2.0",
        id,
        error: { code: -32000, message: String(err?.message || err) }
      });
    }
    return;
  }
  if (id != null) {
    send({
      jsonrpc: "2.0",
      id,
      error: { code: -32601, message: `method not found: ${method}` }
    });
  }
}

let buf = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => {
  buf += chunk;
  let idx;
  while ((idx = buf.indexOf("\n")) >= 0) {
    const line = buf.slice(0, idx).trim();
    buf = buf.slice(idx + 1);
    if (!line) continue;
    try {
      void handle(JSON.parse(line));
    } catch (err) {
      // ignore malformed
    }
  }
});
