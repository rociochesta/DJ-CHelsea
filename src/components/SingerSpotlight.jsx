import React, { useState } from "react";
import { RoomAudioRenderer } from "@livekit/components-react";

function ParticipantTile({
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
      {/* Video or Avatar */}
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
            <p className="text-[10px] sm:text-xs text-white/40 mt-1">
              Camera off
            </p>
          </div>
        </div>
      )}

      {/* Camera/Mic Controls (for current user only) */}
      {isCurrentUser && showControls && (
        <div className="absolute top-2 right-2 flex gap-2">
          <button
            onClick={handleToggleCamera}
            className={`p-2 rounded-lg backdrop-blur-xl transition ${
              isCameraOn
                ? "bg-white/20 hover:bg-white/30"
                : "bg-red-500/80 hover:bg-red-500"
            }`}
            title={isCameraOn ? "Turn camera off" : "Turn camera on"}
          >
            {isCameraOn ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
            )}
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
            {isMicOn ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M13.477 14.89A6 6 0 015.11 6.524l8.367 8.368zm1.414-1.414L6.524 5.11a6 6 0 018.367 8.367zM18 10a8 8 0 11-16 0 8 8 0 0116 0z" clipRule="evenodd" />
              </svg>
            )}
          </button>
        </div>
      )}

      {/* Info Overlay */}
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

            {/* ✅ policy badge only for local user */}
            {isLocal && !micAllowedByPolicy && (
              <span className="px-2 py-0.5 rounded-full bg-red-600/80 text-[10px] sm:text-xs font-bold whitespace-nowrap">
                🔒 MUTED BY POLICY
              </span>
            )}
          </div>

          {/* Mic Control (host only) */}
          {canControlMics && (
            <button
              onClick={() => onMuteToggle(participantName, !isMuted)}
              className={`p-1 sm:p-1.5 rounded-lg transition shrink-0 ${
                isMuted
                  ? "bg-red-500/90 hover:bg-red-500"
                  : "bg-emerald-500/90 hover:bg-emerald-500"
              }`}
              title={isMuted ? "Unmute" : "Mute"}
            >
              {isMuted ? (
                <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M13.477 14.89A6 6 0 015.11 6.524l8.367 8.368zm1.414-1.414L6.524 5.11a6 6 0 018.367 8.367zM18 10a8 8 0 11-16 0 8 8 0 0116 0z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Singing border effect */}
      {isSinging && (
        <div className="absolute inset-0 pointer-events-none border-4 border-fuchsia-500 rounded-2xl animate-pulse" />
      )}
    </div>
  );
}

export default ParticipantTile;