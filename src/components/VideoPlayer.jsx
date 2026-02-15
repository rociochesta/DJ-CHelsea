import React, { useEffect, useRef, useState } from "react";
import YouTube from "react-youtube";
import { useParticipants } from "@livekit/components-react";
import { useTracks } from "@livekit/components-react";
import { Track } from "livekit-client";

function VideoPlayer({ currentSong, playbackState, onSkip, isHost }) {
  const [player, setPlayer] = useState(null);
  const [playerReady, setPlayerReady] = useState(false);
  const [embedError, setEmbedError] = useState(false);

  // ✅ prevents double-firing (YouTube sometimes fires onEnd weirdly)
  const lastEndRef = useRef(0);

  // Get host camera for video preview when nothing is playing
  const participants = useParticipants();
  const hostParticipant = participants[0]; // First participant is usually the host
  const cameraTracks = useTracks([Track.Source.Camera]);
  const hostCameraTrack = cameraTracks.find(
    (t) => t.participant?.identity === hostParticipant?.identity
  );

  const cameraVideoRef = useRef(null);

  useEffect(() => {
    if (!player || !playerReady || !playbackState) return;

    try {
      if (playbackState.isPlaying && playbackState.videoId) {
        const elapsedSeconds = Math.floor((Date.now() - playbackState.startTime) / 1000);
        player.seekTo(elapsedSeconds, true);
        player.playVideo();
      } else {
        player.pauseVideo();
      }
    } catch (error) {
      console.error("Error syncing playback:", error);
    }
  }, [player, playerReady, playbackState]);

  useEffect(() => {
    setEmbedError(false);
    setPlayerReady(false);
  }, [currentSong?.videoId]);

  // Attach host camera when no song is playing
  useEffect(() => {
    const videoElement = cameraVideoRef.current;
    const track = hostCameraTrack?.publication?.track;

    if (!currentSong && videoElement && track) {
      track.attach(videoElement);
      console.log("Host camera attached to video player");
      return () => {
        track.detach(videoElement);
        console.log("Host camera detached from video player");
      };
    }
  }, [hostCameraTrack?.publication?.track, currentSong]);

  const onReady = (event) => {
    setPlayer(event.target);
    setPlayerReady(true);
    setEmbedError(false);
  };

  const onError = (event) => {
    console.error("YouTube player error:", event.data);
    if (event.data === 101 || event.data === 150) setEmbedError(true);
  };

  // ✅ AUTO-PLAY NEXT
  const onEnd = () => {
    if (!isHost) return; // only host advances queue
    const now = Date.now();
    if (now - lastEndRef.current < 1500) return; // debounce
    lastEndRef.current = now;

    onSkip?.();
  };

  const opts = {
    height: "100%",
    width: "100%",
    playerVars: {
      autoplay: 1,
      controls: isHost ? 1 : 0, // ✅ DJ gets full controls
      disablekb: isHost ? 0 : 1, // ✅ DJ can use keyboard
      modestbranding: 1,
      rel: 0,
      fs: 1, // Fullscreen for everyone
      iv_load_policy: 3, // No annotations
    },
  };

  if (!currentSong) {
    const hasHostCamera = hostCameraTrack?.publication && !hostCameraTrack.publication.isMuted;

    return (
      <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-2xl p-5 md:p-7">
        <div className="rounded-2xl border border-white/10 bg-black/30 overflow-hidden">
          <div className="aspect-video relative bg-gradient-to-br from-fuchsia-900/20 to-indigo-900/20">
            {hasHostCamera ? (
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
            ) : (
              /* No camera - show default */
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
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-2xl p-5 md:p-7">
      {/* Title */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-4">
        <div>
          <div className="text-xs tracking-widest uppercase text-white/50">Now Playing</div>
          <h2 className="text-xl md:text-2xl font-extrabold leading-tight">{currentSong.title}</h2>
          <div className="mt-1 text-white/60">
            Singer:{" "}
            <span className="font-bold text-white bg-black/30 px-2 py-1 rounded-lg border border-white/10">
              {currentSong.requestedBy || currentSong.singerName || "Someone"}
            </span>
          </div>
        </div>

        {isHost && (
          <button
            onClick={onSkip}
            className="px-4 py-2 rounded-xl font-bold bg-[linear-gradient(90deg,#ef4444,#f97316)] hover:opacity-95 active:scale-[0.99] transition border border-white/10 shadow-[0_18px_60px_rgba(239,68,68,0.16)]"
          >
            Skip ⏭️
          </button>
        )}
      </div>

      {/* Player Frame */}
      {embedError ? (
        <div className="rounded-2xl border border-white/10 bg-black/30 overflow-hidden">
          <div className="aspect-video flex items-center justify-center">
            <div className="text-center p-8">
              <div className="text-5xl mb-4">🚫</div>
              <div className="text-xl font-extrabold mb-2">Can’t embed this one</div>
              <div className="text-white/60 mb-4">
                Publisher blocked external playback. (Love that for us.)
              </div>
              <button
                onClick={() => window.open(`https://www.youtube.com/watch?v=${currentSong.videoId}`, "_blank")}
                className="px-5 py-3 rounded-xl font-bold bg-[linear-gradient(90deg,#ff2aa1,#7c3aed)] hover:opacity-95 transition"
              >
                Watch on YouTube ↗️
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-white/10 bg-black/60 overflow-hidden shadow-[0_0_0_1px_rgba(255,255,255,0.06),0_30px_90px_rgba(124,58,237,0.10)]">
          <div className="aspect-video">
            <YouTube
              videoId={currentSong.videoId}
              opts={opts}
              onReady={onReady}
              onError={onError}
              onEnd={onEnd}   // ✅ HERE
              className="w-full h-full"
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default VideoPlayer;