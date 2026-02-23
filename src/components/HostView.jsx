import { useState, useMemo, useCallback, useRef } from "react";
import { database, ref, set, update, push, remove } from "../utils/firebase";
import { searchKaraokeVideos } from "../utils/youtube";

import VideoPlayer from "./VideoPlayer";
import GoogleDrivePlayer from "./GoogleDrivePlayer";
import SongQueue from "./SongQueue";
import SongSearch from "./SongSearch";
import StreamingQueue from "./StreamingQueue";
import SingerSpotlight from "./SingerSpotlight";
import ChatPanel from "./ChatPanel";
import EmojiReactions from "./EmojiReactions";
import DeviceSettingsPanel from "./DeviceSettingsPanel";
import ExternalVideoPrompt from "./ExternalVideoPrompt";

import HostControlPanel from "./HostControlPanel";
import MeetingDisplay from "./MeetingDisplay";
import MeetingReadingsList from "./MeetingReadingsList";

import { Mic, Radio, MonitorPlay, Headphones, Sliders, BookOpen, DoorOpen, ListMusic } from "lucide-react";

function HostView({ roomCode, currentUser, roomState, onCloseRoom }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [hostPanelOpen, setHostPanelOpen] = useState(false);
  const [djAutoplay, setDjAutoplay] = useState(false);

  // Determine room mode
  const roomMode = roomState?.roomMode || "karaoke";
  const isStreaming = roomMode === "streaming";
  const isDJ = roomMode === "dj";
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

  const handleAddToQueue = async (video, requestedBy) => {
    const queueRef = ref(database, `karaoke-rooms/${roomCode}/queue`);
    const newSongRef = push(queueRef);

    await set(newSongRef, {
      id: newSongRef.key,
      videoId: video.id,
      title: video.title,
      thumbnail: video.thumbnail,
      addedBy: currentUser.id,
      requestedBy: requestedBy || "Someone",
      addedAt: Date.now(),
    });
  };
  const setParticipantMute = async (participantName, muted) => {
    const muteRef = ref(
      database,
      `karaoke-rooms/${roomCode}/participantMutes/${participantName}`
    );
    await set(muteRef, muted);
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

    if (isKaraoke) {
      const singerName = song.requestedBy || song.singerName;
      if (singerName) {
        await setParticipantMute(singerName, false);
      }
    }
  };

  const handleStopSong = async () => {
    if (isKaraoke) {
      const currentSinger =
        roomState?.currentSong?.requestedBy || roomState?.currentSong?.singerName;
      if (currentSinger) {
        await setParticipantMute(currentSinger, true);
      }
    }

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
    if (isKaraoke) {
      const currentSinger =
        roomState?.currentSong?.requestedBy || roomState?.currentSong?.singerName;
      if (currentSinger) {
        await setParticipantMute(currentSinger, true);
      }
    }

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

  const handleMuteAll = async () => {
    const participants = roomState?.participants ? Object.values(roomState.participants) : [];
    const currentSinger =
      roomState?.currentSong?.requestedBy || roomState?.currentSong?.singerName;

    for (const participant of participants) {
      if (participant.name !== currentSinger) {
        await setParticipantMute(participant.name, true);
      }
    }
  };

  const handlePlayPause = async () => {
    const playbackRef = ref(database, `karaoke-rooms/${roomCode}/playbackState`);
    const isPlaying = roomState?.playbackState?.isPlaying || false;
    await update(playbackRef, { isPlaying: !isPlaying });
  };

  const handleKickParticipant = async (participantId, participantName) => {
    const participantRef = ref(database, `karaoke-rooms/${roomCode}/participants/${participantId}`);
    await set(participantRef, null);
    // Also remove their mute state
    const muteRef = ref(database, `karaoke-rooms/${roomCode}/participantMutes/${participantName}`);
    await set(muteRef, null);
  };

  const handleUpdateHostControls = async (updates) => {
    const controlsRef = ref(database, `karaoke-rooms/${roomCode}/hostControls`);
    await update(controlsRef, updates);
  };

  const handleRequestUnmute = async (participantName) => {
    const requestRef = ref(database, `karaoke-rooms/${roomCode}/unmuteRequests/${participantName}`);
    await set(requestRef, Date.now());
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
      userName: "3PM",
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
  const participantMutes = roomState?.participantMutes || {};

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
    if (isDJ) return { label: "DJ Mode", Icon: Headphones };
    if (isStreaming) return { label: "Streaming Mode", Icon: MonitorPlay };
    if (isMeeting) return { label: "Meeting Mode", Icon: BookOpen };
    return { label: "Karaoke Mode", Icon: Mic };
  }, [isDJ, isStreaming, isMeeting]);

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
          <ExternalVideoPrompt videoLink={roomState?.externalVideoLink} />

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
                      onClick={() => setHostPanelOpen(true)}
                      className="inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 border border-fuchsia-500/35 bg-fuchsia-500/[0.08] hover:bg-fuchsia-500/[0.14] hover:border-fuchsia-400/50 hover:shadow-[0_0_20px_rgba(232,121,249,0.18)] transition active:scale-[0.98]"
                    >
                      <Sliders className="w-4 h-4 text-fuchsia-400" />
                      <span className="text-sm font-semibold text-fuchsia-300">Host Controls</span>
                    </button>

                    <button
                      onClick={() => {
                        if (window.confirm("Close this room? Everyone will be disconnected.")) {
                          onCloseRoom?.();
                        }
                      }}
                      className="inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 border border-red-500/30 bg-red-500/[0.06] hover:bg-red-500/[0.12] hover:border-red-400/50 transition active:scale-[0.98]"
                      title="Close Room"
                    >
                      <DoorOpen className="w-4 h-4 text-red-400" />
                      <span className="text-sm font-semibold text-red-300">Close</span>
                    </button>
                  </div>

                  {isDJ && (
                    <div className="mt-3 flex items-center gap-2 flex-wrap justify-end">
                      <div className="inline-flex items-center gap-2 px-3 py-2 rounded-2xl border border-emerald-500/20 bg-white/[0.02]">
                        <span className="text-xs font-semibold text-emerald-300/90">
                          Mic: open
                        </span>
                      </div>

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
              {isMeeting ? (
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
/>
              )}

              <SingerSpotlight
                roomCode={roomCode}
                roomMode={roomMode}
                currentSong={isKaraoke ? currentSong : null}
                participantMutes={participantMutes}
                queue={isKaraoke ? queue : []}
                currentUser={currentUser}
                micsLocked={roomState?.hostControls?.micsLocked || false}
                naMembers={naMembers}
              />

              {!isMeeting && (
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

              {/* Bot message quick-fire buttons */}
              <div className="rounded-3xl border border-white/10 bg-white/[0.03] backdrop-blur-md shadow-lg p-4">
                <div className="text-[10px] uppercase tracking-widest text-white/40 mb-3">Bot Messages</div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { key: "safety",  label: "🔒 Safety",   pool: ["🔒 Share Mode disabled.\nIf you are struggling with a burning desire to use, hurt yourself, or hurt someone, please reach out to the Host immediately. You matter and support is available.", "🔒 Share Mode is currently disabled.\nIf you are experiencing a burning desire to use, hurt yourself, or hurt someone else, please contact the Host immediately. You are not alone.", "🔒 Share Mode OFF.\nIf you feel a burning desire to use or harm yourself/others, message the Host now."], border: "border-red-500/30 hover:border-red-400/50 text-red-300/90" },
                    { key: "spanjft", label: "📘 SPAN/JFT",  pool: ["📘 If you're here and mysteriously have nothing to do… go check Today's SPAN or JFT. Growth occasionally happens when we least want it.", "📘 Today's SPAN / JFT might accidentally become your meeting topic later. Spiritual foreshadowing is real.", "📘 Could be boring. Could be life-altering. We won't know until you click."], border: "border-blue-500/30 hover:border-blue-400/50 text-blue-300/90" },
                    { key: "playful", label: "😈 Playful",   pool: ["😈 This music ain't it. Pick something smoother… warmer… a little dangerous. Impress the Host.", "😈 Current vibe: questionable. Choose something with more chemistry.", "😈 Respectfully… this ain't the one. Redeem yourself."], border: "border-fuchsia-500/30 hover:border-fuchsia-400/50 text-fuchsia-300/90" },
                    { key: "sad",     label: "🖤 Sad",        pool: ["🖤 This one feels a little empty. Choose something that understands you better tonight.", "🖤 Not every song finds us. Pick one that feels like your story.", "🖤 Some nights need softer music."], border: "border-white/10 hover:border-white/20 text-white/70" },
                    { key: "dark",    label: "🌑 Dark",       pool: ["🌑 Choose something that sounds like the inside of your mind at 2AM.", "🌑 Low light. Quiet room. Choose the song that feels like night.", "🌑 Bring the sound of slow thoughts and long nights."], border: "border-indigo-500/30 hover:border-indigo-400/50 text-indigo-300/90" },
                    { key: "dance",   label: "💃 Dance",      pool: ["💃 Enough feelings. Time to move. Bring something with rhythm.", "💃 Sad hours closed. Dance floor open.", "💃 Dancing recommended. Coordination optional."], border: "border-amber-500/30 hover:border-amber-400/50 text-amber-300/90" },
                  ].map(({ key, label, pool, border }) => (
                    <button
                      key={key}
                      onClick={() => handleSendBotMessage(pool[Math.floor(Math.random() * pool.length)], key)}
                      className={["rounded-2xl px-2 py-2 border bg-white/[0.02] hover:bg-white/[0.04] text-xs font-semibold transition active:scale-[0.97] text-center leading-tight", border].join(" ")}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <ChatPanel
                roomCode={roomCode}
                currentUser={memoizedUser}
                currentSong={currentSong}
                inline={true}
              />

              {!isStreaming && !isMeeting && (
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
      <HostControlPanel
        isOpen={hostPanelOpen}
        onClose={() => setHostPanelOpen(false)}
        roomState={roomState}
        roomCode={roomCode}
        onSkip={handleSkipSong}
        onMuteAll={handleMuteAll}
        onMuteToggle={setParticipantMute}
        onRequestUnmute={handleRequestUnmute}
        onPlayPause={handlePlayPause}
        onKick={handleKickParticipant}
        onUpdateHostControls={handleUpdateHostControls}
        onSendBotMessage={handleSendBotMessage}
      />

      {/* Reactions and Settings */}
      <DeviceSettingsPanel />
      <EmojiReactions roomCode={roomCode} currentUser={memoizedUser} />
    </div>
  );
}

export default HostView;