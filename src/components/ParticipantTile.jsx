import React, { useEffect, useRef, useState, useMemo } from "react";
import { Track } from "livekit-client";
import { useTracks } from "@livekit/components-react";

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

  const videoRef = useRef(null);
  const [cameraBusy, setCameraBusy] = useState(false);
  const [micBusy, setMicBusy] = useState(false);

  const participantName = participant.name || participant.identity || "Unknown";

  // ✅ Use useTracks to get all camera tracks, then filter for this participant
  const tracks = useTracks([Track.Source.Camera]);
  
  const cameraPublication = useMemo(() => {
    // Find the camera track for this specific participant
    const trackRef = tracks.find(
      (t) => t.participant?.identity === participant?.identity
    );
    return trackRef?.publication || null;
  }, [tracks, participant?.identity]);

  // ✅ Real mic state from LiveKit
  const isMicOn = !!participant.isMicrophoneEnabled;

  // ✅ Camera state - check if camera track exists and is not muted
  const isCameraEnabled = cameraPublication && !cameraPublication.isMuted;

  // Attach video track to video element
  useEffect(() => {
    const videoElement = videoRef.current;
    const track = cameraPublication?.track;

    if (videoElement && track) {
      track.attach(videoElement);
      console.log(`[${participantName}] Video track attached`);
      return () => {
        track.detach(videoElement);
        console.log(`[${participantName}] Video track detached`);
      };
    }
  }, [cameraPublication?.track, participantName]);

  const handleToggleCamera = async () => {
    if (cameraBusy || !participant.setCameraEnabled) return;
    setCameraBusy(true);
    try {
      await participant.setCameraEnabled(!isCameraEnabled);
      console.log(`[${participantName}] Camera toggled to: ${!isCameraEnabled}`);
    } catch (e) {
      console.error("Failed to toggle camera:", e);
    } finally {
      setCameraBusy(false);
    }
  };

  const handleToggleMic = async () => {
    if (micBusy || !participant.setMicrophoneEnabled) return;
    setMicBusy(true);
    try {
      const next = !participant.isMicrophoneEnabled;
      await participant.setMicrophoneEnabled(next);
      console.log(`[${participantName}] Mic toggled to: ${next}`);
    } catch (e) {
      console.error("Failed to toggle mic:", e);
    } finally {
      setMicBusy(false);
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
      {isCameraEnabled ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`w-full h-full object-cover ${
            participant.isLocal ? "scale-x-[-1]" : ""
          }`}
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-fuchsia-900/30 to-indigo-900/30">
          <div className="text-center">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-fuchsia-500 to-indigo-600 flex items-center justify-center text-xl sm:text-2xl font-bold mx-auto">
              {participantName?.charAt(0)?.toUpperCase() || "?"}
            </div>
            <p className="text-xs sm:text-sm text-white/70 truncate max-w-[10rem] mx-auto mt-2">
              {participantName}
            </p>
            <p className="text-xs text-white/40 mt-1">Camera off</p>
          </div>
        </div>
      )}

      {/* Controls overlay - show for current user */}
      {isCurrentUser && showControls && (
        <div className="absolute top-2 right-2 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={handleToggleCamera}
            disabled={cameraBusy}
            className={`p-1.5 rounded-lg backdrop-blur-xl transition text-sm ${
              isCameraEnabled
                ? "bg-white/20 hover:bg-white/30"
                : "bg-red-500/80 hover:bg-red-500"
            } ${cameraBusy ? "opacity-60 cursor-not-allowed" : ""}`}
            title={isCameraEnabled ? "Turn camera off" : "Turn camera on"}
          >
            {isCameraEnabled ? "📷" : "🚫"}
          </button>

          <button
            onClick={handleToggleMic}
            disabled={micBusy}
            className={`p-1.5 rounded-lg backdrop-blur-xl transition text-sm ${
              isMicOn
                ? "bg-emerald-500/80 hover:bg-emerald-500"
                : "bg-white/20 hover:bg-white/30"
            } ${micBusy ? "opacity-60 cursor-not-allowed" : ""}`}
            title={isMicOn ? "Mute mic" : "Unmute mic"}
          >
            {isMicOn ? "🎙️" : "🔇"}
          </button>
        </div>
      )}

      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/80 to-transparent p-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            <span className="text-xs font-semibold truncate">
              {participantName}
            </span>

            {isSinging && (
              <span className="px-1.5 py-0.5 rounded-md bg-fuchsia-500 text-[9px] font-bold whitespace-nowrap flex items-center gap-0.5">
                🎤
              </span>
            )}

            {isNext && !isSinging && (
              <span className="px-1.5 py-0.5 rounded-md bg-yellow-500/80 text-[9px] font-bold whitespace-nowrap">
                ⭐
              </span>
            )}
          </div>

          {canControlMics && (
            <button
              onClick={() => onMuteToggle(participantName, !isMuted)}
              className={`p-1 rounded-md transition shrink-0 text-xs ${
                isMuted
                  ? "bg-red-500/90 hover:bg-red-500"
                  : "bg-emerald-500/90 hover:bg-emerald-500"
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