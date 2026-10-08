import { useState, useMemo, useCallback, useRef } from "react";
import { playbackRoomMode, getRoomMode, isSecretRoom } from '../utils/secretRoom';
import { database, ref, set, update, push, remove } from "../utils/firebase";
import { searchKaraokeVideos } from "../utils/youtube";

import VideoPlayer from "./VideoPlayer";
import GoogleDrivePlayer from "./GoogleDrivePlayer";
import SongQueue from "./SongQueue";
import SongSearch from "./SongSearch";
import StreamingQueue from "./StreamingQueue";
import ChatPanel from "./ChatPanel";
import RoomWall from './RoomWall';
import EmojiReactions from "./EmojiReactions";

import MeetingDisplay from "./MeetingDisplay";
import JamGames from "./JamGames";
import MeetingReadingsList from "./MeetingReadingsList";
import { Mic, Radio, MonitorPlay, Headphones, Sliders, BookOpen, DoorOpen, ListMusic } from "lucide-react";

function HostView({ roomCode, currentUser, roomState, onCloseRoom }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [djAutoplay, setDjAutoplay] = useState(false);
  // Determine room mode
  const isSecret = isSecretRoom(roomState);
  const roomMode = playbackRoomMode(getRoomMode(roomState));
  const isStreaming = roomMode === "streaming";
  const isDJ = roomMode === "dj";
  const quizFocus = isDJ && roomState?.gameInvitation?.type === 'music-quiz';
  const isKaraoke = roomMode === "karaoke";
  const isMeeting = roomMode === "meeting";

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setHasSearched(true);
    try {
      const results = await searchKaraokeVideos(searchQuery);
      setSearchResults(results);
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddToQueue = async (video, requestedBy, message = '') => {
    const queueRef = ref(database, `karaoke-rooms/${roomCode}/queue`);
    const newSongRef = push(queueRef);

    await set(newSongRef, {
      id: newSongRef.key,
      videoId: video.id,
      title: video.title,
      thumbnail: video.thumbnail,
      addedBy: currentUser.id,
      addedByName: currentUser.name,
      ...(isSecret ? { message: message.trim(), messageAuthor: currentUser.name } : {}),
      requestedBy: requestedBy || "Someone",
      addedAt: Date.now(),
    });
  };
  const handlePlaySong = async (song) => {
    const currentSongRef = ref(database, `karaoke-rooms/${roomCode}/currentSong`);
    await set(currentSongRef, song);

    const songRef = ref(database, `karaoke-rooms/${roomCode}/queue/${song.id}`);
    await remove(songRef);

    const playbackRef = ref(database, `karaoke-rooms/${roomCode}/playbackState`);
    await update(playbackRef, {
      isPlaying: true,
      videoId: song.videoId || song.fileId,
      startTime: Date.now(),
    });


  };

  const handleStopSong = async () => {


    const currentSongRef = ref(database, `karaoke-rooms/${roomCode}/currentSong`);
    await set(currentSongRef, null);

    const playbackRef = ref(database, `karaoke-rooms/${roomCode}/playbackState`);
    await update(playbackRef, {
      isPlaying: false,
      videoId: null,
      pausedAtSeconds: 0,
    });

    if (isDJ && djAutoplay) {
      const queue = roomState?.queue ? Object.values(roomState.queue) : [];
      if (queue.length > 0) {
        const sorted = [...queue].sort((a, b) => (a.addedAt || 0) - (b.addedAt || 0));
        await handlePlaySong(sorted[0]);
      }
    }
  };

  const handleSkipSong = async () => {


    const currentSongRef = ref(database, `karaoke-rooms/${roomCode}/currentSong`);
    await set(currentSongRef, null);

    const playbackRef = ref(database, `karaoke-rooms/${roomCode}/playbackState`);
    await update(playbackRef, {
      isPlaying: false,
      videoId: null,
      pausedAtSeconds: 0,
    });

    if (isDJ && !djAutoplay) return;

    const queue = roomState?.queue ? Object.values(roomState.queue) : [];
    if (queue.length > 0) {
      const sorted = [...queue].sort((a, b) => (a.addedAt || 0) - (b.addedAt || 0));
      await handlePlaySong(sorted[0]);
    }
  };

  const handleDeleteSong = async (songId) => {
    const songRef = ref(database, `karaoke-rooms/${roomCode}/queue/${songId}`);
    await remove(songRef);
  };

  const handleMoveSongUp = async (songId) => {
    const queue = roomState?.queue
      ? Object.values(roomState.queue).sort((a, b) => a.addedAt - b.addedAt)
      : [];
    const index = queue.findIndex((s) => s.id === songId);
    if (index > 0) {
      const temp = queue[index - 1].addedAt;
      queue[index - 1].addedAt = queue[index].addedAt;
      queue[index].addedAt = temp;

      const queueRef = ref(database, `karaoke-rooms/${roomCode}/queue`);
      const updates = {};
      queue.forEach((song) => {
        updates[song.id] = song;
      });
      await update(queueRef, updates);
    }
  };

  const handleMoveSongDown = async (songId) => {
    const queue = roomState?.queue
      ? Object.values(roomState.queue).sort((a, b) => a.addedAt - b.addedAt)
      : [];
    const index = queue.findIndex((s) => s.id === songId);
    if (index < queue.length - 1 && index >= 0) {
      const temp = queue[index + 1].addedAt;
      queue[index + 1].addedAt = queue[index].addedAt;
      queue[index].addedAt = temp;

      const queueRef = ref(database, `karaoke-rooms/${roomCode}/queue`);
      const updates = {};
      queue.forEach((song) => {
        updates[song.id] = song;
      });
      await update(queueRef, updates);
    }
  };

  const handleSelectReading = async (readingId) => {
    const readingRef = ref(database, `karaoke-rooms/${roomCode}/activeReadingId`);
    await set(readingRef, readingId);
  };

  const handleSendBotMessage = async (text, type = "system") => {
    const chatRef = ref(database, `room-chat/${roomCode}`);
    const newMsgRef = push(chatRef);
    await set(newMsgRef, {
      userId: "system",
      userName: "Rociwi's Hub",
      message: text,
      isSystem: true,
      systemType: type,
      timestamp: Date.now(),
    });
  };

  const queue = roomState?.queue ? Object.values(roomState.queue) : [];
  const participants = roomState?.participants ? Object.values(roomState.participants) : [];
  const naMembers = roomState?.naMembers
    ? Object.values(roomState.naMembers).filter((m) => m.active)
    : [];
  const currentSong = roomState?.currentSong;

  // Stable playbackState — only changes when meaningful fields change,
  // so React.memo(VideoPlayer) won't re-render on chat/queue/naMembers writes
  const stablePlaybackState = useMemo(
    () => roomState?.playbackState,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      roomState?.playbackState?.isPlaying,
      roomState?.playbackState?.videoId,
      roomState?.playbackState?.startTime,
      roomState?.playbackState?.pausedAtSeconds,
    ]
  );

  // Stable currentSong reference
  const stableCurrentSong = useMemo(
    () => roomState?.currentSong,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [roomState?.currentSong?.id, roomState?.currentSong?.videoId]
  );

  // Stable skip callback — always calls the latest closure via ref
  const skipRef = useRef(handleSkipSong);
  skipRef.current = handleSkipSong;
  const stableOnSkip = useCallback(() => skipRef.current?.(), []);

  // Memoize user object to prevent Chat/Reactions re-renders
  const memoizedUser = useMemo(
    () => ({
      id: currentUser?.id,
      name: currentUser?.name,
    }),
    [currentUser?.id, currentUser?.name]
  );

  const modeMeta = useMemo(() => {
    if (isSecret) return { label: 'Secret room', Icon: Headphones };
    if (isDJ) return { label: "DJ Mode", Icon: Headphones };
    if (isStreaming) return { label: "Streaming Mode", Icon: MonitorPlay };
    if (isMeeting) return { label: "Meeting Mode", Icon: BookOpen };
    return { label: "Karaoke Mode", Icon: Mic };
  }, [isDJ, isStreaming, isMeeting, isSecret]);

  const ModeIcon = modeMeta.Icon;

  return (
    <div className="min-h-screen relative overflow-x-hidden text-white">
      {/* Background system (3PM) */}
      <div className="absolute inset-0 bg-[#070712]" />
      {/* very soft accents only */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_top,rgba(255,0,153,0.08),transparent_55%),radial-gradient(ellipse_at_bottom,rgba(99,102,241,0.08),transparent_55%)]" />

      {/* Content */}
      <div className="relative p-4 pb-28">
        <div className="max-w-[1800px] mx-auto space-y-6">
          {/* External prompt (sticky, in-flow) */}

          {/* Hero / Banner (clean glass, structured) */}
          <div className="rounded-3xl overflow-hidden border border-white/10 bg-white/[0.03] backdrop-blur-md shadow-lg">
            <div className="p-6 sm:p-7">
              <div className="flex items-start justify-between gap-6">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-xs tracking-widest uppercase text-white/45">
                    <ModeIcon className="w-4 h-4 text-white/55" />
                    <span>Host Console</span>
                  </div>

                  <h1 className="mt-2 text-3xl sm:text-4xl font-extrabold leading-tight">
                    <span className="bg-clip-text text-transparent bg-[linear-gradient(90deg,#ff3aa7,#9b7bff,#ffd24a)]">
                      {modeMeta.label}
                    </span>
                  </h1>

                  <div className="mt-2 text-sm text-white/55">
                    Room{" "}
                    <span className="font-mono text-white/80 tracking-[0.18em] px-2 py-1 rounded-xl border border-white/10 bg-white/[0.02]">
                      {roomCode}
                    </span>
                  </div>
                </div>

                <div className="text-right flex-shrink-0 space-y-3">
                  <div>
                    <div className="text-xs text-white/45">Host</div>
                    <div className="mt-1 inline-flex items-center gap-2 justify-end">
                      <div className="w-9 h-9 rounded-2xl border border-white/10 bg-white/[0.02] flex items-center justify-center">
                        <Radio className="w-4 h-4 text-white/70" />
                      </div>
                      <div className="font-semibold text-base sm:text-lg text-white/90">
                        {currentUser?.name}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">


                    <button
                      onClick={() => {
                        if (isSecret || window.confirm("Close this room? Everyone will be disconnected.")) {
                          onCloseRoom?.();
                        }
                      }}
                      className="inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 border border-red-500/30 bg-red-500/[0.06] hover:bg-red-500/[0.12] hover:border-red-400/50 transition active:scale-[0.98]"
                      title={isSecret ? 'Leave room' : 'Close Room'}
                    >
                      <DoorOpen className="w-4 h-4 text-red-400" />
                      <span className="text-sm font-semibold text-red-300">{isSecret ? 'Leave' : 'Close'}</span>
                    </button>
                  </div>

                  {isDJ && (
                    <div className="mt-3 flex items-center gap-2 flex-wrap justify-end">


                      <button
                        onClick={() => setDjAutoplay((v) => !v)}
                        className={[
                          "inline-flex items-center gap-2 px-3 py-2 rounded-2xl border transition active:scale-[0.98]",
                          djAutoplay
                            ? "border-amber-400/40 bg-amber-500/[0.10] text-amber-300"
                            : "border-white/10 bg-white/[0.02] text-white/50 hover:text-white/70",
                        ].join(" ")}
                        title={djAutoplay ? "Autoplay ON" : "Autoplay OFF"}
                      >
                        <ListMusic className="w-3.5 h-3.5" />
                        <span className="text-xs font-semibold">
                          Autoplay {djAutoplay ? "ON" : "OFF"}
                        </span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Layout */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* Left */}
            <div className="xl:col-span-2 space-y-6">
              {quizFocus ? <JamGames roomCode={roomCode} currentUser={currentUser} roomState={roomState} featured /> : isMeeting ? (
                <MeetingDisplay
                  activeReadingId={roomState?.activeReadingId || null}
                  isHost={true}
                  onSelectReading={handleSelectReading}
                />
              ) : isStreaming ? (
                <GoogleDrivePlayer
                  videoUrl={currentSong?.videoUrl}
                  title={currentSong?.title}
                  playbackState={roomState?.playbackState}
                  onSkip={handleSkipSong}
                  isHost={true}
                  requestedBy={currentSong?.requestedBy}
                />
              ) : (
<VideoPlayer
  roomCode={roomCode}
  currentSong={stableCurrentSong}
  playbackState={stablePlaybackState}
  onSkip={stableOnSkip}
  isHost={true}
  roomMode={roomMode}
  onStop={handleStopSong}
/>
              )}

              {isSecret && !quizFocus && currentSong?.message && (
                <div className="rounded-3xl border border-fuchsia-400/25 bg-white/[0.03] p-6">
                  <p className="text-sm font-semibold text-fuchsia-200 mb-2">A message from {currentSong.messageAuthor || currentSong.addedByName || currentSong.requestedBy || 'Someone'}</p>
                  <p className="whitespace-pre-wrap break-words text-white/90">{currentSong.message}</p>
                </div>
              )}



              {!isMeeting && !quizFocus && (
                isStreaming ? (
                  <StreamingQueue
                    roomCode={roomCode}
                    queue={queue}
                    currentSong={currentSong}
                    isHost={true}
                    currentUser={currentUser}
                  />
                ) : (
                  <div className="rounded-3xl border border-white/10 bg-white/[0.03] backdrop-blur-md shadow-lg p-6">
                    <SongSearch
                      searchQuery={searchQuery}
                      setSearchQuery={setSearchQuery}
                      onSearch={handleSearch}
                      isSearching={isSearching}
                      searchResults={searchResults}
                      onAddToQueue={handleAddToQueue}
                      hasSearched={hasSearched}
                      currentUser={currentUser}
                      participants={participants}
                      naMembers={naMembers}
                      isParticipant={false}
                      allowMessage={isSecret}
                    />
                  </div>
                )
              )}
            </div>

            {/* Right */}
            <div className="space-y-6">
              {isMeeting && (
                <MeetingReadingsList
                  activeReadingId={roomState?.activeReadingId || null}
                  onSelectReading={handleSelectReading}
                />
              )}


              {isDJ && !quizFocus && <JamGames roomCode={roomCode} currentUser={currentUser} roomState={roomState} />}

              {isSecret ? <RoomWall roomCode={roomCode} currentUser={memoizedUser} /> : <ChatPanel
                roomCode={roomCode}
                currentUser={memoizedUser}
                currentSong={currentSong}
                inline={true}
              />}

              {!isStreaming && !isMeeting && !quizFocus && (
                <div className="rounded-3xl border border-white/10 bg-white/[0.03] backdrop-blur-md shadow-lg p-6">
                  <SongQueue
                    queue={queue}
                    onPlaySong={handlePlaySong}
                    onDeleteSong={handleDeleteSong}
                    onMoveSongUp={handleMoveSongUp}
                    onMoveSongDown={handleMoveSongDown}
                    isHost={true}
                  />
                </div>
              )}

            </div>
          </div>
        </div>
      </div>

      {/* Host Control Panel */}


      {/* Reactions and Settings */}
      <EmojiReactions roomCode={roomCode} currentUser={memoizedUser} />

    </div>
  );
}

export default HostView;
