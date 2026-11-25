"use strict";

/**
 * 微信公众号消息加解密（安全模式 EncodingAESKey）
 * 文档：https://developers.weixin.qq.com/doc/oplatform/Third-party_Platforms/2.0/api/Before_Develop/Technical_Support.html
 */
const crypto = require("crypto");

function encodingAesKey() {
  return String(process.env.WECHAT_AES_KEY || process.env.WECHAT_ENCODING_AES_KEY || "").trim();
}

function wechatAppId() {
  return String(process.env.WECHAT_APP_ID || process.env.WECHAT_APPID || "").trim();
}

function aesKeyBuffer() {
  const key = encodingAesKey();
  if (!key || key.length !== 43) {
    throw new Error("WECHAT_AES_KEY 须为 43 位 EncodingAESKey");
  }
  return Buffer.from(key + "=", "base64");
}

function pkcs7Pad(buf, block = 32) {
  const amount = block - (buf.length % block);
  return Buffer.concat([buf, Buffer.alloc(amount, amount)]);
}

function pkcs7Unpad(buf, block = 32) {
  const pad = buf[buf.length - 1];
  if (pad < 1 || pad > block) return buf;
  return buf.subarray(0, buf.length - pad);
}

function encrypt(plainXml, appId = wechatAppId()) {
  if (!appId) throw new Error("缺少 WECHAT_APP_ID（加密回复需要）");
  const key = aesKeyBuffer();
  const iv = key.subarray(0, 16);
  const random = crypto.randomBytes(16);
  const msg = Buffer.from(String(plainXml), "utf8");
  const len = Buffer.alloc(4);
  len.writeUInt32BE(msg.length, 0);
  const raw = pkcs7Pad(Buffer.concat([random, len, msg, Buffer.from(appId, "utf8")]));
  const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
  cipher.setAutoPadding(false);
  const enc = Buffer.concat([cipher.update(raw), cipher.final()]);
  return enc.toString("base64");
}

function decrypt(encryptBase64, appId = wechatAppId()) {
  const key = aesKeyBuffer();
  const iv = key.subarray(0, 16);
  const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
  decipher.setAutoPadding(false);
  const dec = pkcs7Unpad(
    Buffer.concat([decipher.update(Buffer.from(String(encryptBase64), "base64")), decipher.final()])
  );
  const msgLen = dec.readUInt32BE(16);
  const xml = dec.subarray(20, 20 + msgLen).toString("utf8");
  const fromAppId = dec.subarray(20 + msgLen).toString("utf8");
  if (appId && fromAppId && fromAppId !== appId) {
    throw new Error(`appId 不匹配: expect ${appId}`);
  }
  return { xml, appId: fromAppId };
}

function safeModeEnabled() {
  try {
    const k = encodingAesKey();
    return Boolean(k && k.length === 43 && wechatAppId());
  } catch (_) {
    return false;
  }
}

module.exports = {
  encodingAesKey,
  wechatAppId,
  encrypt,
  decrypt,
  safeModeEnabled
};
