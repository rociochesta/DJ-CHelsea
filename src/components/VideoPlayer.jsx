import React, { useEffect, useRef, useState, useMemo } from "react";
import YouTube from "react-youtube";
import { database, ref, update } from "../utils/firebase";
import { playbackPosition,playerPlaybackUpdate,seekPlaybackUpdate } from '../utils/playbackSync';

function VideoPlayer({
  roomCode,
  currentSong,
  playbackState,
  onSkip,
  onStop,
  isHost,
  roomMode = "karaoke",
}) {
  const [player, setPlayer] = useState(null);
  const [playerReady, setPlayerReady] = useState(false);
  const [embedError, setEmbedError] = useState(null);
  const [playerAttempt, setPlayerAttempt] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const lastEndRef = useRef(0);
  const syncIntervalRef = useRef(null);
  const hostSyncLockRef = useRef(false);
  const syncUnlockRef = useRef(null);
  const broadcastPending = useRef(false);
  const initializedPlayerRef = useRef(null);

  // PARTICIPANT SYNC
  useEffect(() => {
    if (!player || !playerReady || !playbackState || playbackState.videoId !== currentSong?.videoId) return;

    if (syncIntervalRef.current) clearInterval(syncIntervalRef.current);

    try {
      if (playbackState.isPlaying && playbackState.videoId) {
        const elapsed = playbackPosition(playbackState);

        hostSyncLockRef.current = true;
        clearTimeout(syncUnlockRef.current);
        syncUnlockRef.current = setTimeout(() => (hostSyncLockRef.current = false), 500);

        if ((!isHost || initializedPlayerRef.current !== player) && Math.abs(player.getCurrentTime()-elapsed)>3) player.seekTo(elapsed, true);
        initializedPlayerRef.current = player;
        if(player.getPlayerState()!==1)player.playVideo();

        if (!isHost) {
          syncIntervalRef.current = setInterval(() => {
            try {
              const currentElapsed = playbackPosition(playbackState);
              const playerTime = Math.floor(player.getCurrentTime());

              if (Math.abs(currentElapsed - playerTime) > 3) {
                player.seekTo(currentElapsed, true);
                player.playVideo();
              }
            } catch {}
          }, 3000);
        } else {
          syncIntervalRef.current=setInterval(async()=>{
            if(hostSyncLockRef.current||broadcastPending.current)return;
            try{
              if(player.getPlayerState()!==1)return;
              const change=seekPlaybackUpdate(playbackState,player.getCurrentTime());
              if(!change)return;
              broadcastPending.current=true;
              await update(ref(database,`karaoke-rooms/${roomCode}/playbackState`),change);
            }catch{}finally{broadcastPending.current=false;}
          },1000);
        }
      } else {
        const paused=playbackPosition(playbackState);
        if(!isHost&&Math.abs(player.getCurrentTime()-paused)>1)player.seekTo(paused,true);
        player.pauseVideo();
      }
    } catch {}

    return () => {
      if (syncIntervalRef.current) clearInterval(syncIntervalRef.current);
      clearTimeout(syncUnlockRef.current);
      hostSyncLockRef.current=false;
    };
  }, [player, playerReady, playbackState,isHost,roomCode,currentSong?.videoId]);

  useEffect(() => {
    setEmbedError(null);
    setPlayerReady(false);
    setPlayer(null);
  }, [currentSong?.videoId]);

  const onReady = (e) => {
    setPlayer(e.target);
    setPlayerReady(true);
  };

  const onError = (e) => {
    setEmbedError(e.data);
  };

  // GLOBAL HOST PLAY/PAUSE BROADCAST
  const onStateChange = async (event) => {
    const activePlayer=event.target;
    if (!activePlayer || activePlayer.getVideoData()?.video_id !== currentSong?.videoId || playbackState?.videoId !== currentSong?.videoId) return;

    if (isHost && playbackState?.videoId) {
      if (hostSyncLockRef.current) return;

      const playbackRef = ref(
        database,
        `karaoke-rooms/${roomCode}/playbackState`
      );

      const change=playerPlaybackUpdate(playbackState,event.data,activePlayer.getCurrentTime());
      if(change){try{await update(playbackRef,change);}catch{}}
    }

    if (!isHost && playbackState?.isPlaying === false && event.data === 1) {
      activePlayer.pauseVideo();
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
      origin: window.location.origin,
      autoplay: roomMode === "dj" ? 0 : 1,
      controls: isHost ? 1 : 0,
      disablekb: isHost ? 0 : 1,
      modestbranding: 1,
      rel: 0,
      fs: 1,
      playsinline: 1,
    },
  };

  if (!currentSong) return <div className="rounded-3xl border border-white/10 bg-white/5 p-10 text-center"><h2 className="text-xl font-bold">Ready for a song</h2><p className="mt-2 text-white/55">Choose a track from the queue to start listening.</p></div>;

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
      <div className="aspect-video rounded-2xl overflow-hidden bg-black">
        {!embedError ? (
          <YouTube
            key={`${currentSong.videoId}-${playerAttempt}`}
            videoId={currentSong.videoId}
            opts={opts}
            onReady={onReady}
            onError={onError}
            onEnd={onEnd}
            onStateChange={onStateChange}
            className="w-full h-full"
            iframeClassName="w-full h-full"
          />
        ) : (
          <div role="alert" className="flex flex-col items-center justify-center gap-3 h-full p-5 text-center text-white">
            <p>{embedError === 101 || embedError === 150
              ? `YouTube refused embedded playback for this video (error ${embedError}). Try again or open it on YouTube.`
              : embedError === 153 ? 'YouTube could not identify this website. Try opening the room in your regular browser.'
              : embedError === 100 ? 'This video is unavailable or private.'
              : `YouTube could not play this video (error ${embedError}).`}</p>
            <div className="flex gap-3">
              <button className="rounded-xl border border-fuchsia-400/50 px-4 py-2" onClick={() => { setEmbedError(null); setPlayer(null); setPlayerReady(false); setPlayerAttempt(value => value + 1); }}>Retry video</button>
              <a href={`https://www.youtube.com/watch?v=${encodeURIComponent(currentSong.videoId)}`} target="_blank" rel="noopener noreferrer" className="rounded-xl border border-white/20 px-4 py-2">Open in YouTube</a>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}

export default React.memo(VideoPlayer);
