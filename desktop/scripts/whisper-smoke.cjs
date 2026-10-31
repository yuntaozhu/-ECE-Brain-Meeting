/**
 * 本地 Whisper 配置自检（不强制有真实音频）。
 *   npm run whisper:smoke
 */
const fs = require("fs");
const path = require("path");
const {
  whisperStatus,
  isLocalWhisperMode,
  writeWavPcm16Mono
} = require("../lib/asr/whisperLocal.cjs");
const { LocalWhisperSession } = require("../lib/asr/whisperLocal.cjs");

async function main() {
  const st = whisperStatus();
  console.log("Whisper status:", JSON.stringify(st, null, 2));
  console.log("HOST_ASR_MODE local?", isLocalWhisperMode());

  if (!st.configured) {
    console.error("未配置 WHISPER_SERVER_URL 或 WHISPER_BIN。");
    console.error("先: npm run whisper:model");
    process.exit(2);
  }
  if (st.backend === "cli" && st.modelExists === false) {
    console.error("模型文件不存在:", st.model);
    console.error("运行: npm run whisper:model");
    process.exit(2);
  }

  const session = new LocalWhisperSession({
    onResult: (r) => console.log("RESULT", r),
    onError: (e) => console.error("ERROR", e)
  });
  const ok = await session.connect();
  console.log("connect:", ok, session.lastHandshake);
  if (!ok) process.exit(1);

  // 生成约 1.2s 静音+弱噪声 WAV，验证后端链路（可能空转写）
  const n = 16000;
  const pcm = new Int16Array(n);
  for (let i = 0; i < n; i++) pcm[i] = (i % 40) - 20;
  const wav = path.join(require("os").tmpdir(), "ece_whisper_smoke.wav");
  writeWavPcm16Mono(wav, pcm, 16000);
  console.log("test wav:", wav, fs.statSync(wav).size, "bytes");

  // 直接走一次内部转写
  try {
    const text = await session._transcribePcm(pcm);
    console.log("transcribe ok, text=", JSON.stringify(text || ""));
  } catch (err) {
    console.error("transcribe failed:", err.message || err);
    session.close();
    process.exit(1);
  }
  session.close();
  console.log("whisper smoke PASS");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
