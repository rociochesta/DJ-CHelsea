import React, { useEffect, useRef, useState } from "react";
import YouTube from "react-youtube";
import HostCameraPreview from "./HostCameraPreview";

const VideoPlayer = React.memo(function VideoPlayer({ currentSong, playbackState, onSkip, isHost }) {
  const [player, setPlayer] = useState(null);
  const [playerReady, setPlayerReady] = useState(false);
  const [embedError, setEmbedError] = useState(false);

  // ✅ prevents double-firing (YouTube sometimes fires onEnd weirdly)
  const lastEndRef = useRef(0);
  const syncIntervalRef = useRef(null);

  // ✅ CONTINUOUS SYNC for participants - prevents lag and handles resume
  useEffect(() => {
    if (!player || !playerReady || !playbackState) return;

    // Clear any existing interval
    if (syncIntervalRef.current) {
      clearInterval(syncIntervalRef.current);
      syncIntervalRef.current = null;
    }

    try {
      if (playbackState.isPlaying && playbackState.videoId) {
        // Immediate sync
        const elapsedSeconds = Math.floor((Date.now() - playbackState.startTime) / 1000);
        player.seekTo(elapsedSeconds, true);
        player.playVideo();

        // ✅ ONLY sync continuously for participants (DJ controls their own playback)
        if (!isHost) {
          syncIntervalRef.current = setInterval(() => {
            try {
              const currentElapsed = Math.floor((Date.now() - playbackState.startTime) / 1000);
              const playerTime = Math.floor(player.getCurrentTime());
              
              // If player is more than 2 seconds off, resync
              if (Math.abs(currentElapsed - playerTime) > 2) {
                console.log(`🔄 Resyncing: DJ at ${currentElapsed}s, participant at ${playerTime}s`);
                player.seekTo(currentElapsed, true);
                player.playVideo();
              }
            } catch (error) {
              console.error("Sync interval error:", error);
            }
          }, 2000);
        }
      } else {
        player.pauseVideo();
      }
    } catch (error) {
      console.error("Error syncing playback:", error);
    }

    // Cleanup interval on unmount or when dependencies change
    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
        syncIntervalRef.current = null;
      }
    };
  }, [player, playerReady, playbackState, isHost]);

  useEffect(() => {
    setEmbedError(false);
    setPlayerReady(false);
  }, [currentSong?.videoId]);

  const onReady = (event) => {
    setPlayer(event.target);
    setPlayerReady(true);
    setEmbedError(false);
  };

  const onError = (event) => {
    console.error("YouTube player error:", event.data);
    if (event.data === 101 || event.data === 150) setEmbedError(true);
  };

  // ✅ Handle participant state changes (pause/play)
  const onStateChange = (event) => {
    // event.data values:
    // -1 (unstarted), 0 (ended), 1 (playing), 2 (paused), 3 (buffering), 5 (video cued)
    
    if (!isHost && playbackState?.isPlaying) {
      // Participant manually paused/played - force resync to DJ time
      if (event.data === 1) { // Playing
        const elapsedSeconds = Math.floor((Date.now() - playbackState.startTime) / 1000);
        const playerTime = Math.floor(player.getCurrentTime());
        
        if (Math.abs(elapsedSeconds - playerTime) > 1) {
          console.log(`🔄 Manual play detected - syncing to DJ time: ${elapsedSeconds}s`);
          player.seekTo(elapsedSeconds, true);
        }
      }
    }
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
      controls: isHost ? 1 : 0, // ✅ DJ gets full controls, participants get none
      disablekb: isHost ? 0 : 1, // ✅ DJ can use keyboard, participants cannot
      modestbranding: 1,
      rel: 0,
      fs: 1, // Fullscreen for everyone
      iv_load_policy: 3, // No annotations
    },
  };

  if (!currentSong) {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-2xl p-5 md:p-7">
        <div className="rounded-2xl border border-white/10 bg-black/30 overflow-hidden">
          <div className="aspect-video relative bg-gradient-to-br from-fuchsia-900/20 to-indigo-900/20">
            <HostCameraPreview isHost={isHost} />
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
              <div className="text-xl font-extrabold mb-2">Can't embed this one</div>
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
              onEnd={onEnd}
              onStateChange={onStateChange} // ✅ NEW: Handle manual play/pause
              className="w-full h-full"
            />
          </div>
        </div>
      )}
    </div>
  );
}, (prevProps, nextProps) => {
  // Only re-render if these values actually change
  return (
    prevProps.currentSong?.videoId === nextProps.currentSong?.videoId &&
    prevProps.playbackState?.isPlaying === nextProps.playbackState?.isPlaying &&
    prevProps.playbackState?.videoId === nextProps.playbackState?.videoId &&
    prevProps.isHost === nextProps.isHost
  );
  // Note: onSkip is a function and will always be different, but we don't care
});

export default VideoPlayer;