/**
 * 火山大模型流式 ASR 二进制帧编解码（sauc/bigmodel）
 * @see https://www.volcengine.com/docs/6561/1354869
 */
const zlib = require("zlib");

const MSG = {
  FULL_CLIENT: 0b0001,
  AUDIO_ONLY: 0b0010,
  FULL_SERVER: 0b1001,
  ERROR: 0b1111
};
const FLAG = {
  NONE: 0b0000,
  POS_SEQ: 0b0001,
  NEG_SEQ: 0b0011,
  NEG_NO_SEQ: 0b0010
};

function buildHeader(messageType, flags, serialization = 0b0001, compression = 0b0001) {
  const buf = Buffer.alloc(4);
  buf[0] = (0x01 << 4) | 0x01; // version=1, header_size=1 → 4 bytes
  buf[1] = (messageType << 4) | (flags & 0x0f);
  buf[2] = (serialization << 4) | (compression & 0x0f);
  buf[3] = 0x00;
  return buf;
}

function buildFullClientRequest(seq, payloadObj) {
  const raw = Buffer.from(JSON.stringify(payloadObj), "utf8");
  const compressed = zlib.gzipSync(raw);
  const header = buildHeader(MSG.FULL_CLIENT, FLAG.POS_SEQ, 0b0001, 0b0001);
  const seqBuf = Buffer.alloc(4);
  seqBuf.writeInt32BE(seq, 0);
  const sizeBuf = Buffer.alloc(4);
  sizeBuf.writeUInt32BE(compressed.length, 0);
  return Buffer.concat([header, seqBuf, sizeBuf, compressed]);
}

function buildAudioOnlyRequest(seq, pcmBuf, isLast) {
  const compressed = zlib.gzipSync(pcmBuf);
  const flags = isLast ? FLAG.NEG_SEQ : FLAG.POS_SEQ;
  const header = buildHeader(MSG.AUDIO_ONLY, flags, 0b0000, 0b0001);
  const seqBuf = Buffer.alloc(4);
  // 最后一包 sequence 为负
  seqBuf.writeInt32BE(isLast ? -Math.abs(seq) : seq, 0);
  const sizeBuf = Buffer.alloc(4);
  sizeBuf.writeUInt32BE(compressed.length, 0);
  return Buffer.concat([header, seqBuf, sizeBuf, compressed]);
}

/**
 * @param {Buffer} message
 * @returns {{ messageType: number, code: number, sequence: number, payload: object|null, rawText?: string }}
 */
function parseServerMessage(message) {
  if (!Buffer.isBuffer(message) || message.length < 4) {
    return { messageType: -1, code: -1, sequence: 0, payload: null };
  }
  const messageType = message[1] >> 4;
  const flags = message[1] & 0x0f;
  const serialization = message[2] >> 4;
  const compression = message[2] & 0x0f;
  let offset = 4;
  let sequence = 0;
  if (flags & 0x01) {
    sequence = message.readInt32BE(offset);
    offset += 4;
  }
  let code = 0;
  if (messageType === MSG.ERROR) {
    if (offset + 4 <= message.length) {
      code = message.readUInt32BE(offset);
      offset += 4;
    }
  }
  let payloadSize = 0;
  if (offset + 4 <= message.length) {
    payloadSize = message.readUInt32BE(offset);
    offset += 4;
  }
  let payloadBuf = message.slice(offset, offset + payloadSize);
  if (compression === 0b0001 && payloadBuf.length) {
    try {
      payloadBuf = zlib.gunzipSync(payloadBuf);
    } catch (_) {
      /* keep raw */
    }
  }
  let payload = null;
  let rawText = "";
  if (payloadBuf.length) {
    rawText = payloadBuf.toString("utf8");
    if (serialization === 0b0001) {
      try {
        payload = JSON.parse(rawText);
      } catch (_) {
        payload = { message: rawText };
      }
    }
  }
  return { messageType, code, sequence, payload, rawText };
}

function extractAsrText(payload) {
  if (!payload || typeof payload !== "object") return { text: "", final: false };
  const result = payload.result || payload;
  const text = String(result.text || result.offline_text || "").trim();
  const utterances = Array.isArray(result.utterances) ? result.utterances : [];
  const definite = utterances.some((u) => u && (u.definite === true || u.definite === 1));
  // 无 utterances 时：有 text 且 payload 带 is_final / definite
  const final =
    definite ||
    result.is_final === true ||
    payload.is_final === true ||
    Boolean(utterances.length && utterances[utterances.length - 1]?.definite);
  return { text, final, utterances };
}

module.exports = {
  MSG,
  buildFullClientRequest,
  buildAudioOnlyRequest,
  parseServerMessage,
  extractAsrText
};
