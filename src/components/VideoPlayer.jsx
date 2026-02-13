import React, { useEffect, useMemo, useRef, useState } from "react";
import YouTube from "react-youtube";

function VideoPlayer({ currentSong, playbackState, onSkip, isHost }) {
  const [player, setPlayer] = useState(null);
  const [playerReady, setPlayerReady] = useState(false);
  const [embedError, setEmbedError] = useState(false);

  // ✅ prevents double-firing (YouTube sometimes fires onEnd weirdly)
  const lastEndRef = useRef(0);

  // ✅ store latest refs so intervals don’t go stale
  const playbackRef = useRef(playbackState);
  const songRef = useRef(currentSong);
  const isHostRef = useRef(isHost);
const [countdown, setCountdown] = useState(null);
  useEffect(() => {
    playbackRef.current = playbackState;
  }, [playbackState]);

  useEffect(() => {
    songRef.current = currentSong;
  }, [currentSong]);

  useEffect(() => {
    isHostRef.current = isHost;
  }, [isHost]);

  // ✅ reset on new song
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

  // ✅ AUTO-PLAY NEXT (host only)
  const onEnd = () => {
    if (!isHost) return;
    const now = Date.now();
    if (now - lastEndRef.current < 1500) return; // debounce
    lastEndRef.current = now;
    onSkip?.();
  };

  // ✅ 1) Immediate sync on playback changes (your original logic, kept)
  useEffect(() => {
  if (!player || !playerReady || !playbackState) return;

  try {
    if (playbackState.isPlaying && playbackState.videoId) {
      const msUntilStart = playbackState.startTime - Date.now();

      // ⏳ FUTURE START → countdown mode
      if (msUntilStart > 0) {
        const seconds = Math.ceil(msUntilStart / 1000);
        setCountdown(seconds);

        const t = setTimeout(() => {
          setCountdown(null);
        }, msUntilStart);

        return () => clearTimeout(t);
      }

      // ▶️ START NOW (after countdown)
      const elapsedSeconds = Math.floor(
        (Date.now() - playbackState.startTime) / 1000
      );

      player.seekTo(elapsedSeconds, true);
      player.playVideo();
      setCountdown(null);
    } else {
      player.pauseVideo();
      setCountdown(null);
    }
  } catch (error) {
    console.error("Error syncing playback:", error);
  }
}, [player, playerReady, playbackState]);

  // ✅ 2) Continuous drift correction + anti-pause for guests
  useEffect(() => {
    if (!player || !playerReady) return;

    const SYNC_INTERVAL = 1200; // ms
    const MAX_DRIFT = 1.2; // seconds

    const tick = () => {
      const ps = playbackRef.current;
      const song = songRef.current;
      if (!ps || !song?.videoId) return;
      if (ps.startTime > Date.now()) return; // wait for scheduled start

      // If not playing globally, allow pause (host controls state via Firebase)
      if (!ps.isPlaying) {
        try {
          player.pauseVideo();
        } catch {}
        return;
      }

      // Expected global time from Firebase startTime
      const expected = Math.max(0, (Date.now() - ps.startTime) / 1000);

      let current = 0;
      try {
        current = player.getCurrentTime?.() || 0;
      } catch {}

      const drift = Math.abs(current - expected);

      // If drift too big → force seek back to global time
      if (drift > MAX_DRIFT) {
        try {
          player.seekTo(expected, true);
        } catch {}
      }

      // Force play in case user paused locally
      try {
        const state = player.getPlayerState?.(); // 1 playing, 2 paused, etc
        if (state !== 1) player.playVideo();
      } catch {}
    };

    const interval = setInterval(tick, SYNC_INTERVAL);
    return () => clearInterval(interval);
  }, [player, playerReady]);

  // ✅ 3) React to user trying to pause/seek (guests)
  const onStateChange = (e) => {
    // only enforce when globally playing and user is not host
    const ps = playbackRef.current;
    if (!ps?.isPlaying) return;
    if (isHostRef.current) return;

    // 2 = paused
    if (e.data === 2) {
      // snap back: play + correct time immediately
      try {
        const expected = Math.max(0, (Date.now() - ps.startTime) / 1000);
        player.seekTo(expected, true);
        player.playVideo();
      } catch {}
    }
  };

  const opts = useMemo(
    () => ({
      height: "100%",
      width: "100%",
      playerVars: {
        autoplay: 1,
        controls: isHost ? 1 : 0, // ✅ guests no controls
        disablekb: isHost ? 0 : 1, // ✅ guests no keyboard pause/seek
        modestbranding: 1,
        rel: 0,
      },
    }),
    [isHost]
  );

  if (!currentSong) {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-2xl p-5 md:p-7">
        <div className="rounded-2xl border border-white/10 bg-black/30 overflow-hidden">
          <div className="aspect-video flex items-center justify-center">
            <div className="text-center px-6">
              <div className="text-6xl mb-4">🎧</div>
              <div className="text-xl md:text-2xl font-extrabold">
                <span className="bg-clip-text text-transparent bg-[linear-gradient(90deg,#ff3aa7,#9b7bff,#ffd24a)]">
                  No track loaded
                </span>
              </div>
              <div className="mt-2 text-white/60">
                {isHost
                  ? "Add songs to the queue to start the set."
                  : "Waiting for the host to press play…"}
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
          <div className="text-xs tracking-widest uppercase text-white/50">
            Now Playing
          </div>
          <h2 className="text-xl md:text-2xl font-extrabold leading-tight">
            {currentSong.title}
          </h2>
          <div className="mt-1 text-white/60">
            Singer:{" "}
            <span className="font-bold text-white bg-black/30 px-2 py-1 rounded-lg border border-white/10">
              {currentSong.singerName || currentSong.requestedByName || "Someone"}
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
              <div className="text-xl font-extrabold mb-2">
                Can’t embed this one
              </div>
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
            {countdown !== null && (
  <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/70">
    <div className="text-center">
      <div className="text-sm text-white/60 mb-2">Starting in</div>
      <div className="text-6xl font-extrabold text-white">{countdown}</div>
    </div>
  </div>
)}
            <YouTube
              videoId={currentSong.videoId}
              opts={opts}
              onReady={onReady}
              onError={onError}
              onEnd={onEnd}
              onStateChange={onStateChange} // ✅ NEW
              className="w-full h-full"
            />
          </div>
        </div>
      )}
    </div>
  );
}

function areEqual(prev, next) {
  return (
    prev.isHost === next.isHost &&
    prev.currentSong?.videoId === next.currentSong?.videoId &&
    prev.currentSong?.title === next.currentSong?.title &&
    prev.currentSong?.singerName === next.currentSong?.singerName &&
    prev.currentSong?.requestedByName === next.currentSong?.requestedByName &&
    prev.playbackState?.isPlaying === next.playbackState?.isPlaying &&
    prev.playbackState?.videoId === next.playbackState?.videoId &&
    prev.playbackState?.startTime === next.playbackState?.startTime
  );
}

export default React.memo(VideoPlayer, areEqual);
