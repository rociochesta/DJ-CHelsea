import { useEffect, useMemo } from "react";

export function useAutoMicPolicy(
  room,
  { currentSong, currentUserName, enabled = true } = {}
) {
  const singerName = useMemo(() => {
    const s = currentSong?.requestedBy || currentSong?.singerName || "";
    return String(s).trim();
  }, [currentSong?.requestedBy, currentSong?.singerName]);

  const myName = useMemo(() => String(currentUserName || "").trim(), [currentUserName]);

  useEffect(() => {
    if (!enabled) return;
    if (!room?.localParticipant) return;

    const lp = room.localParticipant;

    const computeAllowed = () => {
      if (!singerName || !myName) return false;
      return singerName === myName;
    };

    const enforce = async () => {
      const allowed = computeAllowed();
      const wantsEnabled = !!allowed;

      // only touch the mic if it’s not already in the desired state
      try {
        if (!!lp.isMicrophoneEnabled !== wantsEnabled) {
          await lp.setMicrophoneEnabled(wantsEnabled);
        }
      } catch {
        // swallow errors; we don't want UI crashes from policy
      }
    };

    // enforce immediately on changes
    enforce();

    // if user tries to unmute while not allowed, snap it back off
    const onMicChanged = () => {
      enforce();
    };

    // LiveKit emits events on participant
    lp.on?.("trackPublished", onMicChanged);
    lp.on?.("trackUnpublished", onMicChanged);
    lp.on?.("trackMuted", onMicChanged);
    lp.on?.("trackUnmuted", onMicChanged);

    // also handle reconnects / room events (safe, low frequency)
    const onReconnected = () => enforce();
    room.on?.("reconnected", onReconnected);

    return () => {
      lp.off?.("trackPublished", onMicChanged);
      lp.off?.("trackUnpublished", onMicChanged);
      lp.off?.("trackMuted", onMicChanged);
      lp.off?.("trackUnmuted", onMicChanged);

      room.off?.("reconnected", onReconnected);
    };
  }, [room, singerName, myName, enabled]);
}