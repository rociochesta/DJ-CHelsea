import React, { useEffect, useRef, useState, useMemo } from "react";
import { Track } from "livekit-client";
import { useTracks } from "@livekit/components-react";
import { Mic, MicOff, Video, VideoOff, Settings, Lock } from "lucide-react";

export default function ParticipantTile({
  participant,
  isSinging,
  isNext,
  isMuted,
  isCurrentUser = false,
  micsLocked = false,
}) {
  if (!participant) return null;

  const videoRef = useRef(null);
  const [cameraBusy, setCameraBusy] = useState(false);
  const [micBusy, setMicBusy] = useState(false);

  const participantName = participant.name || participant.identity || "Unknown";

  const tracks = useTracks([Track.Source.Camera]);

  const cameraPublication = useMemo(() => {
    const trackRef = tracks.find(
      (t) => t.participant?.identity === participant?.identity
    );
    return trackRef?.publication || null;
  }, [tracks, participant?.identity]);

  const isMicOn = !!participant.isMicrophoneEnabled;
  const isCameraEnabled = !!cameraPublication && !cameraPublication.isMuted;

  useEffect(() => {
    const el = videoRef.current;
    const track = cameraPublication?.track;

    if (el && track) {
      track.attach(el);
      return () => track.detach(el);
    }
  }, [cameraPublication?.track]);

  // If host muted you or mics are locked (firebase), enforce mute locally
  useEffect(() => {
    if (!isCurrentUser || !participant?.setMicrophoneEnabled) return;
    const shouldBeMuted = isMuted || (micsLocked && !isSinging);
    if (shouldBeMuted && participant.isMicrophoneEnabled) {
      participant.setMicrophoneEnabled(false).catch(console.error);
    }
  }, [isMuted, micsLocked, isSinging, isCurrentUser, participant]);

  const handleToggleCamera = async () => {
    if (cameraBusy || !participant.setCameraEnabled) return;
    setCameraBusy(true);
    try {
      await participant.setCameraEnabled(!isCameraEnabled);
    } catch (e) {
      console.error("Failed to toggle camera:", e);
    } finally {
      setCameraBusy(false);
    }
  };

  const micLockedForUser = micsLocked && !isSinging;

  const handleToggleMic = async () => {
    if (micBusy || !participant.setMicrophoneEnabled) return;
    // Prevent unmuting when mics are locked (unless singing)
    if (micLockedForUser && !participant.isMicrophoneEnabled) return;
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

  const frameClass = isSinging
    ? "border-fuchsia-500/50"
    : isNext
    ? "border-indigo-400/30"
    : "border-white/10";

  const outlineBtn = (tone = "fuchsia") =>
    tone === "indigo"
      ? "border-indigo-500/30 hover:border-indigo-400/45 hover:shadow-[0_0_14px_rgba(99,102,241,0.14)]"
      : tone === "neutral"
      ? "border-white/10 hover:border-white/20 hover:shadow-[0_0_12px_rgba(232,121,249,0.10)]"
      : "border-fuchsia-500/35 hover:border-fuchsia-400/50 hover:shadow-[0_0_14px_rgba(232,121,249,0.16)]";

  return (
    <div
      className={[
        "relative rounded-3xl overflow-hidden border bg-black/40 aspect-[4/3] sm:aspect-video",
        "backdrop-blur-md shadow-lg",
        frameClass,
      ].join(" ")}
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
        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
          <div className="text-center px-4">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-3xl border border-white/10 bg-white/[0.03] backdrop-blur-md flex items-center justify-center text-xl sm:text-2xl font-semibold mx-auto text-white/85">
              {participantName?.charAt(0)?.toUpperCase() || "?"}
            </div>
            <p className="text-xs sm:text-sm text-white/70 truncate max-w-[10rem] mx-auto mt-2">
              {participantName}
            </p>
            <p className="text-xs text-white/40 mt-1">Camera off</p>
          </div>
        </div>
      )}

      {/* Controls overlay (current user) */}
      {isCurrentUser && (
        <div className="absolute top-3 right-3 flex gap-2">
          <button
            onClick={handleToggleCamera}
            disabled={cameraBusy}
            className={[
              "w-10 h-10 rounded-2xl border bg-white/[0.03] backdrop-blur-md",
              "text-white/80 transition active:scale-[0.98]",
              outlineBtn("neutral"),
              cameraBusy ? "opacity-60 cursor-not-allowed" : "",
            ].join(" ")}
            title={isCameraEnabled ? "Turn camera off" : "Turn camera on"}
          >
            {isCameraEnabled ? (
              <VideoOff className="w-4 h-4 mx-auto" />
            ) : (
              <Video className="w-4 h-4 mx-auto" />
            )}
          </button>

          <button
            onClick={handleToggleMic}
            disabled={micBusy || micLockedForUser}
            className={[
              "w-10 h-10 rounded-2xl border bg-white/[0.03] backdrop-blur-md",
              "text-white/80 transition active:scale-[0.98]",
              micLockedForUser ? "border-red-500/30 opacity-60 cursor-not-allowed" : outlineBtn("fuchsia"),
              micBusy ? "opacity-60 cursor-not-allowed" : "",
            ].join(" ")}
            title={micLockedForUser ? "Mics locked by host" : isMicOn ? "Mute mic" : "Unmute mic"}
          >
            {micLockedForUser ? (
              <Lock className="w-4 h-4 mx-auto text-red-400/70" />
            ) : isMicOn ? (
              <MicOff className="w-4 h-4 mx-auto" />
            ) : (
              <Mic className="w-4 h-4 mx-auto" />
            )}
          </button>

          <button
            onClick={() => window.dispatchEvent(new CustomEvent("open-device-settings"))}
            className={[
              "w-10 h-10 rounded-2xl border bg-white/[0.03] backdrop-blur-md",
              "text-white/80 transition active:scale-[0.98]",
              outlineBtn("indigo"),
            ].join(" ")}
            title="Device settings"
          >
            <Settings className="w-4 h-4 mx-auto" />
          </button>
        </div>
      )}

      {/* Bottom bar (structured glass, no gradient) */}
      <div className="absolute bottom-0 left-0 right-0 p-3">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-md shadow-lg px-3 py-2">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xs font-semibold text-white/85 truncate">
                  {participantName}
                </span>

                {isSinging && (
                  <span className="text-[10px] px-2 py-1 rounded-2xl border border-fuchsia-500/25 text-white/80">
                    Singing
                  </span>
                )}

                {isNext && !isSinging && (
                  <span className="text-[10px] px-2 py-1 rounded-2xl border border-indigo-500/25 text-white/70">
                    Next
                  </span>
                )}
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Subtle singer frame (no pulsing neon border) */}
      {isSinging && (
        <div className="absolute inset-0 pointer-events-none border border-fuchsia-500/20 rounded-3xl" />
      )}
    </div>
  );
}