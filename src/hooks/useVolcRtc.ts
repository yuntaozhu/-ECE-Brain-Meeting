import { useCallback, useEffect, useRef, useState } from "react";
import VERTC, { MediaType } from "@volcengine/rtc";
import { useMeetingStore } from "../store";
import { apiUrl } from "../lib/apiBase";
import { logger } from "../lib/logger";

export type VolcRtcStatus =
  | "idle"
  | "connecting"
  | "connected"
  | "error"
  | "unconfigured";

export interface VolcRemotePeer {
  userId: string;
  hasAudio: boolean;
}

/**
 * E2: Volcengine RTC multi-party audio.
 * Requires VOLC_RTC_APP_ID + VOLC_RTC_APP_KEY on the persistent backend.
 */
export function useVolcRtc(enabled: boolean) {
  const meetingId = useMeetingStore((s) => s.meetingId);
  const userName = useMeetingStore((s) => s.userName);
  const micOn = useMeetingStore((s) => s.micOn);
  const setMicOn = useMeetingStore((s) => s.setMicOn);

  const [status, setStatus] = useState<VolcRtcStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [remotePeers, setRemotePeers] = useState<VolcRemotePeer[]>([]);
  const engineRef = useRef<ReturnType<typeof VERTC.createEngine> | null>(null);

  const leave = useCallback(async () => {
    const engine = engineRef.current;
    if (!engine) {
      setStatus("idle");
      setRemotePeers([]);
      return;
    }
    try {
      await engine.unpublishStream?.(MediaType.AUDIO).catch(() => undefined);
      await engine.stopAudioCapture?.().catch(() => undefined);
      await engine.leaveRoom?.().catch(() => undefined);
      VERTC.destroyEngine(engine);
    } catch {
      /* ignore */
    }
    engineRef.current = null;
    setRemotePeers([]);
    setStatus("idle");
  }, []);

  const join = useCallback(async () => {
    if (!enabled) return;
    setError(null);
    setStatus("connecting");

    let stableUserId = "";
    try {
      const key = `dadimeeting_uid_${meetingId}`;
      stableUserId = localStorage.getItem(key) || "";
      if (!stableUserId) {
        stableUserId =
          typeof crypto !== "undefined" && crypto.randomUUID
            ? `user_${crypto.randomUUID()}`
            : `user_${Date.now()}`;
        localStorage.setItem(key, stableUserId);
      }
    } catch {
      stableUserId = `user_${Date.now()}`;
    }

    try {
      const tokenRes = await fetch(apiUrl("/api/volc/rtc/token"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomId: meetingId,
          userId: stableUserId,
          userName
        })
      });
      const tokenJson = await tokenRes.json();
      if (!tokenRes.ok || !tokenJson.success) {
        if (tokenJson.code === "UNCONFIGURED") {
          setStatus("unconfigured");
          setError(tokenJson.error || "未配置火山 RTC 凭证");
          return;
        }
        throw new Error(tokenJson.error || "Token 签发失败");
      }

      const engine = VERTC.createEngine(tokenJson.appId);
      engineRef.current = engine;

      engine.on(VERTC.events.onUserPublishStream, (e: { userId?: string }) => {
        const uid = String(e.userId || "");
        if (!uid) return;
        setRemotePeers((prev) => {
          if (prev.some((p) => p.userId === uid)) return prev;
          return [...prev, { userId: uid, hasAudio: true }];
        });
        engine.subscribeStream?.(uid, MediaType.AUDIO).catch(() => undefined);
        engine.play?.(uid, MediaType.AUDIO).catch(() => undefined);
      });

      engine.on(VERTC.events.onUserUnpublishStream, (e: { userId?: string }) => {
        const uid = String(e.userId || "");
        setRemotePeers((prev) => prev.filter((p) => p.userId !== uid));
      });

      engine.on(VERTC.events.onError, (e: { errorCode?: number | string }) => {
        logger.log("ERROR", "VolcRTC", "engine error", e);
        setError(`RTC 错误: ${e?.errorCode ?? "unknown"}`);
      });

      await engine.joinRoom(
        tokenJson.token,
        tokenJson.rtcRoomId || tokenJson.roomId,
        {
          userId: stableUserId,
          extraInfo: JSON.stringify({ userName })
        },
        {
          isAutoPublish: true,
          isAutoSubscribeAudio: true,
          isAutoSubscribeVideo: false
        }
      );

      await engine.startAudioCapture();
      await engine.publishStream(MediaType.AUDIO);
      if (!useMeetingStore.getState().micOn) {
        await engine.stopAudioCapture().catch(() => undefined);
        setMicOn(false);
      } else {
        setMicOn(true);
      }

      setStatus("connected");
      logger.log("INFO", "VolcRTC", "joined room", {
        roomId: tokenJson.rtcRoomId,
        userId: stableUserId
      });
    } catch (err: any) {
      setStatus("error");
      setError(err?.message || String(err));
      logger.log("ERROR", "VolcRTC", "join failed", { error: err?.message || String(err) });
      await leave();
    }
  }, [enabled, meetingId, userName, setMicOn, leave]);

  useEffect(() => {
    if (enabled) join();
    else leave();
    return () => {
      leave();
    };
  }, [enabled]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const engine = engineRef.current;
    if (!engine || status !== "connected") return;
    (async () => {
      try {
        if (micOn) {
          await engine.startAudioCapture();
          await engine.publishStream(MediaType.AUDIO);
        } else {
          await engine.stopAudioCapture();
        }
      } catch {
        /* ignore toggle races */
      }
    })();
  }, [micOn, status]);

  return {
    status,
    error,
    remotePeers,
    join,
    leave,
    toggleMic: () => setMicOn(!micOn),
    micOn
  };
}
