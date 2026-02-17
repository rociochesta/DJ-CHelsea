import React, { useEffect, useRef, useState, useCallback } from "react";

/**
 * GoogleDrivePlayer - plays videos from Google Drive with synced playback
 *
 * Uses an HTML5 <video> element instead of an iframe to avoid Google's
 * frame-ancestors CSP blocking and to get full playback control (play, pause,
 * seek) for proper time-sync across all participants.
 *
 * URL: https://drive.google.com/uc?export=download&id=FILE_ID
 */
const GoogleDrivePlayer = React.memo(({
  fileId,
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

  // Direct download URL works as a video source without CSP issues
  const videoUrl = fileId
    ? `https://drive.google.com/uc?export=download&id=${fileId}`
    : null;

  // Sync playback to global time (same pattern as VideoPlayer.jsx)
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !playbackState) return;

    if (syncIntervalRef.current) {
      clearInterval(syncIntervalRef.current);
      syncIntervalRef.current = null;
    }

    if (playbackState.isPlaying && fileId) {
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
  }, [playbackState?.isPlaying, playbackState?.startTime, fileId, isHost]);

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
    setVideoError(true);
  }, []);

  // Reset error state when fileId changes
  useEffect(() => {
    setVideoError(false);
  }, [fileId]);

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

  if (!fileId) {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-2xl p-5 md:p-7">
        <div className="rounded-2xl border border-white/10 bg-black/30 overflow-hidden">
          <div className="aspect-video flex items-center justify-center">
            <div className="text-center p-8">
              <div className="text-5xl mb-4">📺</div>
              <div className="text-xl font-extrabold mb-2">No video playing</div>
              <div className="text-white/60">
                Host will add a video from their Google Drive
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
              <div className="text-white/60 mb-4">
                Make sure the video is shared as "Anyone with the link can view"
              </div>
              <button
                onClick={() => window.open(`https://drive.google.com/file/d/${fileId}/view`, "_blank")}
                className="px-5 py-3 rounded-xl font-bold bg-[linear-gradient(90deg,#ff2aa1,#7c3aed)] hover:opacity-95 transition"
              >
                Open in Google Drive
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
              playsInline
              onPlay={handlePlay}
              onEnded={handleEnded}
              onError={handleError}
            />
          </div>
        </div>
      )}

      {/* Instructions for host */}
      {isHost && (
        <div className="mt-4 p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
          <div className="text-sm text-blue-200">
            <strong>Tip:</strong> To add videos, upload them to Google Drive,
            share as "Anyone with the link", and paste the share link or file ID.
          </div>
        </div>
      )}
    </div>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.fileId === nextProps.fileId &&
    prevProps.title === nextProps.title &&
    prevProps.playbackState?.isPlaying === nextProps.playbackState?.isPlaying &&
    prevProps.playbackState?.startTime === nextProps.playbackState?.startTime &&
    prevProps.isHost === nextProps.isHost
  );
});

export default GoogleDrivePlayer;
