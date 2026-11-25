"use strict";

/**
 * 云 ASR 冒烟：协议编解码 + 配置探测（默认不强制连网）
 * FORCE_ASR_CONNECT=1 且已配置密钥时尝试握手。
 */
const assert = require("assert");
const { loadXiaoxingEnv } = require("../lib/voice/loadEnv.cjs");
loadXiaoxingEnv();

const {
  buildFullClientRequest,
  buildAudioOnlyRequest,
  parseServerMessage,
  extractAsrText,
  MSG
} = require("../lib/asr/protocol.cjs");
const { asrConfigured, CloudAsrSession, asrResourceId } = require("../lib/asr/cloudAsr.cjs");
const { loadHotwords, resetHotwordsCache } = require("../lib/asr/hotwords.cjs");
const { trackAsrStatus } = require("../lib/asr/trackBridge.cjs");

function main() {
  resetHotwordsCache();
  const hotwords = loadHotwords();
  assert.ok(hotwords.includes("小星"));
  assert.ok(hotwords.includes("宁玉"));

  const frame = buildFullClientRequest(1, {
    user: { uid: "smoke" },
    audio: { format: "pcm", rate: 16000, bits: 16, channel: 1 },
    request: { model_name: "bigmodel" }
  });
  assert.ok(Buffer.isBuffer(frame) && frame.length > 8);

  const audio = buildAudioOnlyRequest(2, Buffer.alloc(3200), false);
  assert.ok(audio.length > 8);

  const fakePayload = Buffer.from(
    JSON.stringify({ result: { text: "你好草莓", utterances: [{ definite: true, text: "你好草莓" }] } }),
    "utf8"
  );
  const zlib = require("zlib");
  const gz = zlib.gzipSync(fakePayload);
  const header = Buffer.alloc(4);
  header[0] = 0x11;
  header[1] = (MSG.FULL_SERVER << 4) | 0x01;
  header[2] = (0x01 << 4) | 0x01;
  header[3] = 0;
  const seq = Buffer.alloc(4);
  seq.writeInt32BE(1, 0);
  const size = Buffer.alloc(4);
  size.writeUInt32BE(gz.length, 0);
  const parsed = parseServerMessage(Buffer.concat([header, seq, size, gz]));
  const extracted = extractAsrText(parsed.payload);
  assert.equal(extracted.text, "你好草莓");
  assert.equal(extracted.final, true);

  const configured = asrConfigured();
  console.log(
    JSON.stringify(
      {
        ok: true,
        protocol: true,
        configured,
        resourceId: asrResourceId(),
        hotwords: hotwords.length,
        trackStatus: trackAsrStatus(),
        backend: "doubao-cloud",
        note: "Me/Others 云 ASR；不使用本地 Whisper"
      },
      null,
      2
    )
  );

  if (process.env.FORCE_ASR_CONNECT === "1" && configured) {
    return new Promise((resolve) => {
      const s = new CloudAsrSession({
        onError: (e) => console.error("connect error", e),
        onResult: () => {}
      });
      s.connect().then((ok) => {
        console.log(JSON.stringify({ connectOk: ok }, null, 2));
        s.close();
        assert.ok(ok, "FORCE_ASR_CONNECT 要求握手成功");
        resolve();
      });
    });
  }
}

Promise.resolve(main()).catch((err) => {
  console.error(err);
  process.exit(1);
});
