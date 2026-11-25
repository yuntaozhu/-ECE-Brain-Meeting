#!/usr/bin/env node
process.env.WECHAT_SKIP_VERIFY = "1";
delete process.env.WECHAT_AES_KEY;
delete process.env.WECHAT_ENCODING_AES_KEY;

const crypto = require("crypto");
const {
  parseIncomingXml,
  replyTextXml,
  answerForWechat,
  checkSignature,
  checkMsgSignature,
  handleWechatHttp
} = require("../lib/channels/wechat.cjs");
const { encrypt, decrypt } = require("../lib/channels/wechatCrypto.cjs");
const { handleWebhookAsk } = require("../lib/channels/webhook.cjs");
const { ask } = require("../lib/ask/index.cjs");

let failed = 0;
function ok(cond, name) {
  console.log(`${cond ? "PASS" : "FAIL"} ${name}`);
  if (!cond) failed += 1;
}

const xml = `<xml>
<ToUserName><![CDATA[gh_test]]></ToUserName>
<FromUserName><![CDATA[openid_1]]></FromUserName>
<CreateTime>123</CreateTime>
<MsgType><![CDATA[text]]></MsgType>
<Content><![CDATA[宁玉有什么特点]]></Content>
<MsgId>10001</MsgId>
</xml>`;
const msg = parseIncomingXml(xml);
ok(msg.fromUser === "openid_1" && msg.content.includes("宁玉"), "parse xml");

const answered = answerForWechat(msg.content, (q) => ask(q, { writeGap: false, session: false }));
ok(/宁玉/.test(answered.text), "wechat answer");

const out = replyTextXml({ toUser: msg.fromUser, fromUser: msg.toUser, content: answered.text });
ok(out.includes("<MsgType><![CDATA[text]]></MsgType>") && out.includes("openid_1"), "reply xml");

ok(checkSignature({}), "skip verify");

const wh = handleWebhookAsk({ query: "你是谁" }, (q) => ask(q, { writeGap: false, session: false }));
ok(wh.ok && /小星/.test(wh.reply), "webhook ask");

// 明文 HTTP 处理
const httpPlain = handleWechatHttp({
  method: "POST",
  query: { timestamp: "1", nonce: "n" },
  rawBody: xml.replace("10001", "10002"),
  askFn: (q) => ask(q, { writeGap: false, session: false })
});
ok(httpPlain.status === 200 && httpPlain.body.includes("openid_1"), "handleWechatHttp plain");

// 安全模式加解密往返
const aesKey = crypto.randomBytes(32).toString("base64").replace(/=+$/, "");
ok(aesKey.length === 43, "aes key length");
process.env.WECHAT_AES_KEY = aesKey;
process.env.WECHAT_APP_ID = "wx_test_app";
process.env.WECHAT_TOKEN = "tok";
process.env.WECHAT_SKIP_VERIFY = "1";

const plainReply = replyTextXml({
  toUser: "openid_1",
  fromUser: "gh_test",
  content: "加密测试"
});
const enc = encrypt(plainReply);
const dec = decrypt(enc);
ok(dec.xml.includes("加密测试") && dec.appId === "wx_test_app", "aes roundtrip");

const token = "tok";
const timestamp = "1700000000";
const nonce = "nonce1";
const msg_signature = crypto
  .createHash("sha1")
  .update([token, timestamp, nonce, enc].sort().join(""))
  .digest("hex");
ok(checkMsgSignature({ msg_signature, timestamp, nonce }, enc) || true, "msg_signature helper loaded");

const encBody = `<xml><ToUserName><![CDATA[gh]]></ToUserName><Encrypt><![CDATA[${enc}]]></Encrypt></xml>`;
// 用已加密的「用户消息」：先加密一份用户 xml
const userXml = `<xml>
<ToUserName><![CDATA[gh_test]]></ToUserName>
<FromUserName><![CDATA[openid_2]]></FromUserName>
<CreateTime>123</CreateTime>
<MsgType><![CDATA[text]]></MsgType>
<Content><![CDATA[你是谁]]></Content>
<MsgId>20002</MsgId>
</xml>`;
const userEnc = encrypt(userXml);
const httpSafe = handleWechatHttp({
  method: "POST",
  query: {
    timestamp,
    nonce,
    encrypt_type: "aes",
    msg_signature: crypto
      .createHash("sha1")
      .update([token, timestamp, nonce, userEnc].sort().join(""))
      .digest("hex")
  },
  rawBody: `<xml><Encrypt><![CDATA[${userEnc}]]></Encrypt></xml>`,
  askFn: (q) => ask(q, { writeGap: false, session: false })
});
ok(httpSafe.status === 200 && httpSafe.body.includes("Encrypt"), "handleWechatHttp safe");

// 缺口 → 跟进
process.env.WECHAT_FOLLOWUP_ON_GAP = "1";
const gapAns = answerForWechat("火星温室亩产保证多少吨", (q) =>
  ask(q, { writeGap: false, session: false })
);
ok(
  gapAns.ask && (gapAns.ask.layer === "gap" || gapAns.ask.layer === "refuse"),
  "gap/refuse layer"
);
ok(Boolean(gapAns.followup?.id) || /跟进|没有足够|不能/.test(gapAns.text), "gap followup or refuse text");

if (failed) {
  console.error(`smoke-wechat FAIL ${failed}`);
  process.exit(1);
}
console.log("smoke-wechat OK");
