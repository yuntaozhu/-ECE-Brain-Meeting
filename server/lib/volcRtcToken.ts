import { createHmac } from "node:crypto";

const VERSION = "001";
const APP_ID_LENGTH = 24;

export const privileges = {
  PrivPublishStream: 0,
  privPublishAudioStream: 1,
  privPublishVideoStream: 2,
  privPublishDataStream: 3,
  PrivSubscribeStream: 4
} as const;

type PrivilegeKey = keyof typeof privileges;

class ByteBuf {
  private buffer = Buffer.alloc(1024);
  private position = 0;

  private ensureCapacity(size: number) {
    if (this.position + size <= this.buffer.length) return;
    const next = Buffer.alloc(Math.max(this.buffer.length * 2, this.position + size));
    this.buffer.copy(next, 0, 0, this.position);
    this.buffer = next;
  }

  putUint16(value: number) {
    this.ensureCapacity(2);
    this.buffer.writeUInt16LE(value, this.position);
    this.position += 2;
    return this;
  }

  putUint32(value: number) {
    this.ensureCapacity(4);
    this.buffer.writeUInt32LE(value, this.position);
    this.position += 4;
    return this;
  }

  putBytes(bytes: Buffer) {
    this.putUint16(bytes.length);
    this.ensureCapacity(bytes.length);
    bytes.copy(this.buffer, this.position);
    this.position += bytes.length;
    return this;
  }

  putString(str: string) {
    return this.putBytes(Buffer.from(str));
  }

  putTreeMapUInt32(map: Record<number, number>) {
    const entries = Object.entries(map);
    this.putUint16(entries.length);
    for (const [key, value] of entries) {
      this.putUint16(Number(key));
      this.putUint32(value);
    }
    return this;
  }

  pack() {
    const out = Buffer.alloc(this.position);
    this.buffer.copy(out, 0, 0, this.position);
    return out;
  }
}

/** Volcengine / BytePlus RTC AccessToken (server-side only). */
export class AccessToken {
  private privilegesMap: Record<number, number> = {};
  private issuedAt = Math.floor(Date.now() / 1000);
  private nonce = Math.floor(Math.random() * 0xffffffff);
  private expireAt = 0;

  constructor(
    private readonly appId: string,
    private readonly appKey: string,
    private readonly roomId: string,
    private readonly userId: string
  ) {}

  addPrivilege(privilege: PrivilegeKey, expireTimestamp: number) {
    const value = privileges[privilege];
    this.privilegesMap[value] = expireTimestamp;
    if (privilege === "PrivPublishStream") {
      this.privilegesMap[privileges.privPublishVideoStream] = expireTimestamp;
      this.privilegesMap[privileges.privPublishAudioStream] = expireTimestamp;
      this.privilegesMap[privileges.privPublishDataStream] = expireTimestamp;
    }
  }

  expireTime(expireTimestamp: number) {
    this.expireAt = expireTimestamp;
  }

  serialize() {
    if (!this.appId || this.appId.length !== APP_ID_LENGTH) {
      throw new Error(`VOLC_RTC_APP_ID must be ${APP_ID_LENGTH} characters`);
    }
    const message = this.packMessage();
    const signature = createHmac("sha256", this.appKey).update(message).digest();
    const content = new ByteBuf().putBytes(message).putBytes(signature).pack();
    return VERSION + this.appId + content.toString("base64");
  }

  private packMessage() {
    const buf = new ByteBuf();
    buf.putUint32(this.nonce);
    buf.putUint32(this.issuedAt);
    buf.putUint32(this.expireAt);
    buf.putString(this.roomId);
    buf.putString(this.userId);
    buf.putTreeMapUInt32(this.privilegesMap);
    return buf.pack();
  }
}

export function issueVolcRtcToken(params: {
  appId: string;
  appKey: string;
  roomId: string;
  userId: string;
  ttlSec?: number;
}) {
  const ttl = params.ttlSec ?? 60 * 60 * 24;
  const expireAt = Math.floor(Date.now() / 1000) + ttl;
  const token = new AccessToken(params.appId, params.appKey, params.roomId, params.userId);
  token.expireTime(expireAt);
  token.addPrivilege("PrivPublishStream", expireAt);
  token.addPrivilege("PrivSubscribeStream", expireAt);
  return { token: token.serialize(), expireAt };
}

/** RTC room ids prefer alphanumeric; map business roomId safely. */
export function toVolcRtcRoomId(businessRoomId: string): string {
  const cleaned = String(businessRoomId || "room")
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .slice(0, 64);
  return cleaned || "ece_room";
}
