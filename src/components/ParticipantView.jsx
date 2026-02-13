import React, { useState } from "react";
import { database, ref, push, set } from "../utils/firebase";
import VideoPlayer from "./VideoPlayer";
import SongQueue from "./SongQueue";
import SongSearch from "./SongSearch";
import VideoChat from "./VideoChat";
import { searchKaraokeVideos } from "../utils/youtube";

function ParticipantView({ roomCode, currentUser, roomState }) {
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

  const handleRequestSong = async (video) => {
    const queueRef = ref(database, `karaoke-rooms/${roomCode}/queue`);
    const newSongRef = push(queueRef);

    await set(newSongRef, {
      id: newSongRef.key,
      videoId: video.id,
      title: video.title,
      thumbnail: video.thumbnail,
      addedBy: currentUser.id,
      singerName: currentUser.name,
      addedAt: Date.now(),
    });

    setSearchQuery("");
    setSearchResults([]);
    alert("Song added to queue! 🎤");
  };

  const queue = roomState?.queue ? Object.values(roomState.queue) : [];
  const currentSong = roomState?.currentSong;

  return (
    <div className="min-h-screen relative overflow-hidden text-white">
      {/* Background */}
      <div className="absolute inset-0 bg-[#070712]" />
      <div className="absolute -top-40 -left-40 w-[520px] h-[520px] rounded-full blur-3xl opacity-50 bg-fuchsia-600" />
      <div className="absolute -bottom-56 -right-56 w-[640px] h-[640px] rounded-full blur-3xl opacity-50 bg-indigo-600" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,0,153,0.18),transparent_55%),radial-gradient(ellipse_at_bottom,rgba(99,102,241,0.18),transparent_55%)]" />

      <div className="relative p-4">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-2xl p-5 md:p-7 mb-6">
            <div className="flex justify-between items-center gap-4">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-black/30 text-xs tracking-widest uppercase">
                  <span className="w-2 h-2 rounded-full bg-indigo-400 shadow-[0_0_18px_rgba(99,102,241,0.8)]" />
                  Participant
                </div>

                <h1 className="mt-3 text-2xl md:text-4xl font-extrabold">
                  <span className="bg-clip-text text-transparent bg-[linear-gradient(90deg,#ff3aa7,#9b7bff,#ffd24a)]">
                    3PM Karaoke
                  </span>
                </h1>

                <div className="mt-2 text-white/70">
                  Room:{" "}
                  <span className="font-mono text-white tracking-[0.25em] bg-black/30 px-3 py-1 rounded-xl border border-white/10">
                    {roomCode}
                  </span>
                </div>
              </div>

              <div className="text-right">
                <div className="text-xs text-white/50">You</div>
                <div className="font-bold text-lg">{currentUser.name}</div>
              </div>
            </div>
          </div>

          <VideoPlayer
            currentSong={currentSong}
            playbackState={roomState?.playbackState}
            isHost={false}
          />

          {/* Video Chat */}
          <div className="mt-6 rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-xl p-4 md:p-6">
            <div className="mb-4">
              <div className="text-xs tracking-widest uppercase text-white/50">
                Live Video
              </div>
              <h3 className="text-xl md:text-2xl font-extrabold">
                Participants
              </h3>
            </div>

            <VideoChat
              roomCode={roomCode}
              userName={currentUser.name}
              currentUserId={currentUser.id}
              participants={roomState?.participants ? Object.values(roomState.participants) : []}
              isDJ={false}
              canModerate={false}
            />
          </div>

          <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-xl p-4 md:p-6">
              <SongSearch
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                onSearch={handleSearch}
                isSearching={isSearching}
                searchResults={searchResults}
                onAddToQueue={handleRequestSong}
                buttonText="Request Song"
                hasSearched={hasSearched}
              />
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-xl p-4 md:p-6">
              <SongQueue queue={queue} isHost={false} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ParticipantView;
