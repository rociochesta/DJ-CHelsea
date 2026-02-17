import React, { useEffect, useRef, useState } from "react";
import YouTube from "react-youtube";
import HostCameraPreview from "./HostCameraPreview";
import {
  useLocalParticipant,
  useParticipants,
  ParticipantTile as LKParticipantTile,
} from "@livekit/components-react";

const VideoPlayer = React.memo(
  function VideoPlayer({
    currentSong,
    playbackState,
    onSkip,
    isHost,

    // ✅ optional
    showHostWhenIdle = false,
    roomMode = "karaoke",
  }) {
    const [player, setPlayer] = useState(null);
    const [playerReady, setPlayerReady] = useState(false);
    const [embedError, setEmbedError] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);

    // ✅ opt-in performance mode
    const [performanceMode, setPerformanceMode] = useState(false);

    const { localParticipant } = useLocalParticipant();
    const liveKitParticipants = useParticipants();

    // ✅ heuristic host (first non-local)
    const hostCandidate = React.useMemo(() => {
      if (!liveKitParticipants?.length) return null;
      return liveKitParticipants.find((p) => !p?.isLocal) || null;
    }, [liveKitParticipants]);

    // ✅ prevents double-firing (YouTube sometimes fires onEnd weirdly)
    const lastEndRef = useRef(0);
    const syncIntervalRef = useRef(null);
    const wasPlayingRef = useRef(false);
    const cameraWasOnRef = useRef(false);

    // ✅ PERFORMANCE MODE (OPT-IN): only disable camera if user enables it
    useEffect(() => {
      if (isHost || !localParticipant) return;

      const isPlaying = !!(playbackState?.isPlaying && currentSong?.videoId);

      // If perf mode is OFF, do not auto-toggle camera.
      // If we previously disabled camera due to perf mode and user turned it off,
      // restore camera to prior state.
      if (!performanceMode) {
        if (wasPlayingRef.current) {
          wasPlayingRef.current = false;
          if (cameraWasOnRef.current) {
            localParticipant.setCameraEnabled(true).catch(console.error);
          }
        }
        return;
      }

      // Video just started playing (and perfMode ON)
      if (isPlaying && !wasPlayingRef.current) {
        wasPlayingRef.current = true;
        cameraWasOnRef.current = localParticipant.isCameraEnabled;

        if (cameraWasOnRef.current) {
          console.log("📹 Performance Mode ON — disabling camera during playback");
          localParticipant.setCameraEnabled(false).catch(console.error);
        }
      }

      // Video stopped (and perfMode ON)
      if (!isPlaying && wasPlayingRef.current) {
        wasPlayingRef.current = false;

        if (cameraWasOnRef.current) {
          console.log("📹 Video ended — restoring camera");
          localParticipant.setCameraEnabled(true).catch(console.error);
        }
      }
    }, [
      playbackState?.isPlaying,
      currentSong?.videoId,
      isHost,
      localParticipant,
      performanceMode,
    ]);

    // ✅ CONTINUOUS SYNC for participants
    useEffect(() => {
      if (!player || !playerReady || !playbackState) return;

      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
        syncIntervalRef.current = null;
      }

      try {
        if (playbackState.isPlaying && playbackState.videoId) {
          const elapsedSeconds = Math.floor(
            (Date.now() - playbackState.startTime) / 1000
          );
          player.seekTo(elapsedSeconds, true);
          player.playVideo();

          if (!isHost) {
            syncIntervalRef.current = setInterval(() => {
              try {
                const currentElapsed = Math.floor(
                  (Date.now() - playbackState.startTime) / 1000
                );
                const playerTime = Math.floor(player.getCurrentTime());

                if (Math.abs(currentElapsed - playerTime) > 3) {
                  console.log(
                    `🔄 Resyncing: DJ at ${currentElapsed}s, participant at ${playerTime}s`
                  );
                  player.seekTo(currentElapsed, true);
                  player.playVideo();
                }
              } catch (error) {
                console.error("Sync interval error:", error);
              }
            }, 3000);
          }
        } else {
          // ✅ host paused/stopped -> pause everyone
          player.pauseVideo();
        }
      } catch (error) {
        console.error("Error syncing playback:", error);
      }

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

    // ✅ Enforce host pause globally:
    // If host paused (playbackState.isPlaying === false), participants cannot keep playing.
    const onStateChange = (event) => {
      if (isHost) return;
      if (!player) return;

      // participant tried to play while host paused
      if (playbackState && playbackState.isPlaying === false && event.data === 1) {
        try {
          player.pauseVideo();
        } catch (e) {
          console.error("Failed to enforce host pause:", e);
        }
        return;
      }

      // existing anti-pause rule (only when host is playing)
      if (!isHost && playbackState?.isPlaying && player) {
        const elapsedSeconds = Math.floor(
          (Date.now() - playbackState.startTime) / 1000
        );

        if (event.data === 2) {
          try {
            player.seekTo(elapsedSeconds, true);
            player.playVideo();
          } catch (e) {
            console.error("Failed to force resume after pause:", e);
          }
          return;
        }

        if (event.data === 1) {
          try {
            const playerTime = Math.floor(player.getCurrentTime());
            if (Math.abs(elapsedSeconds - playerTime) > 1) {
              player.seekTo(elapsedSeconds, true);
            }
            player.playVideo();
          } catch (e) {
            console.error("Failed to sync on manual play:", e);
          }
        }
      }
    };

    const onEnd = () => {
      if (!isHost) return;
      const now = Date.now();
      if (now - lastEndRef.current < 1500) return;
      lastEndRef.current = now;
      onSkip?.();
    };

    const handleFullscreen = () => {
      const iframe = document.querySelector('iframe[src*="youtube.com"]');
      if (iframe) {
        if (iframe.requestFullscreen) iframe.requestFullscreen();
        else if (iframe.webkitRequestFullscreen) iframe.webkitRequestFullscreen();
        else if (iframe.mozRequestFullScreen) iframe.mozRequestFullScreen();
        else if (iframe.msRequestFullscreen) iframe.msRequestFullscreen();
      }
    };

    useEffect(() => {
      const handleFullscreenChange = () => {
        setIsFullscreen(
          !!(
            document.fullscreenElement ||
            document.webkitFullscreenElement ||
            document.mozFullScreenElement ||
            document.msFullscreenElement
          )
        );
      };

      document.addEventListener("fullscreenchange", handleFullscreenChange);
      document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
      document.addEventListener("mozfullscreenchange", handleFullscreenChange);
      document.addEventListener("MSFullscreenChange", handleFullscreenChange);

      return () => {
        document.removeEventListener("fullscreenchange", handleFullscreenChange);
        document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
        document.removeEventListener("mozfullscreenchange", handleFullscreenChange);
        document.removeEventListener("MSFullscreenChange", handleFullscreenChange);
      };
    }, []);

    const opts = {
      height: "100%",
      width: "100%",
      playerVars: {
        autoplay: 1,
        controls: isHost ? 1 : 0,
        disablekb: isHost ? 0 : 1,
        modestbranding: 1,
        rel: 0,
        fs: 1,
        iv_load_policy: 3,
        playsinline: 1,
      },
    };

    // ✅ IDLE (no song)
    if (!currentSong) {
      const isDJ = roomMode === "dj";
      const shouldShowHostTile =
        !isHost && showHostWhenIdle && isDJ && hostCandidate;

      return (
        <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-2xl p-5 md:p-7">
          <div className="rounded-2xl border border-white/10 bg-black/30 overflow-hidden">
            <div className="aspect-video relative bg-gradient-to-br from-fuchsia-900/20 to-indigo-900/20">
              {shouldShowHostTile ? (
                <div className="absolute inset-0">
                  <LKParticipantTile participant={hostCandidate} className="w-full h-full" />
                  <div className="absolute inset-0 bg-black/35" />
                  <div className="absolute left-4 top-4 rounded-2xl px-4 py-3 border border-white/10 bg-white/10 backdrop-blur-md">
                    <div className="text-lg font-extrabold text-fuchsia-200">DJ is live</div>
                    <div className="text-xs text-white/60">Waiting for the host to press play…</div>
                  </div>
                </div>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  {/* fallback: keep old behavior for host / non-DJ */}
                  <HostCameraPreview isHost={isHost} />
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-2xl p-5 md:p-7">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-4">
          <div>
            <div className="text-xs tracking-widest uppercase text-white/50">
              Now Playing
            </div>
            <h2 className="text-xl md:text-2xl font-extrabold leading-tight">
              {currentSong.title}
            </h2>
            <div className="mt-1 text-white/60">
              Singer:{" "}
              <span className="font-bold text-white bg-black/30 px-2 py-1 rounded-lg border border-white/10">
                {currentSong.requestedBy || currentSong.singerName || "Someone"}
              </span>
            </div>
          </div>

          <div className="flex gap-2">
            {!isHost && !embedError && (
              <button
                onClick={handleFullscreen}
                className="px-4 py-2 rounded-xl font-bold bg-[linear-gradient(90deg,#7c3aed,#3b82f6)] hover:opacity-95 active:scale-[0.99] transition border border-white/10 shadow-[0_18px_60px_rgba(124,58,237,0.16)]"
                title="Fullscreen"
              >
                {isFullscreen ? "↙️ Exit" : "⛶ Fullscreen"}
              </button>
            )}

            {isHost && (
              <button
                onClick={onSkip}
                className="px-4 py-2 rounded-xl font-bold bg-[linear-gradient(90deg,#ef4444,#f97316)] hover:opacity-95 active:scale-[0.99] transition border border-white/10 shadow-[0_18px_60px_rgba(239,68,68,0.16)]"
              >
                Skip ⏭️
              </button>
            )}
          </div>
        </div>

        {!isHost && (
          <button
            type="button"
            onClick={() => setPerformanceMode((v) => !v)}
            className={[
              "mb-3 w-full text-left px-3 py-2 rounded-lg border text-xs transition",
              performanceMode
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-200 hover:bg-emerald-500/14"
                : "bg-blue-500/10 border border-blue-500/30 text-blue-200 hover:bg-blue-500/14",
            ].join(" ")}
            title="Toggle Performance Mode"
          >
            💡 <strong>Performance Mode:</strong>{" "}
            {performanceMode
              ? "ON — camera turns off during playback (tap to turn OFF)"
              : "OFF — camera stays on (tap to reduce lag)"}
          </button>
        )}

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
                  onClick={() =>
                    window.open(
                      `https://www.youtube.com/watch?v=${currentSong.videoId}`,
                      "_blank"
                    )
                  }
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
                onStateChange={onStateChange}
                className="w-full h-full"
              />
            </div>
          </div>
        )}
      </div>
    );
  },
  (prevProps, nextProps) => {
    return (
      prevProps.currentSong?.videoId === nextProps.currentSong?.videoId &&
      prevProps.playbackState?.isPlaying === nextProps.playbackState?.isPlaying &&
      prevProps.playbackState?.videoId === nextProps.playbackState?.videoId &&
      prevProps.isHost === nextProps.isHost &&
      prevProps.showHostWhenIdle === nextProps.showHostWhenIdle &&
      prevProps.roomMode === nextProps.roomMode
    );
  }
);

export default VideoPlayer;