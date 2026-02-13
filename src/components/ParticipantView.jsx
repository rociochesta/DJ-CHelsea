import React, { useMemo, useState } from "react";
import { useRoomContext } from "@livekit/components-react";

import { database, ref, push, set } from "../utils/firebase";
import { searchKaraokeVideos } from "../utils/youtube";

import VideoPlayer from "./VideoPlayer";
import SongQueue from "./SongQueue";
import SingerSpotlight from "./SingerSpotlight";
import SongSearch from "./SongSearch";
import ChatPanel from "./ChatPanel";
import EmojiReactions from "./Emojireactions";
import { useAutoMicPolicy } from "../hooks/useAutoMicPolicy";

export default function ParticipantView({ roomCode, currentUser, roomState }) {
  const room = useRoomContext();

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [cooldownMessage, setCooldownMessage] = useState("");

  const queue = useMemo(
    () => (roomState?.queue ? Object.values(roomState.queue) : []),
    [roomState?.queue]
  );

  const currentSong = roomState?.currentSong || null;
  const participantMutes = roomState?.participantMutes || {};

  // ✅ enforce mic policy for local participant
  useAutoMicPolicy(room, {
    currentSong,
    currentUserName: currentUser?.name,
    enabled: true,
  });

  const userHasSongInQueue = useMemo(() => {
    return queue.some((song) => song.requestedBy === currentUser?.name);
  }, [queue, currentUser?.name]);

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

  const handleAddToQueue = async (video) => {
    if (userHasSongInQueue) {
      const messages = [
        "Whoa there, champ. One song at a time. 🎤",
        "Easy tiger. You've already got one queued. 🐯",
        "Slow down, Beyoncé. One per person. 👑",
      ];
      setCooldownMessage(messages[Math.floor(Math.random() * messages.length)]);
      setTimeout(() => setCooldownMessage(""), 4000);
      return;
    }

    const queueRef = ref(database, `karaoke-rooms/${roomCode}/queue`);
    const newSongRef = push(queueRef);

    await set(newSongRef, {
      id: newSongRef.key,
      videoId: video.id,
      title: video.title,
      thumbnail: video.thumbnail,
      addedBy: currentUser.id,
      requestedBy: currentUser.name,
      addedAt: Date.now(),
    });

    setSearchQuery("");
    setSearchResults([]);
    setHasSearched(false);
  };

  const noopMuteToggle = async () => {};
  const noopMuteAll = async () => {};

  return (
    <div className="min-h-screen relative overflow-hidden text-white">
      {/* ...tu UI igual... */}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
          <VideoPlayer currentSong={currentSong} playbackState={roomState?.playbackState} isHost={false} />
<SingerSpotlight
  roomCode={roomCode}
  currentSong={currentSong}
  participantMutes={participantMutes}
  onMuteToggle={noopMuteToggle}
  onMuteAll={noopMuteAll}
  queue={queue}
  canControlMics={false}
  currentUser={currentUser}
  showControls={true}
/>
        </div>

        <div className="space-y-6">
          <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-xl p-6">
            <SongQueue queue={queue} isHost={false} />
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-xl p-6">
            {cooldownMessage && (
              <div className="mb-4 rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-4 text-center">
                <div className="text-yellow-400 font-bold">{cooldownMessage}</div>
              </div>
            )}

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
              participants={[]}
              isParticipant={true}
            />
          </div>
        </div>
      </div>

      <ChatPanel roomCode={roomCode} currentUser={currentUser} currentSong={currentSong} />
      <EmojiReactions roomCode={roomCode} currentUser={currentUser} />
    </div>
  );
}