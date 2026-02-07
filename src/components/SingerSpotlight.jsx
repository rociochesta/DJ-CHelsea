import React, { useState } from "react";

export default function ParticipantTile({
  participant,
  isSinging,
  isNext,
  isMuted,
  onMuteToggle,
  canControlMics = true,
  isCurrentUser = false,
  showControls = false,
}) {
  if (!participant) return null;

  const [isCameraOn, setIsCameraOn] = useState(true);

  const videoPub = participant.videoTracks?.values
    ? participant.videoTracks.values().next().value
    : null;

  const videoTrack = videoPub?.videoTrack || null;
  const participantName = participant.name || participant.identity || "Unknown";

  // ✅ real mic state from LiveKit (no local isMicOn state)
  const isMicOn = !!participant.isMicrophoneEnabled;

  // ✅ policy: only singer can unmute (AUTO mode)
  const isLocal = !!participant.isLocal;
  const micAllowedByPolicy = !!isSinging;

  const handleToggleCamera = async () => {
    try {
      await participant.setCameraEnabled(!isCameraOn);
      setIsCameraOn(!isCameraOn);
    } catch (e) {
      console.error("Failed to toggle camera:", e);
    }
  };

  const handleToggleMic = async () => {
    try {
      const next = !participant.isMicrophoneEnabled;
      await participant.setMicrophoneEnabled(next);
    } catch (e) {
      console.error("Failed to toggle mic:", e);
    }
  };

  return (
    <div
      className={`relative rounded-2xl overflow-hidden border ${
        isSinging
          ? "border-fuchsia-500 ring-4 ring-fuchsia-500/30"
          : isNext
          ? "border-yellow-500/50 ring-2 ring-yellow-500/20"
          : "border-white/10"
      } bg-black aspect-[4/3] sm:aspect-video group`}
    >
      {videoTrack ? (
        <video
          ref={(el) => {
            if (el && videoTrack) videoTrack.attach(el);
          }}
          autoPlay
          playsInline
          muted={participant.isLocal}
          className={`w-full h-full object-cover ${
            participant.isLocal ? "scale-x-[-1]" : ""
          }`}
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-fuchsia-900/30 to-indigo-900/30">
          <div className="text-center">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-fuchsia-500 to-indigo-600 flex items-center justify-center text-xl sm:text-2xl font-bold mx-auto mb-2">
              {participantName?.charAt(0)?.toUpperCase() || "?"}
            </div>
            <p className="text-xs sm:text-sm text-white/70 truncate max-w-[10rem] mx-auto">
              {participantName}
            </p>
            <p className="text-[10px] sm:text-xs text-white/40 mt-1">Camera off</p>
          </div>
        </div>
      )}

      {isCurrentUser && showControls && (
        <div className="absolute top-2 right-2 flex gap-2">
          <button
            onClick={handleToggleCamera}
            className={`p-2 rounded-lg backdrop-blur-xl transition ${
              isCameraOn ? "bg-white/20 hover:bg-white/30" : "bg-red-500/80 hover:bg-red-500"
            }`}
            title={isCameraOn ? "Turn camera off" : "Turn camera on"}
          >
            {isCameraOn ? "📷" : "🚫"}
          </button>

          <button
            onClick={handleToggleMic}
            disabled={isLocal && !micAllowedByPolicy}
            className={`p-2 rounded-lg backdrop-blur-xl transition ${
              isLocal && !micAllowedByPolicy
                ? "bg-red-600/70 cursor-not-allowed"
                : isMicOn
                ? "bg-emerald-500/80 hover:bg-emerald-500"
                : "bg-white/20 hover:bg-white/30"
            }`}
            title={
              isLocal && !micAllowedByPolicy
                ? "Muted by policy (only singer can unmute)"
                : isMicOn
                ? "Mute mic"
                : "Unmute mic (if allowed)"
            }
          >
            {isMicOn ? "🎙️" : "🔇"}
          </button>
        </div>
      )}

      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2 sm:p-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xs sm:text-sm font-semibold truncate">
              {participantName}
            </span>

            {isSinging && (
              <span className="px-2 py-0.5 rounded-full bg-fuchsia-500 text-[10px] sm:text-xs font-bold whitespace-nowrap">
                🎤 SINGING
              </span>
            )}

            {isNext && !isSinging && (
              <span className="px-2 py-0.5 rounded-full bg-yellow-500/80 text-[10px] sm:text-xs font-bold whitespace-nowrap">
                ⏭️ NEXT
              </span>
            )}

            {isLocal && !micAllowedByPolicy && (
              <span className="px-2 py-0.5 rounded-full bg-red-600/80 text-[10px] sm:text-xs font-bold whitespace-nowrap">
                🔒 MUTED BY POLICY
              </span>
            )}
          </div>

          {canControlMics && (
            <button
              onClick={() => onMuteToggle(participantName, !isMuted)}
              className={`p-1 sm:p-1.5 rounded-lg transition shrink-0 ${
                isMuted ? "bg-red-500/90 hover:bg-red-500" : "bg-emerald-500/90 hover:bg-emerald-500"
              }`}
              title={isMuted ? "Unmute" : "Mute"}
            >
              {isMuted ? "🔇" : "🎙️"}
            </button>
          )}
        </div>
      </div>

      {isSinging && (
        <div className="absolute inset-0 pointer-events-none border-4 border-fuchsia-500 rounded-2xl animate-pulse" />
      )}
    </div>
  );
}