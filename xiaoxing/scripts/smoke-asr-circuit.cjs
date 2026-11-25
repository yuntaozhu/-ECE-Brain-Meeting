"use strict";

/**
 * ASR 熔断单元冒烟（不连公网）
 * node scripts/smoke-asr-circuit.cjs
 */
const assert = require("assert");
const { createAsrCircuit, isNetworkFailure, classifyError } = require("../lib/asr/circuit.cjs");

function main() {
  assert.equal(classifyError({ code: "connect_timeout", message: "connect_timeout" }), "timeout");
  assert.equal(
    classifyError({ code: "socket_error", message: "getaddrinfo ENOTFOUND openspeech.bytedance.com" }),
    "dns"
  );
  assert.ok(
    isNetworkFailure({
      code: "socket_error",
      message: "getaddrinfo ENOTFOUND openspeech.bytedance.com"
    })
  );

  const c = createAsrCircuit({
    failThreshold: 3,
    baseBackoffMs: 30000,
    maxBackoffMs: 120000
  });

  const e1 = c.onFailure({ code: "connect_timeout", message: "connect_timeout" });
  assert.equal(e1.emit, true);
  assert.equal(e1.payload.circuit, "counting");
  assert.equal(e1.payload.failCount, 1);

  const e2 = c.onFailure({ code: "connect_timeout", message: "connect_timeout" });
  assert.equal(e2.payload.failCount, 2);

  const e3 = c.onFailure({
    code: "socket_error",
    message: "getaddrinfo ENOTFOUND openspeech.bytedance.com"
  });
  assert.equal(e3.payload.code, "circuit_open");
  assert.ok(e3.reconnectDelayMs >= 30000);
  assert.equal(c.isOpen(), true);

  const hold = c.onFailure({ code: "connect_timeout", message: "connect_timeout" });
  assert.equal(hold.payload.code, "circuit_hold");
  assert.equal(hold.emit, true); // first hold emits
  const hold2 = c.onFailure({ code: "connect_timeout", message: "connect_timeout" });
  assert.equal(hold2.emit, false); // suppressed until 10

  // 非网络错误不推进熔断计数语义（bypass）
  const cfg = createAsrCircuit({ failThreshold: 3 });
  const miss = cfg.onFailure({ code: "missing_speech_key", message: "缺密钥" });
  assert.equal(miss.payload.circuit, "bypass");
  assert.equal(cfg.snapshot().failCount, 0);

  const recovered = c.onSuccess();
  assert.equal(recovered.recovered, true);
  assert.equal(c.isOpen(), false);
  assert.equal(c.snapshot().failCount, 0);

  console.log(JSON.stringify({ ok: true, openPayload: e3.payload.code, hold: hold.payload.code }, null, 2));
}

main();
