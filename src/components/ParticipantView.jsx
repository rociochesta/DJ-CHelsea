import React, { useState, useMemo } from "react";
import { database, ref, set, push } from "../utils/firebase";
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

function ParticipantView({ roomCode, currentUser, roomState }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Determine room mode
  const roomMode = roomState?.roomMode || "karaoke";
  const isStreaming = roomMode === "streaming";
  const isDJ = roomMode === "dj";
  const isKaraoke = roomMode === "karaoke";

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
      requestedBy: requestedBy || currentUser.name,
      addedAt: Date.now(),
    });
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

  // Get mode label for display
  const getModeLabel = () => {
    if (isDJ) return "DJ Mode";
    if (isStreaming) return "Streaming Mode";
    return "Karaoke Mode";
  };

  return (
    <div className="min-h-screen relative overflow-hidden text-white">
      <div className="absolute inset-0 bg-[#070712]" />
      <div className="absolute -top-40 -left-40 w-[520px] h-[520px] rounded-full blur-3xl opacity-50 bg-fuchsia-600" />
      <div className="absolute -bottom-56 -right-56 w-[640px] h-[640px] rounded-full blur-3xl opacity-50 bg-indigo-600" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,0,153,0.18),transparent_55%),radial-gradient(ellipse_at_bottom,rgba(99,102,241,0.18),transparent_55%)]" />
{/* ADD THIS: */}
<ExternalVideoPrompt videoLink={roomState?.externalVideoLink} />
      <div className="relative p-4">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-black/30 text-xs tracking-widest uppercase">
                  <span className="w-2 h-2 rounded-full bg-indigo-400 shadow-[0_0_18px_rgba(99,102,241,0.8)]" />
                  Participant
                </div>

                <h1 className="mt-3 text-2xl md:text-4xl font-extrabold">
                  <span className="bg-clip-text text-transparent bg-[linear-gradient(90deg,#ff3aa7,#9b7bff,#ffd24a)]">
                    {getModeLabel()}
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

          {/* Video Player - Switch between YouTube and Google Drive */}
          {isStreaming ? (
            <GoogleDrivePlayer
              videoUrl={currentSong?.videoUrl}
              title={currentSong?.title}
              playbackState={roomState?.playbackState}
              isHost={false}
              requestedBy={currentSong?.requestedBy}
            />
          ) : (
            <VideoPlayer 
              currentSong={currentSong} 
              playbackState={roomState?.playbackState} 
              isHost={false} 
            />
          )}

          {/* Singer Spotlight - Show in all modes */}
          <div className="mt-6">
            <SingerSpotlight
              roomCode={roomCode}
              currentSong={isKaraoke ? currentSong : null}
              participantMutes={participantMutes}
              onMuteToggle={() => {}}
              onMuteAll={() => {}}
              queue={isKaraoke ? queue : []}
              canControlMics={false}
              currentUser={currentUser}
            />
          </div>

          {/* Content based on mode */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              {isStreaming ? (
                <StreamingQueue
                  roomCode={roomCode}
                  queue={queue}
                  currentSong={currentSong}
                  isHost={false}
                  currentUser={currentUser}
                />
              ) : (
                <div className="space-y-6">
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
                      isParticipant={true}
                    />
                  </div>

                  <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-xl p-6">
                    <SongQueue
                      queue={queue}
                      onPlaySong={null}
                      onDeleteSong={null}
                      isHost={false}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Right Column - Chat */}
            <div>
              <ChatPanel roomCode={roomCode} currentUser={memoizedUser} currentSong={currentSong} inline={true} />
            </div>
          </div>
        </div>
      </div>

      {/* Reactions and Settings */}
      <DeviceSettingsPanel />
      <EmojiReactions roomCode={roomCode} currentUser={memoizedUser} />
    </div>
  );
}

export default ParticipantView;