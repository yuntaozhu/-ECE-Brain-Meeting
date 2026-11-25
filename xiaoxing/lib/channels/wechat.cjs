/**
 * 微信公众号接入（明文 + 可选安全模式）
 *
 * 环境变量：
 * - WECHAT_TOKEN（验签必填）
 * - WECHAT_AES_KEY + WECHAT_APP_ID（安全模式）
 * - WECHAT_SKIP_VERIFY=1（仅本地）
 * - WECHAT_FOLLOWUP_ON_GAP=1（缺口/拒答写农服跟进，默认开）
 */
const crypto = require("crypto");
const { encrypt, decrypt, safeModeEnabled, wechatAppId } = require("./wechatCrypto.cjs");

function wechatToken() {
  return process.env.WECHAT_TOKEN || "";
}

function skipVerify() {
  return process.env.WECHAT_SKIP_VERIFY === "1" || process.env.WECHAT_SKIP_VERIFY === "true";
}

function followupOnGap() {
  const v = process.env.WECHAT_FOLLOWUP_ON_GAP;
  if (v === "0" || v === "false") return false;
  return true;
}

function sha1SortJoin(parts) {
  return crypto
    .createHash("sha1")
    .update(parts.map(String).sort().join(""))
    .digest("hex");
}

/** URL 接入验签（明文 echo / 兼容） */
function checkSignature(query) {
  if (skipVerify()) return true;
  const token = wechatToken();
  if (!token) return false;
  const { signature, timestamp, nonce } = query || {};
  if (!signature || !timestamp || !nonce) return false;
  return sha1SortJoin([token, timestamp, nonce]) === signature;
}

/** 安全模式 msg_signature（含 encrypt） */
function checkMsgSignature(query, encrypt) {
  if (skipVerify()) return true;
  const token = wechatToken();
  if (!token) return false;
  const { msg_signature, timestamp, nonce } = query || {};
  if (!msg_signature || !timestamp || !nonce || !encrypt) return false;
  return sha1SortJoin([token, timestamp, nonce, encrypt]) === msg_signature;
}

function parseQuery(url) {
  const q = {};
  const i = String(url || "").indexOf("?");
  if (i < 0) return q;
  for (const part of url.slice(i + 1).split("&")) {
    const [k, v] = part.split("=");
    if (k) q[decodeURIComponent(k)] = decodeURIComponent(v || "");
  }
  return q;
}

function xmlTag(xml, tag) {
  const m = String(xml || "").match(
    new RegExp(`<${tag}><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>|<${tag}>([\\s\\S]*?)<\\/${tag}>`, "i")
  );
  if (!m) return "";
  return String(m[1] || m[2] || "").trim();
}

function parseIncomingXml(xml) {
  return {
    toUser: xmlTag(xml, "ToUserName"),
    fromUser: xmlTag(xml, "FromUserName"),
    msgType: xmlTag(xml, "MsgType"),
    content: xmlTag(xml, "Content"),
    msgId: xmlTag(xml, "MsgId"),
    event: xmlTag(xml, "Event"),
    encrypt: xmlTag(xml, "Encrypt")
  };
}

function replyTextXml({ toUser, fromUser, content }) {
  const ts = Math.floor(Date.now() / 1000);
  const safe = String(content || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return (
    `<xml>` +
    `<ToUserName><![CDATA[${toUser}]]></ToUserName>` +
    `<FromUserName><![CDATA[${fromUser}]]></FromUserName>` +
    `<CreateTime>${ts}</CreateTime>` +
    `<MsgType><![CDATA[text]]></MsgType>` +
    `<Content><![CDATA[${safe}]]></Content>` +
    `</xml>`
  );
}

function replyEncryptedXml({ encrypt, timestamp, nonce, token = wechatToken() }) {
  const msgSignature = sha1SortJoin([token, timestamp, nonce, encrypt]);
  return (
    `<xml>` +
    `<Encrypt><![CDATA[${encrypt}]]></Encrypt>` +
    `<MsgSignature><![CDATA[${msgSignature}]]></MsgSignature>` +
    `<TimeStamp>${timestamp}</TimeStamp>` +
    `<Nonce><![CDATA[${nonce}]]></Nonce>` +
    `</xml>`
  );
}

/** 简易去重：同 MsgId 5 分钟内只答一次 */
const _seen = new Map();
function rememberMsgId(msgId) {
  if (!msgId) return false;
  const now = Date.now();
  for (const [k, at] of _seen) {
    if (now - at > 5 * 60 * 1000) _seen.delete(k);
  }
  if (_seen.has(msgId)) return true;
  _seen.set(msgId, now);
  return false;
}

function maybeCreateFollowup(query, askResult) {
  if (!followupOnGap()) return null;
  const layer = askResult?.layer;
  if (layer !== "gap" && layer !== "refuse" && layer !== "llm") return null;
  try {
    const { createTask, listTasks } = require("../followup/board.cjs");
    const title = `微信：${String(query).slice(0, 40)}`;
    const dup = listTasks().some(
      (t) => t.kind === "wechat_fragment" && t.sourceQuery === query && t.status !== "done"
    );
    if (dup) return null;
    return createTask({
      title,
      kind: "wechat_fragment",
      sourceQuery: query,
      note: layer,
      meta: { channel: "wechat", layer }
    });
  } catch (_) {
    return null;
  }
}

/**
 * @param {string} queryText
 * @param {(q:string)=>any} askFn
 */
function answerForWechat(queryText, askFn) {
  const q = String(queryText || "").trim();
  const r = askFn(q);
  const follow = maybeCreateFollowup(q, r);
  const reply = (r && r.reply) || "我暂时没有依据回答，已记入待复盘。";
  const tag = r?.layer ? `【${r.layer}】` : "";
  const tip = follow ? "（已记入农服跟进）" : "";
  let more = "";
  try {
    const { formatMoreQuestionsInline } = require("../ask/moreQuestions.cjs");
    more = formatMoreQuestionsInline(r?.moreQuestions || [], 3);
  } catch (_) {}
  const moreBit = more ? `\n${more}` : "";
  return {
    text: `${tag}${reply}${tip}${moreBit}`.slice(0, 680),
    ask: r,
    followup: follow
  };
}

function publicConfig() {
  return {
    tokenConfigured: Boolean(wechatToken()),
    skipVerify: skipVerify(),
    safeMode: safeModeEnabled(),
    appIdConfigured: Boolean(wechatAppId()),
    followupOnGap: followupOnGap()
  };
}

/**
 * 统一 HTTP 处理（供 serve.cjs）
 * @returns {{ status: number, body: string, contentType: string, meta?: object }}
 */
function handleWechatHttp({ method, query, rawBody, askFn }) {
  const q = query || {};
  const useSafe = safeModeEnabled();

  if (method === "GET") {
    if (useSafe && q.encrypt_type === "aes" && q.echostr) {
      if (!checkMsgSignature(q, q.echostr) && !checkSignature(q)) {
        return { status: 403, body: "invalid signature", contentType: "text/plain; charset=utf-8" };
      }
      try {
        // 安全模式 URL 验证：解密后 msg 即为要原样返回的 echostr 明文
        const { xml: echo } = decrypt(q.echostr);
        return { status: 200, body: echo, contentType: "text/plain; charset=utf-8" };
      } catch (err) {
        // 兼容：部分公众号 GET echostr 仍是明文
        if (checkSignature(q)) {
          return { status: 200, body: q.echostr || "ok", contentType: "text/plain; charset=utf-8" };
        }
        return {
          status: 400,
          body: `decrypt echostr failed: ${err.message || err}`,
          contentType: "text/plain; charset=utf-8"
        };
      }
    }
    if (!checkSignature(q)) {
      return { status: 403, body: "invalid signature", contentType: "text/plain; charset=utf-8" };
    }
    return { status: 200, body: q.echostr || "ok", contentType: "text/plain; charset=utf-8" };
  }

  if (method !== "POST") {
    return { status: 405, body: "method not allowed", contentType: "text/plain; charset=utf-8" };
  }

  let xml = String(rawBody || "");
  let envelope = parseIncomingXml(xml);

  if (envelope.encrypt || (useSafe && q.encrypt_type === "aes")) {
    const enc = envelope.encrypt || q.echostr;
    if (!checkMsgSignature(q, enc) && !skipVerify()) {
      return { status: 403, body: "invalid msg_signature", contentType: "text/plain; charset=utf-8" };
    }
    try {
      const dec = decrypt(enc);
      xml = dec.xml;
      envelope = parseIncomingXml(xml);
    } catch (err) {
      return {
        status: 400,
        body: `decrypt failed: ${err.message || err}`,
        contentType: "text/plain; charset=utf-8"
      };
    }
  } else if (!checkSignature(q)) {
    return { status: 403, body: "invalid signature", contentType: "text/plain; charset=utf-8" };
  }

  if (rememberMsgId(envelope.msgId)) {
    return { status: 200, body: "success", contentType: "text/plain; charset=utf-8", meta: { dup: true } };
  }

  let text = "";
  if (envelope.msgType === "text") text = envelope.content;
  else if (envelope.msgType === "event" && /subscribe/i.test(envelope.event || "")) text = "你是谁";

  const answered = text
    ? answerForWechat(text, askFn)
    : { text: "请直接发送文字问题，例如：宁玉有什么特点", ask: null, followup: null };

  const plain = replyTextXml({
    toUser: envelope.fromUser,
    fromUser: envelope.toUser,
    content: typeof answered === "string" ? answered : answered.text
  });

  if (useSafe || envelope.encrypt) {
    const timestamp = String(q.timestamp || Math.floor(Date.now() / 1000));
    const nonce = String(q.nonce || crypto.randomBytes(8).toString("hex"));
    const enc = encrypt(plain);
    const out = replyEncryptedXml({ encrypt: enc, timestamp, nonce });
    return {
      status: 200,
      body: out,
      contentType: "application/xml; charset=utf-8",
      meta: { safe: true, followup: answered.followup || null }
    };
  }

  return {
    status: 200,
    body: plain,
    contentType: "application/xml; charset=utf-8",
    meta: { safe: false, followup: answered.followup || null }
  };
}

module.exports = {
  wechatToken,
  skipVerify,
  checkSignature,
  checkMsgSignature,
  parseQuery,
  parseIncomingXml,
  replyTextXml,
  replyEncryptedXml,
  answerForWechat,
  handleWechatHttp,
  publicConfig,
  safeModeEnabled,
  rememberMsgId
};
