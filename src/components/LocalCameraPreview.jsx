import React, { useEffect, useRef, useState, useMemo } from "react";
import { useLocalParticipant, useTracks } from "@livekit/components-react";
import { Track } from "livekit-client";
import { Video, VideoOff, Mic, MicOff, X, ChevronDown } from "lucide-react";

export default function LocalCameraPreview() {
  const [isOpen, setIsOpen] = useState(true);
  const videoRef = useRef(null);
  const { localParticipant } = useLocalParticipant();

  // Use useTracks hook for local participant's camera
  const tracks = useTracks([Track.Source.Camera]);

  const cameraPublication = useMemo(() => {
    const trackRef = tracks.find(
      (t) => t.participant?.identity === localParticipant?.identity
    );
    return trackRef?.publication || null;
  }, [tracks, localParticipant?.identity]);

  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [micEnabled, setMicEnabled] = useState(false);

  // Track camera/mic state
  useEffect(() => {
    if (!localParticipant) return;

    const updateStates = () => {
      setCameraEnabled(localParticipant.isCameraEnabled);
      setMicEnabled(localParticipant.isMicrophoneEnabled);
    };

    updateStates();

    localParticipant.on("trackPublished", updateStates);
    localParticipant.on("trackUnpublished", updateStates);

    return () => {
      localParticipant.off("trackPublished", updateStates);
      localParticipant.off("trackUnpublished", updateStates);
    };
  }, [localParticipant]);

  // Attach video track
  useEffect(() => {
    if (!videoRef.current || !cameraPublication?.track) return;

    cameraPublication.track.attach(videoRef.current);
    return () => {
      cameraPublication.track.detach(videoRef.current);
    };
  }, [cameraPublication?.track]);

  const handleToggleCamera = async () => {
    if (!localParticipant) return;
    try {
      const newState = !cameraEnabled;
      await localParticipant.setCameraEnabled(newState);
    } catch (error) {
      console.error("Failed to toggle camera:", error);
    }
  };

  const handleToggleMic = async () => {
    if (!localParticipant) return;
    try {
      const newState = !micEnabled;
      await localParticipant.setMicrophoneEnabled(newState);
    } catch (error) {
      console.error("Failed to toggle mic:", error);
    }
  };

  const Card = ({ children, className = "" }) => (
    <div
      className={[
        "rounded-3xl border border-white/10 bg-white/[0.03] backdrop-blur-md shadow-lg overflow-hidden",
        className,
      ].join(" ")}
    >
      {children}
    </div>
  );

  const OutlineBtn = ({ children, onClick, title, tone = "fuchsia", className = "" }) => {
    const toneClass =
      tone === "indigo"
        ? "border-indigo-500/30 hover:border-indigo-400/45 hover:shadow-[0_0_14px_rgba(99,102,241,0.14)]"
        : tone === "neutral"
        ? "border-white/10 hover:border-white/20 hover:shadow-[0_0_12px_rgba(232,121,249,0.10)]"
        : "border-fuchsia-500/35 hover:border-fuchsia-400/50 hover:shadow-[0_0_14px_rgba(232,121,249,0.16)]";

    return (
      <button
        onClick={onClick}
        title={title}
        className={[
          "inline-flex items-center justify-center gap-2 px-3 py-2 rounded-2xl",
          "bg-transparent border text-white/85",
          "transition active:scale-[0.98]",
          toneClass,
          className,
        ].join(" ")}
      >
        {children}
      </button>
    );
  };

  const StatusRow = ({ label, value, on, tone = "fuchsia" }) => {
    const dot =
      tone === "indigo"
        ? on
          ? "bg-indigo-400"
          : "bg-white/20"
        : on
        ? "bg-fuchsia-400"
        : "bg-white/20";

    return (
      <div className="flex items-center justify-between text-xs">
        <span className="text-white/50">{label}</span>
        <span className="inline-flex items-center gap-2 text-white/75">
          <span className={`w-2 h-2 rounded-full ${dot}`} />
          {value}
        </span>
      </div>
    );
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className={[
          "fixed top-4 right-4 z-50",
          "px-4 py-2 rounded-2xl",
          "border border-white/10 bg-white/[0.03] backdrop-blur-md shadow-lg",
          "hover:border-white/20 hover:bg-white/[0.04] transition active:scale-[0.98]",
          "text-white/85 font-semibold text-sm",
        ].join(" ")}
      >
        <span className="inline-flex items-center gap-2">
          <Video className="w-4 h-4 text-white/70" />
          Local Media
        </span>
      </button>
    );
  }

  return (
    <div className="fixed top-4 right-4 z-50 w-[22rem]">
      <Card>
        {/* Header */}
        <div className="px-4 py-3 border-b border-white/10 bg-black/20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Video className="w-4 h-4 text-white/70" />
            <h3 className="font-semibold text-sm text-white/85">Local Media</h3>
            <span className="text-[10px] text-white/40">(debug)</span>
          </div>

          <div className="flex items-center gap-2">
            <OutlineBtn
              onClick={() => setIsOpen(false)}
              title="Minimize"
              tone="neutral"
              className="px-2"
            >
              <ChevronDown className="w-4 h-4" />
            </OutlineBtn>
            <OutlineBtn
              onClick={() => setIsOpen(false)}
              title="Close"
              tone="neutral"
              className="px-2"
            >
              <X className="w-4 h-4" />
            </OutlineBtn>
          </div>
        </div>

        {/* Body */}
        <div className="p-4">
          {/* Video */}
          <div className="rounded-2xl overflow-hidden border border-white/10 bg-black/40 aspect-video relative">
            {cameraEnabled ? (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover scale-x-[-1]"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="mx-auto w-12 h-12 rounded-2xl border border-white/10 bg-white/[0.02] flex items-center justify-center">
                    <VideoOff className="w-6 h-6 text-white/55" />
                  </div>
                  <p className="mt-2 text-white/55 text-sm">Camera off</p>
                </div>
              </div>
            )}
          </div>

          {/* Status */}
          <div className="mt-4 space-y-2">
            <StatusRow
              label="Camera"
              value={cameraEnabled ? "Enabled" : "Disabled"}
              on={cameraEnabled}
              tone="fuchsia"
            />
            <StatusRow
              label="Microphone"
              value={micEnabled ? "Enabled" : "Muted"}
              on={micEnabled}
              tone="indigo"
            />
            <div className="flex items-center justify-between text-xs">
              <span className="text-white/50">Identity</span>
              <span className="text-white/70 font-mono text-[10px] truncate max-w-[180px]">
                {localParticipant?.identity || "N/A"}
              </span>
            </div>
          </div>

          {/* Controls (outline only) */}
          <div className="mt-4 flex gap-2">
            <OutlineBtn
              onClick={handleToggleCamera}
              title="Toggle camera"
              tone="fuchsia"
              className="flex-1"
            >
              {cameraEnabled ? (
                <>
                  <VideoOff className="w-4 h-4" />
                  <span className="text-sm font-semibold">Camera off</span>
                </>
              ) : (
                <>
                  <Video className="w-4 h-4" />
                  <span className="text-sm font-semibold">Camera on</span>
                </>
              )}
            </OutlineBtn>

            <OutlineBtn
              onClick={handleToggleMic}
              title="Toggle microphone"
              tone="indigo"
              className="flex-1"
            >
              {micEnabled ? (
                <>
                  <MicOff className="w-4 h-4" />
                  <span className="text-sm font-semibold">Mute</span>
                </>
              ) : (
                <>
                  <Mic className="w-4 h-4" />
                  <span className="text-sm font-semibold">Unmute</span>
                </>
              )}
            </OutlineBtn>
          </div>

          {/* Debug Info */}
          <div className="mt-4 p-3 rounded-2xl border border-white/10 bg-black/20">
            <div className="text-[10px] text-white/45 space-y-1 font-mono">
              <div>Video tracks: {localParticipant?.videoTracks?.size || 0}</div>
              <div>Audio tracks: {localParticipant?.audioTracks?.size || 0}</div>
              <div>
                Camera pub: {cameraPublication?.trackSid?.slice(0, 8) || "None"}
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}