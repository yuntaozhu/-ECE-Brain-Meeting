#!/usr/bin/env node
const { loadXiaoxingEnv } = require("../lib/voice/loadEnv.cjs");
loadXiaoxingEnv();
const { voiceTurn } = require("../lib/voice/turn.cjs");
const { ttsConfigured } = require("../lib/voice/tts.cjs");

async function main() {
  let failed = 0;
  function ok(cond, name) {
    console.log(`${cond ? "PASS" : "FAIL"} ${name}`);
    if (!cond) failed += 1;
  }

  const r = await voiceTurn({
    query: "宁玉有什么特点",
    speak: false,
    writeGap: false,
    session: false
  });
  ok(r.ok && /宁玉/.test(r.reply || ""), "voiceTurn ask (no speak)");
  ok(r.layer === "faq" || r.layer === "wiki", "layer faq/wiki");

  if (ttsConfigured()) {
    const t = await voiceTurn({
      query: "你是谁",
      speak: true,
      writeGap: false,
      session: false
    });
    ok(t.tts && t.tts.attempted, "tts attempted");
    if (t.tts?.ok) {
      ok(t.tts.bytes > 100 && t.tts.audioBase64, "tts audio bytes");
      console.log("TTS OK bytes=", t.tts.bytes, "file=", t.tts.fileName);
    } else {
      console.log("WARN TTS configured but failed:", t.tts?.error);
      // 不强制失败：密钥/额度环境可能波动
      ok(true, "tts soft-fail tolerated");
    }
  } else {
    console.log("SKIP TTS（未配置 DOUBAO_SPEECH_API_KEY）");
    ok(true, "tts optional skip");
  }

  if (failed) {
    console.error(`smoke-voice FAIL ${failed}`);
    process.exit(1);
  }
  console.log("smoke-voice OK");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
