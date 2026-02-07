import { useEffect, useMemo } from "react";

/**
 * AUTO mic policy:
 * - if there is a currentSong.requestedBy, only that name can unmute
 * - everyone else is forced muted
 *
 * Pass a LiveKit Room instance (from useRoomContext()).
 */
export function useAutoMicPolicy(room, { currentSong, currentUserName, enabled = true } = {}) {
  const singerName = useMemo(() => {
    const s = currentSong?.requestedBy || currentSong?.singerName || "";
    return String(s).trim();
  }, [currentSong?.requestedBy, currentSong?.singerName]);

  const myName = useMemo(() => String(currentUserName || "").trim(), [currentUserName]);

  useEffect(() => {
    if (!enabled) return;
    if (!room) return;

    // if no singer (no song), default to muted (safe)
    const shouldBeAllowed = singerName && myName && singerName === myName;

    // apply immediately
    try {
      room.localParticipant.setMicrophoneEnabled(!!shouldBeAllowed);
    } catch {}

    // If I'm NOT the singer, keep forcing mute so UI "unmute" doesn't stick.
    if (shouldBeAllowed) return;

    const interval = setInterval(() => {
      try {
        room.localParticipant.setMicrophoneEnabled(false);
      } catch {}
    }, 700);

    return () => clearInterval(interval);
  }, [room, singerName, myName, enabled]);
}