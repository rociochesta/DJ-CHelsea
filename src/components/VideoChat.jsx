import React, { useEffect, useMemo, useState, useCallback } from "react";
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
  const [micPolicy, setMicPolicy] = useState("auto");
  const [activeSingerName, setActiveSingerName] = useState(null);
  const [participantMutes, setParticipantMutes] = useState({});
  const [lkRoom, setLkRoom] = useState(null);

  // 1) Persistent Firebase Listeners
  useEffect(() => {
    if (!roomCode) return;

    const policyRef = ref(database, `karaoke-rooms/${roomCode}/micPolicy`);
    const singerRef = ref(database, `karaoke-rooms/${roomCode}/activeSingerName`);
    const mutesRef = ref(database, `karaoke-rooms/${roomCode}/participantMutes`);

    const unsubPolicy = onValue(policyRef, (snap) => setMicPolicy(snap.val() === "open" ? "open" : "auto"));
    const unsubSinger = onValue(singerRef, (snap) => setActiveSingerName(snap.val() || null));
    const unsubMutes = onValue(mutesRef, (snap) => setParticipantMutes(snap.val() || {}));

    return () => {
      unsubPolicy();
      unsubSinger();
      unsubMutes();
    };
  }, [roomCode]);

  // 2) Token Fetching - Stable logic to prevent loops
  useEffect(() => {
    let isMounted = true;
    async function getToken() {
      if (!roomName || !userName) return;
      try {
        const res = await fetch("/.netlify/functions/livekit-token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ room: roomName, name: userName }),
        });
        const data = await res.json();
        if (isMounted) {
          if (!res.ok) throw new Error(data?.error || "Token failed");
          setToken(data.token);
        }
      } catch (e) {
        if (isMounted) setError(e.message);
      }
    }
    getToken();
    return () => { isMounted = false; };
  }, [roomName, userName]); // Only refetch if identity or room changes

  const localParticipantKey = useMemo(
    () => String(currentUserId || userName || "Guest").trim(),
    [currentUserId, userName]
  );

  // 3) Optimized Mic Control
  useEffect(() => {
    if (!lkRoom) return;

    const enforcePolicy = () => {
      const isSinger = activeSingerName && String(userName).trim() === String(activeSingerName).trim();
      const isForceMuted = !!participantMutes?.[localParticipantKey];
      
      const shouldBeEnabled = (micPolicy === "open" || isSinger) && !isForceMuted;

      lkRoom.localParticipant.setMicrophoneEnabled(shouldBeEnabled).catch(() => {});
    };

    enforcePolicy();
    // Use a slightly longer interval to prevent "Spamming" the LiveKit agent
    const interval = setInterval(enforcePolicy, 2000);
    return () => clearInterval(interval);
  }, [lkRoom, micPolicy, activeSingerName, participantMutes, localParticipantKey, userName]);

  const toggleParticipantMute = useCallback(async (pKey) => {
    if (!roomCode) return;
    const isMuted = !!participantMutes?.[pKey];
    await set(ref(database, `karaoke-rooms/${roomCode}/participantMutes/${pKey}`), !isMuted);
  }, [roomCode, participantMutes]);

  if (!livekitUrl) return <div className="p-6 text-red-400">Missing LiveKit URL</div>;
  if (error) return <div className="p-6 text-red-400">Error: {error}</div>;
  if (!token) return <div className="p-6 text-center animate-pulse">Establishing Secure Connection...</div>;

  return (
    <div className="rounded-2xl overflow-hidden border border-white/10 bg-black/30 flex flex-col">
      <div className="flex-1 min-h-[400px] relative">
        <LiveKitRoom
          serverUrl={livekitUrl}
          token={token}
          connect={true}
          video={true}
          audio={true}
          onConnected={setLkRoom}
          onDisconnected={() => setLkRoom(null)}
          style={{ height: '100%' }}
        >
          <VideoConference />
          <RoomAudioRenderer />
        </LiveKitRoom>
      </div>

      {/* Stats Bar */}
      <div className="px-4 py-2 text-[10px] uppercase tracking-widest text-white/40 bg-black/50 border-t border-white/10 flex justify-between">
        <span>Mode: {isDJ ? "DJ / Host" : "Singer"}</span>
        <span>Mic: {micPolicy} {micPolicy === 'auto' && `(Singer: ${activeSingerName || 'None'})`}</span>
      </div>

      {/* Moderation Panel (Only for DJ) */}
      {canModerate && (
        <div className="p-4 bg-black/40 border-t border-white/10">
          <p className="text-xs font-bold text-fuchsia-400 mb-3 uppercase tracking-wider">DJ Moderation</p>
          <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar">
            {participants.map((p) => {
              const pKey = String(p?.id || p?.name || "").trim();
              if (!pKey || pKey === localParticipantKey) return null;
              return (
                <div key={pKey} className="flex items-center justify-between bg-white/5 p-2 rounded-lg">
                  <span className="text-sm truncate pr-2">{p.name}</span>
                  <button
                    onClick={() => toggleParticipantMute(pKey)}
                    className={`text-[10px] px-3 py-1 rounded-full font-bold transition ${
                      participantMutes?.[pKey] ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/50" : "bg-red-500/20 text-red-400 border border-red-500/50"
                    }`}
                  >
                    {participantMutes?.[pKey] ? "ENABLE MIC" : "FORCE MUTE"}
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