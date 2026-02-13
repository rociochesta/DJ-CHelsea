import React, { useEffect, useMemo, useState } from "react";
import {
  LiveKitRoom,
  VideoConference,
  RoomAudioRenderer,
} from "@livekit/components-react";
import "@livekit/components-styles";

import { database, ref, onValue, set } from "../utils/firebase";

function makeRoomName(roomCode) {
  return `dj-chelsea-${String(roomCode || "lobby")
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "-")}`;
}

export default function VideoChat({
  roomCode,
  userName,
  currentUserId,
  participants = [],
  isDJ = false,
  canModerate = false,
}) {
  const livekitUrl = import.meta.env.VITE_LIVEKIT_URL;

  const roomName = useMemo(() => makeRoomName(roomCode), [roomCode]);

  const [token, setToken] = useState(null);
  const [error, setError] = useState(null);

  // ✅ mic policy from Firebase
  const [micPolicy, setMicPolicy] = useState("auto"); // "auto" | "open"
  const [activeSingerName, setActiveSingerName] = useState(null);
  const [participantMutes, setParticipantMutes] = useState({});

  // ✅ hold the connected LiveKit room instance
  const [lkRoom, setLkRoom] = useState(null);

  // 1) Listen to Firebase mic state
  useEffect(() => {
    if (!roomCode) return;

    const policyRef = ref(database, `karaoke-rooms/${roomCode}/micPolicy`);
    const singerRef = ref(database, `karaoke-rooms/${roomCode}/activeSingerName`);
    const mutesRef = ref(database, `karaoke-rooms/${roomCode}/participantMutes`);

    const unsubPolicy = onValue(policyRef, (snap) => {
      const v = snap.val();
      setMicPolicy(v === "open" ? "open" : "auto");
    });

    const unsubSinger = onValue(singerRef, (snap) => {
      const v = snap.val();
      setActiveSingerName(v || null);
    });

    const unsubMutes = onValue(mutesRef, (snap) => {
      setParticipantMutes(snap.val() || {});
    });

    return () => {
      unsubPolicy?.();
      unsubSinger?.();
      unsubMutes?.();
    };
  }, [roomCode]);

  // 2) Fetch LiveKit token
  useEffect(() => {
    let cancelled = false;

    async function getToken() {
      setError(null);
      setToken(null);

      try {
        const res = await fetch("/.netlify/functions/livekit-token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            room: roomName,
            name: userName || "Guest",
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "Token request failed");
        if (!cancelled) setToken(data.token);
      } catch (e) {
        if (!cancelled) setError(String(e?.message || e));
      }
    }

    if (roomName && userName) getToken();

    return () => {
      cancelled = true;
    };
  }, [roomName, userName]);

  const localParticipantKey = useMemo(
    () => String(currentUserId || userName || "Guest").trim(),
    [currentUserId, userName]
  );

  // 3) Enforce mic rule (AUTO mode + force-mute)
  useEffect(() => {
    if (!lkRoom) return;

    const localName = String(userName || "Guest").trim();
    const singerName = String(activeSingerName || "").trim();
    const isForceMuted = Boolean(participantMutes?.[localParticipantKey]);

    const shouldBeAllowedByPolicy =
      micPolicy === "open" || (!!singerName && localName === singerName);
    const shouldBeAllowed = shouldBeAllowedByPolicy && !isForceMuted;

    // apply immediately (best effort)
    try {
      lkRoom.localParticipant.setMicrophoneEnabled(shouldBeAllowed);
    } catch {}

    // if AUTO and you're not the singer (or force-muted), keep forcing mute
    if (shouldBeAllowed) return;

    const interval = setInterval(() => {
      try {
        lkRoom.localParticipant.setMicrophoneEnabled(false);
      } catch {}
    }, 800);

    return () => clearInterval(interval);
  }, [lkRoom, micPolicy, activeSingerName, participantMutes, localParticipantKey, userName]);

  const toggleParticipantMute = async (participantKey) => {
    if (!roomCode || !participantKey) return;
    const isMuted = Boolean(participantMutes?.[participantKey]);
    await set(
      ref(database, `karaoke-rooms/${roomCode}/participantMutes/${participantKey}`),
      !isMuted
    );
  };

  const muteAllParticipants = async () => {
    if (!roomCode) return;
    const updates = {};
    participants.forEach((participant) => {
      const participantKey = String(participant?.id || participant?.name || "").trim();
      if (participantKey && participantKey !== localParticipantKey) {
        updates[participantKey] = true;
      }
    });
    await set(ref(database, `karaoke-rooms/${roomCode}/participantMutes`), updates);
  };

  if (!livekitUrl) {
    return (
      <div className="rounded-2xl border border-red-500/30 bg-red-900/20 p-6 text-center">
        <div className="text-4xl mb-3">⚠️</div>
        <p className="text-red-400 font-semibold mb-2">Missing VITE_LIVEKIT_URL</p>
        <p className="text-sm text-white/70">
          Add it to your .env and Netlify env vars.
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-500/30 bg-red-900/20 p-6 text-center">
        <div className="text-4xl mb-3">⚠️</div>
        <p className="text-red-400 font-semibold mb-2">Video failed</p>
        <p className="text-sm text-white/70">{error}</p>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="rounded-2xl border border-white/10 bg-black/30 p-6 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-fuchsia-500 mx-auto mb-3" />
        <p className="text-white/70">Connecting to LiveKit…</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl overflow-hidden border border-white/10 bg-black/30">
      <LiveKitRoom
        serverUrl={livekitUrl}
        token={token}
        connect={true}
        video={true}
        audio={true}
        data-lk-theme="default"
        style={{ height: "60vh", minHeight: 420 }}
        onConnected={(room) => setLkRoom(room)}
        onDisconnected={() => setLkRoom(null)}
      >
        <RoomAudioRenderer />
        <VideoConference />
      </LiveKitRoom>

      <div className="px-3 py-2 text-xs text-white/50 border-t border-white/10 bg-black/30">
        Mode: <span className="text-white/80">{isDJ ? "DJ" : "Participant"}</span>
        {" • "}
        Mic policy: <span className="text-white/80">{micPolicy.toUpperCase()}</span>
        {micPolicy === "auto" && (
          <>
            {" "}• Singer: <span className="text-white/80">{activeSingerName || "—"}</span>
          </>
        )}
      </div>

      {canModerate && (
        <div className="border-t border-white/10 bg-black/20 p-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold text-white">DJ moderation</p>
            <button
              onClick={muteAllParticipants}
              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-red-500/80 hover:bg-red-500"
            >
              Mute all
            </button>
          </div>
          <div className="space-y-2 max-h-32 overflow-y-auto pr-1">
            {participants
              .filter((participant) => participant?.name)
              .map((participant) => {
                const name = participant.name;
                const participantKey = String(participant?.id || participant?.name || "").trim();
                if (!participantKey || participantKey === localParticipantKey) return null;
                const isMuted = Boolean(participantMutes?.[participantKey]);
                return (
                  <div key={participantKey} className="flex items-center justify-between text-sm">
                    <span className="text-white/80 truncate">{name}</span>
                    <button
                      onClick={() => toggleParticipantMute(participantKey)}
                      className="px-2.5 py-1 rounded-lg border border-white/20 hover:bg-white/10"
                    >
                      {isMuted ? "Give mic" : "Force mute"}
                    </button>
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}
