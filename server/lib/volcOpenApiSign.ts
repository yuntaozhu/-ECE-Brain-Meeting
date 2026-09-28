/**
 * 火山引擎 OpenAPI V4 签名（HMAC-SHA256）。
 * 用于 rtc.volcengineapi.com，不要用 API Key 直接签 RTC。
 */
import { createHash, createHmac } from "node:crypto";

export type VolcSignInput = {
  method?: string;
  host: string;
  path?: string;
  query: Record<string, string>;
  body: string;
  accessKey: string;
  secretKey: string;
  region: string;
  service: string;
  now?: Date;
};

function sha256Hex(content: string) {
  return createHash("sha256").update(content, "utf8").digest("hex");
}

function hmac(key: Buffer | string, content: string) {
  return createHmac("sha256", key).update(content, "utf8").digest();
}

function encodeRfc3986(value: string) {
  return encodeURIComponent(value).replace(/[!'()*]/g, (ch) =>
    `%${ch.charCodeAt(0).toString(16).toUpperCase()}`
  );
}

export function canonicalQuery(query: Record<string, string>) {
  return Object.keys(query)
    .sort()
    .map((key) => `${encodeRfc3986(key)}=${encodeRfc3986(query[key] ?? "")}`)
    .join("&");
}

export function signVolcOpenApi(input: VolcSignInput) {
  const method = (input.method || "POST").toUpperCase();
  const pathName = input.path || "/";
  const now = input.now || new Date();
  const xDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const shortDate = xDate.slice(0, 8);
  const payloadHash = sha256Hex(input.body || "");
  const signedHeaders = "content-type;host;x-content-sha256;x-date";
  const canonicalHeaders =
    `content-type:application/json\n` +
    `host:${input.host}\n` +
    `x-content-sha256:${payloadHash}\n` +
    `x-date:${xDate}\n`;
  const canonicalRequest = [
    method,
    pathName,
    canonicalQuery(input.query),
    canonicalHeaders,
    signedHeaders,
    payloadHash
  ].join("\n");
  const credentialScope = `${shortDate}/${input.region}/${input.service}/request`;
  const stringToSign = ["HMAC-SHA256", xDate, credentialScope, sha256Hex(canonicalRequest)].join("\n");
  const kDate = hmac(input.secretKey, shortDate);
  const kRegion = hmac(kDate, input.region);
  const kService = hmac(kRegion, input.service);
  const kSigning = hmac(kService, "request");
  const signature = createHmac("sha256", kSigning).update(stringToSign, "utf8").digest("hex");
  const authorization =
    `HMAC-SHA256 Credential=${input.accessKey}/${credentialScope}, ` +
    `SignedHeaders=${signedHeaders}, Signature=${signature}`;
  return { authorization, xDate, payloadHash, canonicalQuery: canonicalQuery(input.query) };
}
