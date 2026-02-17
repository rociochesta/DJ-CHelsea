import { useMemo, useState } from "react";
import { useParticipants } from "@livekit/components-react";
import ParticipantTile from "./ParticipantTile";
import { Users, ChevronDown, ChevronUp, Sparkles } from "lucide-react";

export default function SingerSpotlight({
  roomCode,
  roomMode,
  currentSong,
  participantMutes,
  queue,
  currentUser,
  micsLocked = false,
  preferHostWhenIdle = false,
}) {
  const [isMinimized, setIsMinimized] = useState(false);
  const liveKitParticipants = useParticipants();

  const isDJ = roomMode === "dj";

  const currentSingerRaw = currentSong?.requestedBy || currentSong?.singerName || "";

  const nextSinger = useMemo(() => {
    if (!queue || queue.length === 0) return "";
    const nextSong = [...queue].sort((a, b) => (a.addedAt || 0) - (b.addedAt || 0))[0];
    return nextSong?.requestedBy || nextSong?.singerName || "";
  }, [queue]);

  // ✅ Heuristic host pick:
  // In participant view, host is usually the first non-local LiveKit participant.
  const hostCandidate = useMemo(() => {
    if (!liveKitParticipants?.length) return null;
    return liveKitParticipants.find((p) => !p?.isLocal) || null;
  }, [liveKitParticipants]);

  // ✅ In DJ mode when nothing is playing, treat host as the “live” focus.
  const currentSinger = useMemo(() => {
    if (currentSingerRaw) return currentSingerRaw;
    if (preferHostWhenIdle && isDJ) {
      const hostName = hostCandidate?.name || hostCandidate?.identity || "";
      return hostName; // used only for labeling/highlight
    }
    return "";
  }, [currentSingerRaw, preferHostWhenIdle, isDJ, hostCandidate]);

  // ✅ Sort tiles: host first (only for DJ idle)
  const sortedParticipants = useMemo(() => {
    const arr = [...(liveKitParticipants || [])];
    if (!(preferHostWhenIdle && isDJ && !currentSingerRaw && hostCandidate)) return arr;

    const hostId = hostCandidate.identity || hostCandidate.name;
    arr.sort((a, b) => {
      const aId = a?.identity || a?.name;
      const bId = b?.identity || b?.name;
      const aIsHost = aId === hostId;
      const bIsHost = bId === hostId;
      if (aIsHost && !bIsHost) return -1;
      if (!aIsHost && bIsHost) return 1;
      return 0;
    });
    return arr;
  }, [liveKitParticipants, preferHostWhenIdle, isDJ, currentSingerRaw, hostCandidate]);

  if (isMinimized) {
    return (
      <button
        type="button"
        onClick={() => setIsMinimized(false)}
        className={[
          "w-full rounded-3xl p-4 text-left",
          "border border-white/10 bg-white/[0.03] backdrop-blur-md shadow-lg",
          "hover:border-white/20 hover:bg-white/[0.04] transition",
          "active:scale-[0.99]",
        ].join(" ")}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-md flex items-center justify-center">
              <Users className="w-5 h-5 text-white/70" />
            </div>

            <div className="min-w-0">
              <div className="font-semibold truncate">
                Participants{" "}
                <span className="text-white/50 text-sm">({sortedParticipants?.length || 0})</span>
              </div>

              {currentSinger ? (
                <div className="text-xs text-white/50 truncate">
                  Live: <span className="text-white/75">{currentSinger}</span>
                  {nextSinger ? (
                    <>
                      {" "}
                      · Next: <span className="text-white/75">{nextSinger}</span>
                    </>
                  ) : null}
                </div>
              ) : (
                <div className="text-xs text-white/40">Expand to see who’s in the room</div>
              )}
            </div>
          </div>

          <div className="w-10 h-10 rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-md flex items-center justify-center">
            <ChevronDown className="w-5 h-5 text-white/60" />
          </div>
        </div>
      </button>
    );
  }

  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.03] backdrop-blur-md shadow-lg p-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
        <div className="min-w-0">
          <div className="text-xs tracking-widest uppercase text-white/50">Live Video</div>

          <h3 className="mt-1 text-xl sm:text-2xl font-extrabold leading-tight">
            {currentSinger ? (
              <>
                <span className="bg-clip-text text-transparent bg-[linear-gradient(90deg,#ff3aa7,#9b7bff)]">
                  {currentSinger}
                </span>
                <span className="text-white/60 text-base sm:text-lg ml-2">
                  {currentSingerRaw ? "is singing" : isDJ ? "is hosting" : ""}
                </span>
              </>
            ) : (
              <span className="text-white/75">
                Participants{" "}
                <span className="text-white/50 font-semibold">({sortedParticipants?.length || 0})</span>
              </span>
            )}
          </h3>

          {!!nextSinger && (
            <div className="mt-1 text-sm text-white/50 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-white/40" />
              <span>
                Up next: <span className="text-white/80 font-semibold">{nextSinger}</span>
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setIsMinimized(true)}
            className={[
              "w-10 h-10 rounded-2xl border bg-white/[0.03] backdrop-blur-md",
              "text-white/75 transition active:scale-[0.98]",
              outlineBtn("neutral"),
            ].join(" ")}
            title="Collapse"
          >
            <ChevronUp className="w-5 h-5 mx-auto" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
        {sortedParticipants.map((p, idx) => {
          const name = p?.name || p?.identity || `Guest ${idx + 1}`;
          const identity = p?.identity || "";

          const isSingingNow = !!currentSinger && name === currentSinger;
          const isNextUp = !!nextSinger && name === nextSinger;

          const muteKey = identity || name;
          const isMuted = participantMutes?.[muteKey] === true;

          return (
            <ParticipantTile
              key={identity || `${name}-${idx}`}
              participant={p}
              isSinging={isSingingNow}
              isNext={isNextUp}
              isMuted={isMuted}
              isCurrentUser={!!p?.isLocal}
              micsLocked={micsLocked}
            />
          );
        })}
      </div>

      {(!sortedParticipants || sortedParticipants.length === 0) && (
        <div className="rounded-3xl border border-white/10 bg-white/[0.02] backdrop-blur-md p-8 text-center mt-4">
          <div className="w-12 h-12 mx-auto rounded-2xl border border-white/10 bg-white/[0.03] flex items-center justify-center">
            <Users className="w-6 h-6 text-white/55" />
          </div>
          <div className="mt-3 text-lg font-bold text-white/80">No participants yet</div>
          <div className="mt-1 text-white/45 text-sm">Share the room code so people can join.</div>
        </div>
      )}
    </div>
  );
}