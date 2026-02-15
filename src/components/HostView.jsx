import React, { useState, useMemo } from "react";
import { database, ref, set, update, push, remove } from "../utils/firebase";
import { searchKaraokeVideos } from "../utils/youtube";
import VideoPlayer from "./VideoPlayer";
import SongQueue from "./SongQueue";
import SongSearch from "./SongSearch";
import SingerSpotlight from "./SingerSpotlight";
import ChatPanel from "./ChatPanel";
import EmojiReactions from "./EmojiReactions";
import DeviceSettingsPanel from "./DeviceSettingsPanel";

function HostView({ roomCode, currentUser, roomState }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setHasSearched(true);
    const results = await searchKaraokeVideos(searchQuery);
    setSearchResults(results);
    setIsSearching(false);
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

    // Auto-unmute the singer
    const singerName = song.requestedBy || song.singerName;
    if (singerName) {
      await setParticipantMute(singerName, false);
    }
  };

  const handleSkipSong = async () => {
    // Mute current singer
    const currentSinger = roomState?.currentSong?.requestedBy || roomState?.currentSong?.singerName;
    if (currentSinger) {
      await setParticipantMute(currentSinger, true);
    }

    const currentSongRef = ref(database, `karaoke-rooms/${roomCode}/currentSong`);
    await set(currentSongRef, null);

    const playbackRef = ref(database, `karaoke-rooms/${roomCode}/playbackState`);
    await update(playbackRef, {
      isPlaying: false,
      videoId: null,
    });
    
    const queue = roomState?.queue ? Object.values(roomState.queue) : [];
    if (queue.length > 0) {
      const sortedQueue = [...queue].sort((a, b) => a.addedAt - b.addedAt);
      const nextSong = sortedQueue[0];
      setTimeout(() => handlePlaySong(nextSong), 500);
    }
  };

  const handleDeleteSong = async (songId) => {
    const songRef = ref(database, `karaoke-rooms/${roomCode}/queue/${songId}`);
    await remove(songRef);
  };

  const handleMoveSongUp = async (song, currentIndex) => {
    if (currentIndex === 0) return;
    const sortedQueue = [...queue].sort((a, b) => a.addedAt - b.addedAt);
    const prevSong = sortedQueue[currentIndex - 1];
    
    const songRef = ref(database, `karaoke-rooms/${roomCode}/queue/${song.id}/addedAt`);
    const prevSongRef = ref(database, `karaoke-rooms/${roomCode}/queue/${prevSong.id}/addedAt`);
    
    await set(songRef, prevSong.addedAt);
    await set(prevSongRef, song.addedAt);
  };

  const handleMoveSongDown = async (song, currentIndex) => {
    const sortedQueue = [...queue].sort((a, b) => a.addedAt - b.addedAt);
    if (currentIndex === sortedQueue.length - 1) return;
    const nextSong = sortedQueue[currentIndex + 1];
    
    const songRef = ref(database, `karaoke-rooms/${roomCode}/queue/${song.id}/addedAt`);
    const nextSongRef = ref(database, `karaoke-rooms/${roomCode}/queue/${nextSong.id}/addedAt`);
    
    await set(songRef, nextSong.addedAt);
    await set(nextSongRef, song.addedAt);
  };

  const setParticipantMute = async (participantName, muted) => {
    const muteRef = ref(database, `karaoke-rooms/${roomCode}/participantMutes/${participantName}`);
    await set(muteRef, muted);
  };

  const handleMuteAll = async () => {
    const participants = roomState?.participants ? Object.values(roomState.participants) : [];
    const currentSinger = roomState?.currentSong?.requestedBy || roomState?.currentSong?.singerName;
    
    for (const participant of participants) {
      if (participant.name !== currentSinger) {
        await setParticipantMute(participant.name, true);
      }
    }
  };

  const queue = roomState?.queue ? Object.values(roomState.queue) : [];
  const participants = roomState?.participants ? Object.values(roomState.participants) : [];
  const currentSong = roomState?.currentSong;
  const participantMutes = roomState?.participantMutes || {};

  // Memoize user object to prevent Chat/Reactions re-renders
  const memoizedUser = useMemo(() => ({
    id: currentUser?.id,
    name: currentUser?.name
  }), [currentUser?.id, currentUser?.name]);

  return (
    <div className="min-h-screen relative overflow-hidden text-white">
      <div className="absolute inset-0 bg-[#070712]" />
      <div className="absolute -top-40 -left-40 w-[520px] h-[520px] rounded-full blur-3xl opacity-50 bg-fuchsia-600" />
      <div className="absolute -bottom-56 -right-56 w-[640px] h-[640px] rounded-full blur-3xl opacity-50 bg-indigo-600" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,0,153,0.18),transparent_55%),radial-gradient(ellipse_at_bottom,rgba(99,102,241,0.18),transparent_55%)]" />

      <div className="relative p-4">
        <div className="max-w-[1800px] mx-auto">
          {/* Static Banner */}
          <div className="rounded-3xl overflow-hidden border border-white/10 bg-white/5 backdrop-blur-xl shadow-2xl mb-6">
            <div className="relative h-28 bg-gradient-to-r from-fuchsia-900/40 via-indigo-900/40 to-purple-900/40">
              <div className="relative p-5 flex items-center justify-between h-full">
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-black/35 text-xs tracking-widest uppercase">
                    <span className="w-2 h-2 rounded-full bg-fuchsia-400 shadow-[0_0_18px_rgba(232,121,249,0.8)]" />
                    Host Console
                  </div>

                  <h1 className="mt-2 text-3xl font-extrabold">
                    <span className="bg-clip-text text-transparent bg-[linear-gradient(90deg,#ff3aa7,#9b7bff,#ffd24a)]">
                      DJ Mode
                    </span>
                  </h1>

                  <div className="mt-1 text-sm text-white/70">
                    Room: <span className="font-mono text-white tracking-[0.2em] bg-black/35 px-2 py-1 rounded-lg">{roomCode}</span>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-xs text-white/50">Host</div>
                  <div className="font-bold text-lg">{currentUser.name} 🎤</div>
                  
                  <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 rounded-full border border-emerald-500/30 bg-emerald-500/10">
                    <span className="text-xs font-semibold text-emerald-400">Mic: FREE (everyone can talk)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Layout - Video + Singer on left, Queue on right */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* Left Column - Video + Singer Spotlight */}
            <div className="xl:col-span-2 space-y-6">
              {/* Video Player */}
              <VideoPlayer
                currentSong={currentSong}
                playbackState={roomState?.playbackState}
                onSkip={handleSkipSong}
                isHost={true}
              />

              {/* Singer Spotlight - Shows current singer prominently */}
              <SingerSpotlight
                roomCode={roomCode}
                currentSong={currentSong}
                participants={participants}
                participantMutes={participantMutes}
                onMuteToggle={setParticipantMute}
                onMuteAll={handleMuteAll}
                queue={queue}
                canControlMics={true}
                currentUser={currentUser}
                showControls={true}
              />

              {/* Song Search */}
              <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-xl p-6">
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
                  roomCode={roomCode}
                  isParticipant={false}
                />
              </div>
            </div>

            {/* Right Column - Queue */}
            <div className="space-y-6">
              <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-xl p-6">
                <SongQueue 
                  queue={queue} 
                  onPlaySong={handlePlaySong} 
                  onDeleteSong={handleDeleteSong}
                  onMoveSongUp={handleMoveSongUp}
                  onMoveSongDown={handleMoveSongDown}
                  isHost={true} 
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Chat, Reactions, and Settings (NO DEBUG COMPONENTS) */}
      <ChatPanel roomCode={roomCode} currentUser={memoizedUser} currentSong={currentSong} />
      <DeviceSettingsPanel />
      <EmojiReactions roomCode={roomCode} currentUser={memoizedUser} />
    </div>
  );
}

export default HostView;