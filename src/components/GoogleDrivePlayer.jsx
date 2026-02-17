import React, { useEffect, useRef, useState, useCallback } from "react";

/**
 * StreamingVideoPlayer - plays videos from any direct URL with synced playback.
 *
 * Uses HTML5 <video> element for full playback control (play, pause, seek).
 * Accepts any direct video URL (Dropbox ?dl=1, direct .mp4, Google Drive /uc, etc.)
 *
 * Kept as GoogleDrivePlayer export name for backward compat with imports.
 */
const GoogleDrivePlayer = React.memo(({
  videoUrl,
  title,
  playbackState,
  onSkip,
  isHost,
  requestedBy
}) => {
  const videoRef = useRef(null);
  const syncIntervalRef = useRef(null);
  const [videoError, setVideoError] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Sync playback to global time (same pattern as VideoPlayer.jsx)
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !playbackState) return;

    if (syncIntervalRef.current) {
      clearInterval(syncIntervalRef.current);
      syncIntervalRef.current = null;
    }

    if (playbackState.isPlaying && videoUrl) {
      const elapsedSeconds = (Date.now() - playbackState.startTime) / 1000;
      video.currentTime = elapsedSeconds;
      video.play().catch((e) => console.warn("Autoplay blocked:", e));

      // Continuous re-sync for participants (every 3s)
      if (!isHost) {
        syncIntervalRef.current = setInterval(() => {
          const currentElapsed = (Date.now() - playbackState.startTime) / 1000;
          const playerTime = video.currentTime;

          if (Math.abs(currentElapsed - playerTime) > 3) {
            console.log(`Resyncing: host at ${currentElapsed.toFixed(1)}s, local at ${playerTime.toFixed(1)}s`);
            video.currentTime = currentElapsed;
            video.play().catch(() => {});
          }
        }, 3000);
      }
    } else {
      video.pause();
    }

    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
        syncIntervalRef.current = null;
      }
    };
  }, [playbackState?.isPlaying, playbackState?.startTime, videoUrl, isHost]);

  // If participant manually pauses/seeks, snap back to global time
  const handlePlay = useCallback(() => {
    if (isHost || !playbackState?.isPlaying) return;
    const video = videoRef.current;
    if (!video) return;

    const elapsedSeconds = (Date.now() - playbackState.startTime) / 1000;
    if (Math.abs(elapsedSeconds - video.currentTime) > 1) {
      video.currentTime = elapsedSeconds;
    }
  }, [isHost, playbackState]);

  // Auto-advance when video ends (host only)
  const handleEnded = useCallback(() => {
    if (isHost && onSkip) {
      onSkip();
    }
  }, [isHost, onSkip]);

  const handleError = useCallback(() => {
    console.error("Video playback error for URL:", videoUrl);
    setVideoError(true);
  }, [videoUrl]);

  // Reset error state when URL changes
  useEffect(() => {
    setVideoError(false);
  }, [videoUrl]);

  // Fullscreen
  const handleFullscreen = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.requestFullscreen) video.requestFullscreen();
    else if (video.webkitRequestFullscreen) video.webkitRequestFullscreen();
  };

  useEffect(() => {
    const onChange = () => {
      setIsFullscreen(!!document.fullscreenElement || !!document.webkitFullscreenElement);
    };
    document.addEventListener("fullscreenchange", onChange);
    document.addEventListener("webkitfullscreenchange", onChange);
    return () => {
      document.removeEventListener("fullscreenchange", onChange);
      document.removeEventListener("webkitfullscreenchange", onChange);
    };
  }, []);

  if (!videoUrl) {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-2xl p-5 md:p-7">
        <div className="rounded-2xl border border-white/10 bg-black/30 overflow-hidden">
          <div className="aspect-video flex items-center justify-center">
            <div className="text-center p-8">
              <div className="text-5xl mb-4">📺</div>
              <div className="text-xl font-extrabold mb-2">No video playing</div>
              <div className="text-white/60">
                Host will add a video to the queue
              </div>
            </div>
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
          <h2 className="text-xl md:text-2xl font-extrabold leading-tight">{title || "Video"}</h2>
          {requestedBy && (
            <div className="mt-1 text-white/60">
              Added by:{" "}
              <span className="font-bold text-white bg-black/30 px-2 py-1 rounded-lg border border-white/10">
                {requestedBy}
              </span>
            </div>
          )}
        </div>

        <div className="flex gap-2">
          {!videoError && (
            <button
              onClick={handleFullscreen}
              className="px-4 py-2 rounded-xl font-bold bg-[linear-gradient(90deg,#7c3aed,#3b82f6)] hover:opacity-95 active:scale-[0.99] transition border border-white/10 shadow-[0_18px_60px_rgba(124,58,237,0.16)]"
              title="Fullscreen"
            >
              {isFullscreen ? "Exit" : "Fullscreen"}
            </button>
          )}

          {isHost && (
            <button
              onClick={onSkip}
              className="px-4 py-2 rounded-xl font-bold bg-[linear-gradient(90deg,#ef4444,#f97316)] hover:opacity-95 active:scale-[0.99] transition border border-white/10 shadow-[0_18px_60px_rgba(239,68,68,0.16)]"
            >
              Skip
            </button>
          )}
        </div>
      </div>

      {/* Player */}
      {videoError ? (
        <div className="rounded-2xl border border-white/10 bg-black/30 overflow-hidden">
          <div className="aspect-video flex items-center justify-center">
            <div className="text-center p-8">
              <div className="text-5xl mb-4">🚫</div>
              <div className="text-xl font-extrabold mb-2">Can't play this video</div>
              <div className="text-white/60 mb-2">
                The URL might not support direct playback.
              </div>
              <div className="text-white/40 text-xs mb-4 break-all max-w-md mx-auto">
                {videoUrl}
              </div>
              <button
                onClick={() => window.open(videoUrl, "_blank")}
                className="px-5 py-3 rounded-xl font-bold bg-[linear-gradient(90deg,#ff2aa1,#7c3aed)] hover:opacity-95 transition"
              >
                Open link directly
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-white/10 bg-black/60 overflow-hidden shadow-[0_0_0_1px_rgba(255,255,255,0.06),0_30px_90px_rgba(124,58,237,0.10)]">
          <div className="aspect-video">
            <video
              ref={videoRef}
              src={videoUrl}
              className="w-full h-full bg-black"
              controls={isHost}
              crossOrigin="anonymous"
              playsInline
              onPlay={handlePlay}
              onEnded={handleEnded}
              onError={handleError}
            />
          </div>
        </div>
      )}
    </div>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.videoUrl === nextProps.videoUrl &&
    prevProps.title === nextProps.title &&
    prevProps.playbackState?.isPlaying === nextProps.playbackState?.isPlaying &&
    prevProps.playbackState?.startTime === nextProps.playbackState?.startTime &&
    prevProps.isHost === nextProps.isHost
  );
});

export default GoogleDrivePlayer;
