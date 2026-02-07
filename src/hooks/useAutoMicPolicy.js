import { useEffect, useMemo } from "react";

export function useAutoMicPolicy(room, { currentSong, currentUserName, enabled = true } = {}) {
  const singerName = useMemo(() => {
    const s = currentSong?.requestedBy || currentSong?.singerName || "";
    return String(s).trim();
  }, [currentSong?.requestedBy, currentSong?.singerName]);

  const myName = useMemo(() => String(currentUserName || "").trim(), [currentUserName]);

  useEffect(() => {
    if (!enabled) return;
    if (!room) return;

    const shouldBeAllowed = singerName && myName && singerName === myName;

    try {
      room.localParticipant.setMicrophoneEnabled(!!shouldBeAllowed);
    } catch {}

    if (shouldBeAllowed) return;

    const interval = setInterval(() => {
      try {
        room.localParticipant.setMicrophoneEnabled(false);
      } catch {}
    }, 700);

    return () => clearInterval(interval);
  }, [room, singerName, myName, enabled]);
}