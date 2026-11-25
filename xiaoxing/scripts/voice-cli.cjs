#!/usr/bin/env node
const { loadXiaoxingEnv } = require("../lib/voice/loadEnv.cjs");
loadXiaoxingEnv();
const { voiceTurn } = require("../lib/voice/turn.cjs");

async function main() {
  const args = process.argv.slice(2);
  const noSpeak = args.includes("--no-speak");
  const q = args.filter((a) => a !== "--no-speak").join(" ").trim();
  if (!q) {
    console.error('用法: npm run voice -- "宁玉有什么特点" [--no-speak]');
    process.exit(1);
  }
  const r = await voiceTurn({ query: q, speak: !noSpeak });
  const out = { ...r };
  if (out.tts?.audioBase64) out.tts = { ...out.tts, audioBase64: `[${out.tts.audioBase64.length} chars base64]` };
  console.log(JSON.stringify(out, null, 2));
  console.log("\n小星：" + (r.reply || ""));
  if (r.tts?.ok) console.log("TTS 文件:", r.tts.fileName, r.tts.bytes, "bytes");
  else if (r.tts?.skipped) console.log("TTS 跳过:", r.tts.error || r.tts.fallback || "未合成");
  else if (r.tts?.attempted) console.log("TTS 失败:", r.tts.error);
  else if (noSpeak) console.log("TTS：--no-speak");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
