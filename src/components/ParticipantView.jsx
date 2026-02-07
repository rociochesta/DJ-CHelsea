import React, { useEffect, useMemo, useState } from "react";
import { LiveKitRoom, RoomAudioRenderer } from "@livekit/components-react";
import VideoPlayer from "./VideoPlayer";
import SongQueue from "./SongQueue";
import SingerSpotlight from "./SingerSpotlight";

function ParticipantView({ roomCode, currentUser, roomState }) {
  const [token, setToken] = useState("");
  const [lkError, setLkError] = useState("");

  const queue = useMemo(() => {
    return roomState?.queue ? Object.values(roomState.queue) : [];
  }, [roomState?.queue]);

  const currentSong = roomState?.currentSong || null;
  const participantMutes = roomState?.participantMutes || {};
  const participants = roomState?.participants ? Object.values(roomState.participants) : [];

  // --- LiveKit token fetch (Netlify function) ---
  useEffect(() => {
    let cancelled = false;

    async function getToken() {
      try {
        setLkError("");
        setToken("");

        const res = await fetch("/.netlify/functions/livekit-token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            room: roomCode,
            name: currentUser?.name || "Guest",
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "Failed to fetch LiveKit token");

        if (!cancelled) setToken(data.token);
      } catch (e) {
        if (!cancelled) setLkError(String(e?.message || e));
      }
    }

    if (roomCode && currentUser?.name) getToken();

    return () => {
      cancelled = true;
    };
  }, [roomCode, currentUser?.name]);

  // Participant should not control mutes (host-only).
  const noopMuteToggle = async () => {};
  const noopMuteAll = async () => {};

  const content = (
    <div className="min-h-screen relative overflow-hidden text-white">
      <div className="absolute inset-0 bg-[#070712]" />
      <div className="absolute -top-40 -left-40 w-[520px] h-[520px] rounded-full blur-3xl opacity-50 bg-fuchsia-600" />
      <div className="absolute -bottom-56 -right-56 w-[640px] h-[640px] rounded-full blur-3xl opacity-50 bg-indigo-600" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,0,153,0.18),transparent_55%),radial-gradient(ellipse_at_bottom,rgba(99,102,241,0.18),transparent_55%)]" />

      <div className="relative p-4">
        <div className="max-w-[1800px] mx-auto">
          {/* Banner */}
          <div className="rounded-3xl overflow-hidden border border-white/10 bg-white/5 backdrop-blur-xl shadow-2xl mb-6">
            <div className="relative h-28 bg-gradient-to-r from-fuchsia-900/40 via-indigo-900/40 to-purple-900/40">
              <div className="relative p-5 flex items-center justify-between h-full">
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-black/35 text-xs tracking-widest uppercase">
                    <span className="w-2 h-2 rounded-full bg-indigo-300 shadow-[0_0_18px_rgba(165,180,252,0.8)]" />
                    Participant
                  </div>

                  <h1 className="mt-2 text-3xl font-extrabold">
                    <span className="bg-clip-text text-transparent bg-[linear-gradient(90deg,#ff3aa7,#9b7bff,#ffd24a)]">
                      3PM Karaoke
                    </span>
                  </h1>

                  <div className="mt-1 text-sm text-white/70">
                    Room:{" "}
                    <span className="font-mono text-white tracking-[0.2em] bg-black/35 px-2 py-1 rounded-lg">
                      {roomCode}
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-xs text-white/50">You</div>
                  <div className="font-bold text-lg">{currentUser?.name || "Guest"} 🎧</div>

                  <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-black/25">
                    <span className="text-xs font-semibold text-white/70">
                      Mic: auto (host controls)
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* LiveKit error (non-blocking UI) */}
          {lkError && (
            <div className="mb-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
              LiveKit error: {lkError}
            </div>
          )}

          {/* Layout like HostView */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* Left: Video + Participants */}
            <div className="xl:col-span-2 space-y-6">
              <VideoPlayer
                currentSong={currentSong}
                playbackState={roomState?.playbackState}
                isHost={false}
              />

              <SingerSpotlight
                roomCode={roomCode}
                currentSong={currentSong}
                participants={participants}
                participantMutes={participantMutes}
                onMuteToggle={noopMuteToggle}
                onMuteAll={noopMuteAll}
                queue={queue}
                // 👇 add this prop in SingerSpotlight (tiny patch below)
                canControlMics={false}
              />
            </div>

            {/* Right: Queue (view only) */}
            <div className="space-y-6">
              <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-xl p-6">
                <SongQueue queue={queue} isHost={false} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Wrap in LiveKitRoom only when we have a token
  if (!token) return content;

  return (
    <LiveKitRoom
      token={token}
      serverUrl={import.meta.env.VITE_LIVEKIT_URL}
      connect={true}
      video={true}
      audio={true}
      data-lk-theme="default"
    >
      <RoomAudioRenderer />
      {content}
    </LiveKitRoom>
  );
}

export default ParticipantView;