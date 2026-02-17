import React, { useEffect, useRef, useState, useMemo } from "react";
import YouTube from "react-youtube";
import HostCameraPreview from "./HostCameraPreview";
import {
  useLocalParticipant,
  useParticipants,
  TrackLoop,
  VideoTrack,
  AudioTrack,
} from "@livekit/components-react";
import { Track } from "livekit-client";
import { database, ref, update } from "../utils/firebase";

function VideoPlayer({
  roomCode,
  currentSong,
  playbackState,
  onSkip,
  onStop,
  isHost,
  showHostWhenIdle = false,
  roomMode = "karaoke",
}) {
  const [player, setPlayer] = useState(null);
  const [playerReady, setPlayerReady] = useState(false);
  const [embedError, setEmbedError] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [performanceMode, setPerformanceMode] = useState(false);

  const { localParticipant } = useLocalParticipant();
  const liveKitParticipants = useParticipants();

  const hostCandidate = useMemo(() => {
    if (!liveKitParticipants?.length) return null;
    return liveKitParticipants.find((p) => !p?.isLocal) || null;
  }, [liveKitParticipants]);

  const lastEndRef = useRef(0);
  const syncIntervalRef = useRef(null);
  const wasPlayingRef = useRef(false);
  const cameraWasOnRef = useRef(false);
  const hostSyncLockRef = useRef(false);

  // PERFORMANCE MODE (opt-in)
  useEffect(() => {
    if (isHost || !localParticipant) return;

    const isPlaying = !!(playbackState?.isPlaying && currentSong?.videoId);

    if (!performanceMode) {
      if (wasPlayingRef.current) {
        wasPlayingRef.current = false;
        if (cameraWasOnRef.current) {
          localParticipant.setCameraEnabled(true).catch(console.error);
        }
      }
      return;
    }

    if (isPlaying && !wasPlayingRef.current) {
      wasPlayingRef.current = true;
      cameraWasOnRef.current = localParticipant.isCameraEnabled;

      if (cameraWasOnRef.current) {
        localParticipant.setCameraEnabled(false).catch(console.error);
      }
    }

    if (!isPlaying && wasPlayingRef.current) {
      wasPlayingRef.current = false;
      if (cameraWasOnRef.current) {
        localParticipant.setCameraEnabled(true).catch(console.error);
      }
    }
  }, [playbackState?.isPlaying, currentSong?.videoId, performanceMode]);

  // PARTICIPANT SYNC
  useEffect(() => {
    if (!player || !playerReady || !playbackState) return;

    if (syncIntervalRef.current) clearInterval(syncIntervalRef.current);

    try {
      if (playbackState.isPlaying && playbackState.videoId) {
        const elapsed = Math.floor(
          (Date.now() - playbackState.startTime) / 1000
        );

        hostSyncLockRef.current = true;
        setTimeout(() => (hostSyncLockRef.current = false), 200);

        player.seekTo(elapsed, true);
        player.playVideo();

        if (!isHost) {
          syncIntervalRef.current = setInterval(() => {
            try {
              const currentElapsed = Math.floor(
                (Date.now() - playbackState.startTime) / 1000
              );
              const playerTime = Math.floor(player.getCurrentTime());

              if (Math.abs(currentElapsed - playerTime) > 3) {
                player.seekTo(currentElapsed, true);
                player.playVideo();
              }
            } catch {}
          }, 3000);
        }
      } else {
        player.pauseVideo();
      }
    } catch {}

    return () => {
      if (syncIntervalRef.current) clearInterval(syncIntervalRef.current);
    };
  }, [player, playerReady, playbackState]);

  useEffect(() => {
    setEmbedError(false);
    setPlayerReady(false);
  }, [currentSong?.videoId]);

  const onReady = (e) => {
    setPlayer(e.target);
    setPlayerReady(true);
  };

  const onError = (e) => {
    if (e.data === 101 || e.data === 150) setEmbedError(true);
  };

  // GLOBAL HOST PLAY/PAUSE BROADCAST
  const onStateChange = async (event) => {
    if (!player) return;

    if (isHost && playbackState?.videoId) {
      if (hostSyncLockRef.current) return;

      const playbackRef = ref(
        database,
        `karaoke-rooms/${roomCode}/playbackState`
      );

      if (event.data === 2) {
        const t = Math.floor(player.getCurrentTime());
        await update(playbackRef, { isPlaying: false, pausedAtSeconds: t });
      }

      if (event.data === 1) {
        const paused =
          typeof playbackState?.pausedAtSeconds === "number"
            ? playbackState.pausedAtSeconds
            : Math.floor(player.getCurrentTime());

        await update(playbackRef, {
          isPlaying: true,
          startTime: Date.now() - paused * 1000,
          pausedAtSeconds: null,
        });
      }
    }

    if (!isHost && playbackState?.isPlaying === false && event.data === 1) {
      player.pauseVideo();
      return;
    }
  };

  // END HANDLER
  const onEnd = () => {
    if (!isHost) return;
    const now = Date.now();
    if (now - lastEndRef.current < 1500) return;
    lastEndRef.current = now;

    if (roomMode === "dj") {
      onStop?.();
      return;
    }

    onSkip?.();
  };

  const opts = {
    height: "100%",
    width: "100%",
    playerVars: {
      autoplay: roomMode === "dj" ? 0 : 1,
      controls: isHost ? 1 : 0,
      disablekb: isHost ? 0 : 1,
      modestbranding: 1,
      rel: 0,
      fs: 1,
      playsinline: 1,
    },
  };

  // IDLE — show DJ camera to participants
  if (!currentSong) {
    const shouldShowHostTile =
      !isHost && showHostWhenIdle && roomMode === "dj" && hostCandidate;

    return (
      <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
        <div className="aspect-video relative bg-black/40 rounded-2xl overflow-hidden">
          {shouldShowHostTile ? (
            <>
              <TrackLoop
                tracks={[
                  { participant: hostCandidate, source: Track.Source.Camera },
                ]}
              >
                <VideoTrack className="w-full h-full object-cover" />
              </TrackLoop>

              <TrackLoop
                tracks={[
                  {
                    participant: hostCandidate,
                    source: Track.Source.Microphone,
                  },
                ]}
              >
                <AudioTrack />
              </TrackLoop>

              <div className="absolute top-4 left-4 bg-black/40 px-4 py-2 rounded-xl text-white">
                🎧 DJ is live
              </div>
            </>
          ) : (
            <HostCameraPreview isHost={isHost} />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
      <div className="aspect-video rounded-2xl overflow-hidden bg-black">
        {!embedError ? (
          <YouTube
            videoId={currentSong.videoId}
            opts={opts}
            onReady={onReady}
            onError={onError}
            onEnd={onEnd}
            onStateChange={onStateChange}
            className="w-full h-full"
          />
        ) : (
          <div className="flex items-center justify-center h-full text-white">
            Cannot embed — open in YouTube
          </div>
        )}
      </div>

      {!isHost && (
        <button
          onClick={() => setPerformanceMode((v) => !v)}
          className="mt-3 text-xs w-full p-2 rounded-lg bg-white/10"
        >
          Performance Mode: {performanceMode ? "ON" : "OFF"}
        </button>
      )}
    </div>
  );
}

export default React.memo(VideoPlayer);