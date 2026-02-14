import React, { useEffect, useMemo, useRef, useState } from "react";
import { Track } from "livekit-client";

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

  // ✅ Safely get video track from participant
  const videoPublication = useMemo(() => {
    if (!participant?.videoTracks) {
      console.log(`[${participant?.identity}] No videoTracks`);
      return null;
    }

    console.log(`[${participant?.identity}] Video tracks count:`, participant.videoTracks.size);

    // Get camera track publication
    for (const pub of participant.videoTracks.values()) {
      console.log(`[${participant?.identity}] Track source:`, pub.source, 'Camera source:', Track.Source.Camera);
      if (pub.source === Track.Source.Camera) {
        console.log(`[${participant?.identity}] Found camera track!`, pub.trackSid);
        return pub;
      }
    }

    // Fallback: get first video track
    const firstTrack = participant.videoTracks.values().next().value || null;
    console.log(`[${participant?.identity}] Using fallback track:`, firstTrack?.trackSid);
    return firstTrack;
  }, [participant]);

  // ✅ real mic state from LiveKit (no local state)
  const isMicOn = !!participant.isMicrophoneEnabled;

  // ✅ camera state (read from LiveKit publication)
  const isCameraEnabled = videoPublication && !videoPublication.isMuted;

  // ✅ policy: DISABLED - allow all users to control their mic/camera
  const isLocal = !!participant.isLocal;
  const micAllowedByPolicy = true; // Always allow mic control

  // Local UI state only for button feedback if you want it
  const [cameraBusy, setCameraBusy] = useState(false);
  const [micBusy, setMicBusy] = useState(false);

  // ✅ IMPORTANT: attach/detach video track properly
  useEffect(() => {
    const el = videoElRef.current;
    const track = videoPublication?.track;

    console.log(`[${participant?.identity}] Attach effect:`, {
      hasElement: !!el,
      hasTrack: !!track,
      trackSid: track?.sid,
      isMuted: videoPublication?.isMuted
    });

    if (!el || !track) {
      // Clean up if no track
      if (el) {
        el.srcObject = null;
      }
      return;
    }

    // Attach track to video element
    try {
      track.attach(el);
      console.log(`[${participant?.identity}] ✅ Video track attached!`);
    } catch (e) {
      console.error(`[${participant?.identity}] Failed to attach video track:`, e);
    }

    // Cleanup: detach on unmount or when track changes
    return () => {
      try {
        track.detach(el);
      } catch (e) {
        console.error(`[${participant?.identity}] Failed to detach video track:`, e);
      }
    };
  }, [videoPublication?.track, participant?.identity]);

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
      {videoPublication?.track && !videoPublication.isMuted ? (
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