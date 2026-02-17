import { useState } from "react";
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
  const [isMinimized, setIsMinimized] = useState(false);
  const liveKitParticipants = useParticipants();

  const currentSinger = currentSong?.requestedBy || currentSong?.singerName || "";
  const nextSong =
    queue && queue.length > 0
      ? [...queue].sort((a, b) => (a.addedAt || 0) - (b.addedAt || 0))[0]
      : null;
  const nextSinger = nextSong?.requestedBy || nextSong?.singerName || "";

  if (isMinimized) {
    return (
      <button
        onClick={() => setIsMinimized(false)}
        className="w-full rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-4 text-left hover:bg-white/8 transition"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-lg">📹</span>
            <span className="font-semibold">Participants</span>
            <span className="text-xs text-white/50">({liveKitParticipants.length})</span>
          </div>
          <span className="text-xs text-white/50">Click to expand</span>
        </div>
      </button>
    );
  }

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
              <span className="text-white/60">Participants ({liveKitParticipants.length})</span>
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
              className="sm:w-auto inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-2 border border-white/10 bg-white/6 hover:bg-rose-500/10 hover:border-rose-400/30 text-white/85 backdrop-blur-xl transition"
            >
              <span className="text-sm font-semibold">Mute All</span>
            </button>
          )}

          <button
            onClick={() => setIsMinimized(true)}
            className="inline-flex items-center justify-center rounded-2xl px-3 py-2 border border-white/10 bg-white/6 hover:bg-white/10 text-white/70 backdrop-blur-xl transition text-sm"
            title="Minimize"
          >
            Minimize
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
        {liveKitParticipants.map((p) => {
          const name = p.name || p.identity;
          const isSinging = !!currentSinger && name === currentSinger;
          const isNext = !!nextSinger && name === nextSinger;
          const isMuted = participantMutes?.[name] === true;

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
