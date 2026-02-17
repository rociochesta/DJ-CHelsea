import React, { useEffect, useRef, useMemo } from "react";
import { useParticipants, useTracks } from "@livekit/components-react";
import { Track } from "livekit-client";
import { Headphones, VideoOff } from "lucide-react";

const HostCameraPreview = React.memo(function HostCameraPreview({
  isHost,
  hostIdentity, // ✅ optional: pass this if you have it (best)
}) {
  const cameraVideoRef = useRef(null);

  const participants = useParticipants();

  // ✅ Best: use explicit hostIdentity if provided
  // Fallback: keep your "first participant" approach but make memo stable.
  const resolvedHostIdentity = useMemo(() => {
    if (hostIdentity) return hostIdentity;
    return participants?.[0]?.identity || null;
  }, [hostIdentity, participants]);

  const cameraTracks = useTracks([Track.Source.Camera]);

  const hostCameraTrack = useMemo(() => {
    if (!resolvedHostIdentity) return null;
    return cameraTracks.find(
      (t) => t.participant?.identity === resolvedHostIdentity
    );
  }, [cameraTracks, resolvedHostIdentity]);

  // Attach camera track
  useEffect(() => {
    const videoElement = cameraVideoRef.current;
    const track = hostCameraTrack?.publication?.track;

    if (videoElement && track) {
      track.attach(videoElement);
      return () => track.detach(videoElement);
    }
  }, [hostCameraTrack?.publication?.track]);

  const hasHostCamera =
    !!hostCameraTrack?.publication && !hostCameraTrack.publication.isMuted;

  if (hasHostCamera) {
    return (
      <div className="relative w-full h-full">
        {/* Host Camera Feed */}
        <video
          ref={cameraVideoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
        />

        {/* ✅ 3PM glass scrim (no gradient blobs) */}
        <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6">
          <div className="rounded-3xl border border-white/10 bg-white/[0.03] backdrop-blur-md shadow-lg p-4 sm:p-5">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-2xl border border-white/10 bg-white/[0.02] flex items-center justify-center">
                <Headphones className="w-5 h-5 text-white/70" />
              </div>

              <div className="min-w-0">
                <div className="text-lg sm:text-xl font-semibold leading-tight">
                  <span className="bg-clip-text text-transparent bg-[linear-gradient(90deg,#ff3aa7,#9b7bff,#ffd24a)]">
                    DJ is live
                  </span>
                </div>
                <div className="mt-1 text-sm text-white/55">
                  {isHost
                    ? "Add songs to the queue to start the set."
                    : "Waiting for the host to press play…"}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // No camera - show default (3PM system)
  return (
    <div className="flex items-center justify-center h-full">
      <div className="w-full max-w-xl px-4">
        <div className="rounded-3xl border border-white/10 bg-white/[0.03] backdrop-blur-md shadow-lg p-6 sm:p-8 text-center">
          <div className="mx-auto w-12 h-12 rounded-2xl border border-white/10 bg-white/[0.02] flex items-center justify-center">
            <VideoOff className="w-6 h-6 text-white/60" />
          </div>

          <div className="mt-4 text-xl sm:text-2xl font-semibold">
            <span className="bg-clip-text text-transparent bg-[linear-gradient(90deg,#ff3aa7,#9b7bff,#ffd24a)]">
              No camera yet
            </span>
          </div>

          <div className="mt-2 text-sm text-white/55">
            {isHost
              ? "Turn on your camera to go live."
              : "Waiting for the host to go live…"}
          </div>
        </div>
      </div>
    </div>
  );
});

export default HostCameraPreview;