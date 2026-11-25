/**
 * 语音回合：query → askAsync（价格 miss 可 live）→ 可选 TTS
 */
const { askAsync } = require("../ask/index.cjs");
const { synthesizeToMp3, ttsConfigured } = require("./tts.cjs");

/**
 * @param {{ query: string, speak?: boolean, writeGap?: boolean, session?: boolean, live?: boolean, scrapeFn?: Function, onLiveStart?: Function, preAnswer?: object }} input
 */
async function voiceTurn(input = {}) {
  const query = String(input.query || "").trim();
  const speak = input.speak !== false;
  if (!query) {
    return { ok: false, error: "missing query", reply: "请先说出或输入问题。" };
  }

  const answer =
    input.preAnswer && input.preAnswer.reply
      ? input.preAnswer
      : await askAsync(query, {
          writeGap: input.writeGap !== false,
          session: input.session !== false,
          live: input.live !== false,
          scrapeFn: input.scrapeFn,
          onLiveStart: input.onLiveStart
        });

  const result = {
    ok: true,
    query,
    ...answer,
    tts: { attempted: false, ok: false, skipped: !speak || !ttsConfigured() }
  };

  if (speak && ttsConfigured() && answer.reply) {
    result.tts.attempted = true;
    const tts = await synthesizeToMp3(answer.reply, { keepBase64: true });
    result.tts = {
      attempted: true,
      ok: Boolean(tts.ok),
      skipped: Boolean(tts.skipped),
      error: tts.error || null,
      bytes: tts.bytes || 0,
      fileName: tts.fileName || null,
      mime: tts.mime || null,
      audioBase64: tts.audioBase64 || null
    };
  } else if (speak && !ttsConfigured()) {
    result.tts = {
      attempted: false,
      ok: false,
      skipped: true,
      fallback: "browser_speechSynthesis",
      error: "服务端 TTS 未配置，请用浏览器朗读降级"
    };
  }

  return result;
}

module.exports = { voiceTurn };
