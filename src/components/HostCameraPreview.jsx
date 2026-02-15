import React, { useEffect, useRef, useMemo } from "react";
import { useParticipants, useTracks } from "@livekit/components-react";
import { Track } from "livekit-client";

const HostCameraPreview = React.memo(function HostCameraPreview({ isHost }) {
  const cameraVideoRef = useRef(null);

  // Get host camera - memoized to prevent unnecessary lookups
  const participants = useParticipants();
  const hostParticipant = useMemo(() => participants[0], [participants[0]?.identity]);

  const cameraTracks = useTracks([Track.Source.Camera]);
  const hostCameraTrack = useMemo(() =>
    cameraTracks.find((t) => t.participant?.identity === hostParticipant?.identity),
    [cameraTracks, hostParticipant?.identity]
  );

  // Attach camera track - only when track actually changes
  useEffect(() => {
    const videoElement = cameraVideoRef.current;
    const track = hostCameraTrack?.publication?.track;

    if (videoElement && track) {
      track.attach(videoElement);
      return () => {
        track.detach(videoElement);
      };
    }
  }, [hostCameraTrack?.publication?.track]);

  const hasHostCamera = hostCameraTrack?.publication && !hostCameraTrack.publication.isMuted;

  if (hasHostCamera) {
    return (
      <>
        {/* Host Camera Feed */}
        <video
          ref={cameraVideoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
        />
        {/* Overlay text */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/70 to-transparent p-6">
          <div className="text-xl md:text-2xl font-extrabold">
            <span className="bg-clip-text text-transparent bg-[linear-gradient(90deg,#ff3aa7,#9b7bff,#ffd24a)]">
              DJ is Live
            </span>
          </div>
          <div className="mt-2 text-white/70">
            {isHost ? "Add songs to the queue to start the set." : "Waiting for the host to press play…"}
          </div>
        </div>
      </>
    );
  }

  // No camera - show default
  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center px-6">
        <div className="text-6xl mb-4">🎧</div>
        <div className="text-xl md:text-2xl font-extrabold">
          <span className="bg-clip-text text-transparent bg-[linear-gradient(90deg,#ff3aa7,#9b7bff,#ffd24a)]">
            No track loaded
          </span>
        </div>
        <div className="mt-2 text-white/60">
          {isHost ? "Add songs to the queue to start the set." : "Waiting for the host to press play…"}
        </div>
      </div>
    </div>
  );
});

export default HostCameraPreview;
