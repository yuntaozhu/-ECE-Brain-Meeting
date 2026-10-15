import { $, S, PHASE, SILENCE_PATROL_MS } from "../state.js";
import { runPatrol } from "./runPatrol.js";

export function schedulePatrol() {
  if (!$("autoPatrol").checked || !S.listening) return;
  if (Date.now() < S.hostSpeakingUntil || S.duplexPhase !== PHASE.IDLE) {
    if (S.silenceTimer) clearTimeout(S.silenceTimer);
    const delay = Math.max(
      SILENCE_PATROL_MS,
      S.hostSpeakingUntil - Date.now() + 2000,
      (S.cooldownUntil || 0) - Date.now() + 1000
    );
    S.silenceTimer = setTimeout(() => void runPatrol("silence"), delay);
    return;
  }
  if (S.silenceTimer) clearTimeout(S.silenceTimer);
  S.silenceTimer = setTimeout(() => void runPatrol("silence"), SILENCE_PATROL_MS);
}
