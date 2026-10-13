const S = require("./kit.cjs");

/** @param {object} ctx */
async function handle(ctx) {
  const { lastFloor, lastHostText, sinceHostMs, a2aTrace, state, kbStatus } = ctx;
  const echoHit = S.looksLikeHostEcho(lastFloor, [lastHostText].filter(Boolean), { sinceHostMs });
  if (!echoHit.echo) return null;
  a2aTrace.push(S.newEvent("HostAgent", "AudioBridge", "ECHO_SKIP", { floor: lastFloor, echo: echoHit }));
  return S.baseResult({
    reason: "ECHO_SKIP",
    a2aTrace,
    agentMode: state.mode,
    kbStatus,
    wake: { lastFloor, echoSkipped: true }
  });
}

module.exports = { handle, name: "echoSkip" };
