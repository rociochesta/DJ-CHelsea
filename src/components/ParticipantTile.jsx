import React, { useEffect, useMemo, useRef, useState } from "react";

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

  const videoElRef = useRef(null);

  const participantName = useMemo(
    () => participant.name || participant.identity || "Unknown",
    [participant.name, participant.identity]
  );

  // Get first camera publication safely
  const videoTrack = useMemo(() => {
    try {
      const pub = participant.videoTracks?.values?.().next?.().value || null;
      return pub?.videoTrack || null;
    } catch {
      return null;
    }
  }, [participant]);

  // ✅ real mic state from LiveKit (no local state)
  const isMicOn = !!participant.isMicrophoneEnabled;

  // ✅ camera state (read from LiveKit)
  const isCameraEnabled = !!participant.isCameraEnabled;

  // ✅ policy: only singer can unmute (AUTO mode)
  const isLocal = !!participant.isLocal;
  const micAllowedByPolicy = !!isSinging;

  // Local UI state only for button feedback if you want it
  const [cameraBusy, setCameraBusy] = useState(false);
  const [micBusy, setMicBusy] = useState(false);

  // ✅ IMPORTANT: attach/detach video track properly to avoid memory leak
  useEffect(() => {
    const el = videoElRef.current;

    if (!el) return;

    // If no track, ensure clean element
    if (!videoTrack) {
      try {
        // extra cleanup
        el.pause?.();
        el.srcObject = null;
      } catch {}
      return;
    }

    // Attach
    try {
      videoTrack.attach(el);
    } catch (e) {
      console.error("videoTrack.attach failed:", e);
    }

    // Cleanup: detach on unmount or when track changes
    return () => {
      try {
        videoTrack.detach(el);
      } catch {}
      try {
        el.pause?.();
        el.srcObject = null;
      } catch {}
    };
  }, [videoTrack]);

  const handleToggleCamera = async () => {
    if (cameraBusy) return;
    setCameraBusy(true);
    try {
      await participant.setCameraEnabled(!isCameraEnabled);
    } catch (e) {
      console.error("Failed to toggle camera:", e);
    } finally {
      setCameraBusy(false);
    }
  };

  const handleToggleMic = async () => {
    if (micBusy) return;
    setMicBusy(true);
    try {
      const next = !participant.isMicrophoneEnabled;
      await participant.setMicrophoneEnabled(next);
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
      {videoTrack ? (
        <video
          ref={videoElRef}
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
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-fuchsia-500 to-indigo-600 flex items-center justify-center text-xl sm:text-2xl font-bold mx-auto">
              {participantName?.charAt(0)?.toUpperCase() || "?"}
            </div>
            <p className="text-xs sm:text-sm text-white/70 truncate max-w-[10rem] mx-auto mt-2">
              {participantName}
            </p>
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
            disabled={micBusy || (isLocal && !micAllowedByPolicy)}
            className={`p-1.5 rounded-lg backdrop-blur-xl transition text-sm ${
              isLocal && !micAllowedByPolicy
                ? "bg-red-600/70 cursor-not-allowed"
                : isMicOn
                ? "bg-emerald-500/80 hover:bg-emerald-500"
                : "bg-white/20 hover:bg-white/30"
            } ${micBusy ? "opacity-60 cursor-not-allowed" : ""}`}
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

            {isLocal && !micAllowedByPolicy && !isSinging && (
              <span 
                className="px-1.5 py-0.5 rounded-md bg-red-600/80 text-[9px] font-bold whitespace-nowrap"
                title="Muted by policy - only singer can unmute"
              >
                🔒
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