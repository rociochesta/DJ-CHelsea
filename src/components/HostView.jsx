import React, { useMemo, useState } from "react";
import { database, ref, set, update, push, remove } from "../utils/firebase";
import { searchKaraokeVideos } from "../utils/youtube";
import VideoPlayer from "./VideoPlayer";
import SongQueue from "./SongQueue";
import SongSearch from "./SongSearch";
import ParticipantsList from "./ParticipantsList";
import VideoChat from "./VideoChat";

function HostView({ roomCode, currentUser, roomState, djName }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const queue = useMemo(
    () => (roomState?.queue ? Object.values(roomState.queue) : []),
    [roomState?.queue]
  );

  const participants = useMemo(
    () => (roomState?.participants ? Object.values(roomState.participants) : []),
    [roomState?.participants]
  );

  const currentSong = roomState?.currentSong;

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

  // ✅ requestedByUser is {id,name} from the modal picker (or {id:null,name:"Someone"})
  const handleAddToQueue = async (video, requestedByUser) => {
    const queueRef = ref(database, `karaoke-rooms/${roomCode}/queue`);
    const newSongRef = push(queueRef);

    await set(newSongRef, {
      id: newSongRef.key,
      videoId: video.id,
      title: video.title,
      thumbnail: video.thumbnail,

      addedBy: currentUser.id, // host who clicked Add
      requestedById: requestedByUser?.id || null,
      requestedByName: requestedByUser?.name || "Someone",

      addedAt: Date.now(),
    });

    // ✅ keep search UI as-is (no clearing)
  };

  const handlePlaySong = async (song) => {
    await set(ref(database, `karaoke-rooms/${roomCode}/currentSong`), song);

    // remove from queue once it starts
    await remove(ref(database, `karaoke-rooms/${roomCode}/queue/${song.id}`));

await update(ref(database, `karaoke-rooms/${roomCode}`), {
  currentSong: song,
  playbackState: {
    isPlaying: true,
    videoId: song.videoId,
    startTime: Date.now()
  }
});

    // ✅ mic policy uses this (we’ll implement inside VideoChat next)
    await set(ref(database, `karaoke-rooms/${roomCode}/activeSingerId`), song.requestedById || null);
    await set(ref(database, `karaoke-rooms/${roomCode}/activeSingerName`), song.requestedByName || "Someone");
  };

  const handleSkipSong = async () => {
    await set(ref(database, `karaoke-rooms/${roomCode}/currentSong`), null);

    await update(ref(database, `karaoke-rooms/${roomCode}/playbackState`), {
      isPlaying: false,
      videoId: null,
    });

    // reset singer
    await set(ref(database, `karaoke-rooms/${roomCode}/activeSingerId`), null);
    await set(ref(database, `karaoke-rooms/${roomCode}/activeSingerName`), null);

    // ✅ Auto-play next song in queue
    const q = roomState?.queue ? Object.values(roomState.queue) : [];
    if (q.length > 0) {
      const sortedQueue = [...q].sort((a, b) => a.addedAt - b.addedAt);
      const nextSong = sortedQueue[0];
      setTimeout(() => handlePlaySong(nextSong), 500);
    }
  };

  const handleDeleteSong = async (songId) => {
    await remove(ref(database, `karaoke-rooms/${roomCode}/queue/${songId}`));
  };

  const handleMoveSongUp = async (song, currentIndex) => {
    if (currentIndex === 0) return;

    const sortedQueue = [...queue].sort((a, b) => a.addedAt - b.addedAt);
    const prevSong = sortedQueue[currentIndex - 1];

    await set(
      ref(database, `karaoke-rooms/${roomCode}/queue/${song.id}/addedAt`),
      prevSong.addedAt
    );
    await set(
      ref(database, `karaoke-rooms/${roomCode}/queue/${prevSong.id}/addedAt`),
      song.addedAt
    );
  };

  const handleMoveSongDown = async (song, currentIndex) => {
    const sortedQueue = [...queue].sort((a, b) => a.addedAt - b.addedAt);
    if (currentIndex === sortedQueue.length - 1) return;

    const nextSong = sortedQueue[currentIndex + 1];

    await set(
      ref(database, `karaoke-rooms/${roomCode}/queue/${song.id}/addedAt`),
      nextSong.addedAt
    );
    await set(
      ref(database, `karaoke-rooms/${roomCode}/queue/${nextSong.id}/addedAt`),
      song.addedAt
    );
  };

  const toggleMicPolicy = async () => {
    const policyRef = ref(database, `karaoke-rooms/${roomCode}/micPolicy`);
    await set(policyRef, roomState?.micPolicy === "open" ? "auto" : "open");
  };

  return (
    <div className="min-h-screen relative overflow-hidden text-white">
      {/* Background */}
      <div className="absolute inset-0 bg-[#070712]" />
      <div className="absolute -top-40 -left-40 w-[520px] h-[520px] rounded-full blur-3xl opacity-50 bg-fuchsia-600" />
      <div className="absolute -bottom-56 -right-56 w-[640px] h-[640px] rounded-full blur-3xl opacity-50 bg-indigo-600" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,0,153,0.18),transparent_55%),radial-gradient(ellipse_at_bottom,rgba(99,102,241,0.18),transparent_55%)]" />

      <div className="relative p-4">
        <div className="max-w-7xl mx-auto">
          {/* Banner Header */}
          <div className="rounded-3xl overflow-hidden border border-white/10 bg-white/5 backdrop-blur-xl shadow-2xl mb-6">
            <div className="relative h-40 md:h-52">
              <video
                className="absolute inset-0 w-full h-full object-cover"
                src="/dj_chelsea_banner.mp4"
                autoPlay
                loop
                muted
                playsInline
              />

              <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(0,0,0,0.72)_0%,rgba(0,0,0,0.40)_45%,rgba(0,0,0,0.18)_100%)]" />
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,0,153,0.18),transparent_60%),radial-gradient(ellipse_at_bottom,rgba(99,102,241,0.14),transparent_60%)]" />
              <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-white/10" />

              <div className="relative p-5 md:p-7">
                <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
                  <div>
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-black/35 text-xs tracking-widest uppercase">
                      <span className="w-2 h-2 rounded-full bg-fuchsia-400 shadow-[0_0_18px_rgba(232,121,249,0.8)]" />
                      Host Console
                    </div>

                    <h1 className="mt-3 text-2xl md:text-4xl font-extrabold">
                      <span className="bg-clip-text text-transparent bg-[linear-gradient(90deg,#ff3aa7,#9b7bff,#ffd24a)]">
                        DJ Mode
                      </span>
                    </h1>

                    <div className="mt-2 text-white/70">
                      Room Code:{" "}
                      <span className="font-mono text-white tracking-[0.25em] bg-black/35 px-3 py-1 rounded-xl border border-white/10">
                        {roomCode}
                      </span>
                    </div>
                  </div>

                  <div className="text-left md:text-right">
                    <div className="text-xs text-white/50">Host</div>
                    <div className="font-bold text-lg">
                      {djName || currentUser?.name || "DJ"}{" "}
                      <span className="text-white/70">🎤</span>
                    </div>
                    <div className="text-xs text-white/40">don’t touch anything expensive</div>
                  </div>
                </div>
              </div>
            </div>
            <div className="h-[1px] bg-white/10" />
          </div>

          {/* Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <VideoPlayer
                currentSong={currentSong}
                playbackState={roomState?.playbackState}
                onSkip={handleSkipSong}
                isHost={true}
              />

              <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-xl p-4 md:p-6">
                <SongSearch
                  searchQuery={searchQuery}
                  setSearchQuery={setSearchQuery}
                  onSearch={handleSearch}
                  isSearching={isSearching}
                  searchResults={searchResults}
                  participants={participants}
                  onAddToQueue={handleAddToQueue}
                  hasSearched={hasSearched}
                />
              </div>
            </div>

            <div className="space-y-6">
              {/* Video Chat */}
              <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-xl p-4 md:p-6">
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xs tracking-widest uppercase text-white/50">Live Video</div>
                    <h3 className="text-xl md:text-2xl font-extrabold">Participants</h3>
                    {roomState?.micPolicy === "auto" && (
                      <div className="text-xs text-white/50 mt-1">
                        🎙️ Auto-mic: only the singer should be unmuted
                      </div>
                    )}
                  </div>

                  <button
                    onClick={toggleMicPolicy}
                    className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20"
                  >
                    {roomState?.micPolicy === "open"
                      ? "Mic: OPEN (override)"
                      : "Mic: AUTO (only singer)"}
                  </button>
                </div>

                <VideoChat
                  roomCode={roomCode}
                  userName={djName || currentUser.name}
                  currentUserId={currentUser.id}
                  participants={participants}
                  isDJ={true}
                  canModerate={true}
                />
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-xl p-4 md:p-6">
                <SongQueue
                  queue={queue}
                  onPlaySong={handlePlaySong}
                  onDeleteSong={handleDeleteSong}
                  onMoveSongUp={handleMoveSongUp}
                  onMoveSongDown={handleMoveSongDown}
                  isHost={true}
                />
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-xl p-4 md:p-6">
                <ParticipantsList participants={participants} currentUser={currentUser} />
              </div>
            </div>
          </div>

          <div className="mt-6 text-center text-xs text-white/35">
            If this breaks mid-track, call it “DJ philosophy.”
          </div>
        </div>
      </div>
    </div>
  );
}

export default HostView;
