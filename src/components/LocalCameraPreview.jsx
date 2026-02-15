import React, { useEffect, useRef, useState } from "react";
import { useLocalParticipant, useTrack } from "@livekit/components-react";
import { Track } from "livekit-client";

export default function LocalCameraPreview() {
  const [isOpen, setIsOpen] = useState(true);
  const videoRef = useRef(null);
  const { localParticipant } = useLocalParticipant();
  
  // ✅ Use useTrack hook for local participant's camera
  const { publication: cameraPublication } = useTrack(
    Track.Source.Camera,
    localParticipant
  );
  
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

    // Listen for track changes
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
      console.log("Camera toggled to:", newState);
    } catch (error) {
      console.error("Failed to toggle camera:", error);
    }
  };

  const handleToggleMic = async () => {
    if (!localParticipant) return;
    try {
      const newState = !micEnabled;
      await localParticipant.setMicrophoneEnabled(newState);
      console.log("Mic toggled to:", newState);
    } catch (error) {
      console.error("Failed to toggle mic:", error);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed top-4 right-4 z-50 px-4 py-2 rounded-xl bg-purple-600/90 hover:bg-purple-600 text-white font-bold shadow-xl border border-white/20"
      >
        🎥 Debug Camera
      </button>
    );
  }

  return (
    <div className="fixed top-4 right-4 z-50 w-96 rounded-2xl border border-white/20 bg-black/95 backdrop-blur-2xl shadow-2xl overflow-hidden">
      {/* Header */}
      <div className="p-3 border-b border-white/10 bg-purple-900/40 flex items-center justify-between">
        <h3 className="font-bold text-sm">🎥 Local Camera Debug</h3>
        <button
          onClick={() => setIsOpen(false)}
          className="text-white/60 hover:text-white text-xl leading-none"
        >
          ✕
        </button>
      </div>

      {/* Video Preview */}
      <div className="p-3">
        <div className="rounded-xl overflow-hidden bg-black aspect-video relative">
          {cameraEnabled ? (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover scale-x-[-1]"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-purple-900/30 to-indigo-900/30">
              <div className="text-center">
                <div className="text-6xl mb-2">📷</div>
                <p className="text-white/70 text-sm">Camera Off</p>
              </div>
            </div>
          )}
        </div>

        {/* Status */}
        <div className="mt-3 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-white/60">Camera Status:</span>
            <span className={cameraEnabled ? "text-green-400" : "text-red-400"}>
              {cameraEnabled ? "✅ Enabled" : "❌ Disabled"}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-white/60">Mic Status:</span>
            <span className={micEnabled ? "text-green-400" : "text-red-400"}>
              {micEnabled ? "✅ Enabled" : "❌ Disabled"}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-white/60">Participant ID:</span>
            <span className="text-white/80 font-mono text-[10px]">
              {localParticipant?.identity || "N/A"}
            </span>
          </div>
        </div>

        {/* Controls */}
        <div className="mt-3 flex gap-2">
          <button
            onClick={handleToggleCamera}
            className={`flex-1 px-4 py-2 rounded-lg font-semibold text-sm transition ${
              cameraEnabled
                ? "bg-green-500/20 text-green-400 border border-green-500/50 hover:bg-green-500/30"
                : "bg-red-500/20 text-red-400 border border-red-500/50 hover:bg-red-500/30"
            }`}
          >
            {cameraEnabled ? "Turn Camera Off" : "Turn Camera On"}
          </button>
          <button
            onClick={handleToggleMic}
            className={`flex-1 px-4 py-2 rounded-lg font-semibold text-sm transition ${
              micEnabled
                ? "bg-green-500/20 text-green-400 border border-green-500/50 hover:bg-green-500/30"
                : "bg-red-500/20 text-red-400 border border-red-500/50 hover:bg-red-500/30"
            }`}
          >
            {micEnabled ? "Mute Mic" : "Unmute Mic"}
          </button>
        </div>

        {/* Debug Info */}
        <div className="mt-3 p-2 rounded-lg bg-black/50 border border-white/10">
          <div className="text-[10px] text-white/50 space-y-1 font-mono">
            <div>Video Tracks: {localParticipant?.videoTracks?.size || 0}</div>
            <div>Audio Tracks: {localParticipant?.audioTracks?.size || 0}</div>
            <div>
              Camera Pub:{" "}
              {cameraPublication?.trackSid?.slice(0, 8) || "None"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}