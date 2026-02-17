import React from "react";
import { useParticipants } from "@livekit/components-react";
import ParticipantTile from "./ParticipantTile";

export default function SingerSpotlight({
  roomCode,
  currentSong,
  participantMutes,
  onMuteToggle,
  onMuteAll,
  queue,
  canControlMics = true,
  currentUser,
}) {
  const liveKitParticipants = useParticipants();

  // Debug logging
  console.log("🎤 SingerSpotlight participants:", liveKitParticipants.length);
  console.log("🎤 currentUser:", currentUser);
  console.log("🎤 Participants:", liveKitParticipants.map(p => ({
    identity: p.identity,
    name: p.name,
    isLocal: p.isLocal,
    cameraEnabled: p.isCameraEnabled,
    micEnabled: p.isMicrophoneEnabled,
  })));

  const currentSinger = currentSong?.requestedBy || currentSong?.singerName || "";
  const nextSong =
    queue && queue.length > 0
      ? [...queue].sort((a, b) => (a.addedAt || 0) - (b.addedAt || 0))[0]
      : null;
  const nextSinger = nextSong?.requestedBy || nextSong?.singerName || "";

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-2xl p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div>
          <div className="text-xs tracking-widest uppercase text-white/50">Live Video</div>

          <h3 className="text-xl sm:text-2xl font-extrabold leading-tight">
            {currentSinger ? (
              <>
                <span className="bg-clip-text text-transparent bg-[linear-gradient(90deg,#ff3aa7,#9b7bff)]">
                  {currentSinger}
                </span>
                <span className="text-white/60 text-base sm:text-lg ml-2">is singing</span>
              </>
            ) : (
              <span className="text-white/60">Participants</span>
            )}
          </h3>

          {!!nextSinger && (
            <div className="mt-1 text-sm text-white/50">
              Up next: <span className="text-fuchsia-400 font-semibold">{nextSinger}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {canControlMics && (
            <button
              onClick={onMuteAll}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 sm:py-2 border border-white/10 bg-white/6 hover:bg-rose-500/10 hover:border-rose-400/30 text-white/85 backdrop-blur-xl transition"
            >
              <span className="text-sm font-semibold">Mute All</span>
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
        {liveKitParticipants.map((p) => {
          const name = p.name || p.identity;
          const isSinging = !!currentSinger && name === currentSinger;
          const isNext = !!nextSinger && name === nextSinger;
          const isMuted = participantMutes?.[name] === true;

          // Use p.isLocal to reliably detect the current user's participant
          const isCurrentUser = p.isLocal;

          return (
            <ParticipantTile
              key={p.identity}
              participant={p}
              isSinging={isSinging}
              isNext={isNext}
              isMuted={isMuted}
              onMuteToggle={onMuteToggle}
              canControlMics={canControlMics}
              isCurrentUser={isCurrentUser}
            />
          );
        })}
      </div>

      {liveKitParticipants.length === 0 && (
        <div className="rounded-2xl border border-white/10 bg-black/25 p-8 text-center mt-4">
          <div className="text-5xl mb-3">👻</div>
          <div className="text-lg font-bold">No participants yet</div>
          <div className="mt-1 text-white/60 text-sm">Share the room code for people to join</div>
        </div>
      )}
    </div>
  );
}