import React, { useState } from "react";

import { database, ref, set, update, push, remove } from "../utils/firebase";
import { searchKaraokeVideos } from "../utils/youtube";

import VideoPlayer from "./VideoPlayer";
import SongQueue from "./SongQueue";
import SongSearch from "./SongSearch";
import ParticipantsList from "./ParticipantsList";
import ChatPanel from "./ChatPanel";
import EmojiReactions from "./EmojiReactions";
import DebugPanel from "./DebugPanel";
import SingerSpotlight from "./SingerSpotlight";

function DJView({ roomCode, currentUser, roomState, isHost }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

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

    const requestedByName =
      typeof requestedBy === "string"
        ? requestedBy
        : typeof requestedBy?.name === "string"
        ? requestedBy.name
        : currentUser?.name || "Guest";

    await set(newSongRef, {
      id: newSongRef.key,
      videoId: video.id,
      title: video.title,
      thumbnail: video.thumbnail,
      addedBy: currentUser?.id || "unknown",
      requestedBy: requestedByName,
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
      videoId: song.videoId,
      startTime: Date.now(),
    });
  };

  const handleSkipSong = async () => {
    const currentSongRef = ref(database, `karaoke-rooms/${roomCode}/currentSong`);
    await set(currentSongRef, null);

    const playbackRef = ref(database, `karaoke-rooms/${roomCode}/playbackState`);
    await update(playbackRef, {
      isPlaying: false,
      videoId: null,
    });

    // NOTE: If you want "NO autoplay ever", delete everything below this line.
    const queueArr = roomState?.queue ? Object.values(roomState.queue) : [];
    if (queueArr.length > 0) {
      const sortedQueue = [...queueArr].sort((a, b) => a.addedAt - b.addedAt);
      const nextSong = sortedQueue[0];
      setTimeout(() => handlePlaySong(nextSong), 500);
    }
  };

  const handleDeleteSong = async (songId) => {
    const songRef = ref(database, `karaoke-rooms/${roomCode}/queue/${songId}`);
    await remove(songRef);
  };

  const handleMoveSongUp = async (song, currentIndex) => {
    const queueArr = roomState?.queue ? Object.values(roomState.queue) : [];
    if (currentIndex === 0) return;

    const sortedQueue = [...queueArr].sort((a, b) => a.addedAt - b.addedAt);
    const prevSong = sortedQueue[currentIndex - 1];

    const songRef = ref(
      database,
      `karaoke-rooms/${roomCode}/queue/${song.id}/addedAt`
    );
    const prevSongRef = ref(
      database,
      `karaoke-rooms/${roomCode}/queue/${prevSong.id}/addedAt`
    );

    await set(songRef, prevSong.addedAt);
    await set(prevSongRef, song.addedAt);
  };

  const handleMoveSongDown = async (song, currentIndex) => {
    const queueArr = roomState?.queue ? Object.values(roomState.queue) : [];
    const sortedQueue = [...queueArr].sort((a, b) => a.addedAt - b.addedAt);
    if (currentIndex === sortedQueue.length - 1) return;

    const nextSong = sortedQueue[currentIndex + 1];

    const songRef = ref(
      database,
      `karaoke-rooms/${roomCode}/queue/${song.id}/addedAt`
    );
    const nextSongRef = ref(
      database,
      `karaoke-rooms/${roomCode}/queue/${nextSong.id}/addedAt`
    );

    await set(songRef, nextSong.addedAt);
    await set(nextSongRef, song.addedAt);
  };

  // ✅ FORCE MUTE (client-enforced via your app logic)
  // Uses roomState.participantMutes as the source of truth.
  const handleMuteToggle = async (name) => {
    if (!name) return;
    const current = !!roomState?.participantMutes?.[name];
    const muteRef = ref(database, `karaoke-rooms/${roomCode}/participantMutes/${name}`);
    await set(muteRef, !current);
  };

  const handleMuteAll = async () => {
    const participantsArr = roomState?.participants ? Object.values(roomState.participants) : [];
    const updatesObj = {};

    participantsArr.forEach((p) => {
      const nm = p?.name || p?.identity;
      if (nm) updatesObj[`karaoke-rooms/${roomCode}/participantMutes/${nm}`] = true;
    });

    // multi-location update
    await update(ref(database), updatesObj);
  };

  const queue = roomState?.queue ? Object.values(roomState.queue) : [];
  const participants = roomState?.participants ? Object.values(roomState.participants) : [];
  const currentSong = roomState?.currentSong || null;

  return (
    <div className="min-h-screen relative overflow-hidden text-white">
      <div className="absolute inset-0 bg-[#070712]" />
      <div className="absolute -top-40 -left-40 w-[520px] h-[520px] rounded-full blur-3xl opacity-50 bg-fuchsia-600" />
      <div className="absolute -bottom-56 -right-56 w-[640px] h-[640px] rounded-full blur-3xl opacity-50 bg-indigo-600" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,0,153,0.18),transparent_55%),radial-gradient(ellipse_at_bottom,rgba(99,102,241,0.18),transparent_55%)]" />

      <div className="relative p-3 sm:p-4">
        <div className="max-w-[1800px] mx-auto">
          {/* Header */}
          <div className="rounded-3xl overflow-hidden border border-white/10 bg-white/5 backdrop-blur-xl shadow-2xl mb-4 sm:mb-6">
            <div className="relative bg-gradient-to-r from-fuchsia-900/40 via-indigo-900/40 to-purple-900/40">
              <div className="relative px-4 py-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-black/35 text-[10px] sm:text-xs tracking-widest uppercase">
                    <span className="w-2 h-2 rounded-full bg-fuchsia-400 shadow-[0_0_18px_rgba(232,121,249,0.8)]" />
                    {isHost ? "DJ Console" : "Listening Party"}
                  </div>

                  <h1 className="mt-2 text-2xl sm:text-3xl font-extrabold leading-tight">
                    <span className="bg-clip-text text-transparent bg-[linear-gradient(90deg,#ff3aa7,#9b7bff,#ffd24a)]">
                      DJ Mode 🎧
                    </span>
                  </h1>

                  <div className="mt-1 text-xs sm:text-sm text-white/70">
                    Room:{" "}
                    <span className="font-mono text-white tracking-[0.2em] bg-black/35 px-2 py-1 rounded-lg">
                      {roomCode}
                    </span>
                  </div>
                </div>

                <div className="sm:text-right text-left">
                  <div className="text-[10px] sm:text-xs text-white/50">
                    {isHost ? "Host" : "Participant"}
                  </div>
                  <div className="font-bold text-base sm:text-lg">
                    {currentUser?.name || "Guest"} {isHost ? "🎧" : "🎵"}
                  </div>

                  <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 rounded-full border border-indigo-500/30 bg-indigo-500/10">
                    <span className="text-[11px] sm:text-xs font-semibold text-indigo-400">
                      Video Only Mode
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6">
            {/* Left column - Video and search */}
            <div className="xl:col-span-2 space-y-4 sm:space-y-6">
              <VideoPlayer
                currentSong={currentSong}
                playbackState={roomState?.playbackState}
                onSkip={isHost ? handleSkipSong : null}
                isHost={isHost}
              />

              {/* ✅ Mute controls + singer spotlight */}
              <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-xl p-4 sm:p-6">
                <SingerSpotlight
                  roomCode={roomCode}
                  currentSong={currentSong}
                  participantMutes={roomState?.participantMutes || {}}
                  onMuteToggle={isHost ? handleMuteToggle : null}
                  onMuteAll={isHost ? handleMuteAll : null}
                  queue={queue}
                  canControlMics={isHost}
                  currentUser={currentUser}
                  showControls={true}
                />
              </div>

              {/* Mobile queue */}
              <div className="xl:hidden rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-xl p-4 sm:p-6">
                <SongQueue
                  queue={queue}
                  onPlaySong={isHost ? handlePlaySong : null}
                  onDeleteSong={isHost ? handleDeleteSong : null}
                  onMoveSongUp={isHost ? handleMoveSongUp : null}
                  onMoveSongDown={isHost ? handleMoveSongDown : null}
                  isHost={isHost}
                />
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-xl p-4 sm:p-6">
                <SongSearch
                  searchQuery={searchQuery}
                  setSearchQuery={setSearchQuery}
                  onSearch={handleSearch}
                  isSearching={isSearching}
                  searchResults={searchResults}
                  onAddToQueue={handleAddToQueue}
                  hasSearched={hasSearched}
                  roomCode={roomCode}
                  currentUser={currentUser}
                  participants={participants}
                  isParticipant={!isHost}
                />
              </div>

              {/* Participants list (keep if you still want it) */}
              <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-xl p-4 sm:p-6">
                <ParticipantsList currentUser={currentUser} />
              </div>
            </div>

            {/* Right column - Queue */}
            <div className="hidden xl:block space-y-6">
              <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-xl p-6">
                <SongQueue
                  queue={queue}
                  onPlaySong={isHost ? handlePlaySong : null}
                  onDeleteSong={isHost ? handleDeleteSong : null}
                  onMoveSongUp={isHost ? handleMoveSongUp : null}
                  onMoveSongDown={isHost ? handleMoveSongDown : null}
                  isHost={isHost}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <ChatPanel
        roomCode={roomCode}
        currentUser={currentUser}
        currentSong={currentSong}
      />
      <EmojiReactions roomCode={roomCode} currentUser={currentUser} />
      {isHost && <DebugPanel currentUser={currentUser} roomState={roomState} />}
    </div>
  );
}

export default DJView;