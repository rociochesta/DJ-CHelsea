import React, { useEffect, useMemo, useState } from "react";
import {
  LiveKitRoom,
  VideoConference,
  RoomAudioRenderer,
} from "@livekit/components-react";
import "@livekit/components-styles";

import { database, ref, onValue } from "../utils/firebase";

function makeRoomName(roomCode) {
  return `dj-chelsea-${String(roomCode || "lobby")
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "-")}`;
}

export default function VideoChat({ roomCode, userName }) {
  const livekitUrl = import.meta.env.VITE_LIVEKIT_URL;

  const roomName = useMemo(() => makeRoomName(roomCode), [roomCode]);

  const [token, setToken] = useState(null);
  const [error, setError] = useState(null);

  // ✅ mic policy from Firebase
  const [micPolicy, setMicPolicy] = useState("auto"); // "auto" | "open"
  const [activeSingerName, setActiveSingerName] = useState(null);

  // ✅ hold the connected LiveKit room instance
  const [lkRoom, setLkRoom] = useState(null);

  // 1) Listen to Firebase mic state
  useEffect(() => {
    if (!roomCode) return;

    const policyRef = ref(database, `karaoke-rooms/${roomCode}/micPolicy`);
    const singerRef = ref(database, `karaoke-rooms/${roomCode}/activeSingerName`);

    const unsubPolicy = onValue(policyRef, (snap) => {
      const v = snap.val();
      setMicPolicy(v === "open" ? "open" : "auto");
    });

    const unsubSinger = onValue(singerRef, (snap) => {
      const v = snap.val();
      setActiveSingerName(v || null);
    });

    return () => {
      unsubPolicy?.();
      unsubSinger?.();
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

  // 3) Enforce mic rule (AUTO mode)
  useEffect(() => {
    if (!lkRoom) return;

    const localName = String(userName || "Guest").trim();
    const singerName = String(activeSingerName || "").trim();

    const shouldBeAllowed =
      micPolicy === "open" || (!!singerName && localName === singerName);

    // apply immediately (best effort)
    try {
      lkRoom.localParticipant.setMicrophoneEnabled(shouldBeAllowed);
    } catch {}

    // if AUTO and you're not the singer, keep forcing mute (so UI unmute doesn't stick)
    if (micPolicy !== "auto" || shouldBeAllowed) return;

    const interval = setInterval(() => {
      try {
        lkRoom.localParticipant.setMicrophoneEnabled(false);
      } catch {}
    }, 800);

    return () => clearInterval(interval);
  }, [lkRoom, micPolicy, activeSingerName, userName]);

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

      {/* tiny status line */}
      <div className="px-3 py-2 text-xs text-white/50 border-t border-white/10 bg-black/30">
        Mic policy: <span className="text-white/80">{micPolicy.toUpperCase()}</span>
        {micPolicy === "auto" && (
          <>
            {" "}
            • Singer:{" "}
            <span className="text-white/80">{activeSingerName || "—"}</span>
          </>
        )}
      </div>
    </div>
  );
}