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
import MeetingDisplay from "./MeetingDisplay";

import { Mic, MonitorPlay, Headphones, User, BookOpen } from "lucide-react";

function ParticipantView({ roomCode, currentUser, roomState }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

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

  const queue = roomState?.queue ? Object.values(roomState.queue) : [];
  const participants = roomState?.participants ? Object.values(roomState.participants) : [];
  const currentSong = roomState?.currentSong;
  const participantMutes = roomState?.participantMutes || {};

  // ✅ TEMP RULE: participant can only have one queued song (until host override exists)
  const userName = currentUser?.name || "";
  const userAlreadyQueued = useMemo(() => {
    if (!userName) return false;
    return queue.some((s) => (s?.requestedBy || "") === userName);
  }, [queue, userName]);

  const handleAddToQueue = async (video, requestedBy) => {
    // ✅ block >1 request per participant (for now)
    if (userAlreadyQueued) {
      alert("You already have a song in the queue 🎧\nWait until it plays (or the host clears it).");
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
      requestedBy: requestedBy || currentUser.name,
      addedAt: Date.now(),
    });
  };

  const memoizedUser = useMemo(
    () => ({ id: currentUser?.id, name: currentUser?.name }),
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
      <div className="absolute inset-0 bg-[#070712]" />
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_top,rgba(255,0,153,0.08),transparent_55%),radial-gradient(ellipse_at_bottom,rgba(99,102,241,0.08),transparent_55%)]" />

      <div className="relative p-4 pb-28">
        <div className="max-w-7xl mx-auto space-y-6">
          <ExternalVideoPrompt videoLink={roomState?.externalVideoLink} />

          <div className="rounded-3xl border border-white/10 bg-white/[0.03] backdrop-blur-md shadow-lg p-6">
            <div className="flex items-start justify-between gap-6">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-xs tracking-widest uppercase text-white/45">
                  <ModeIcon className="w-4 h-4 text-white/55" />
                  <span>Participant</span>
                </div>

                <h1 className="mt-2 text-2xl md:text-4xl font-extrabold leading-tight">
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

              <div className="text-right flex-shrink-0">
                <div className="text-xs text-white/45">You</div>
                <div className="mt-1 inline-flex items-center gap-2 justify-end">
                  <div className="w-9 h-9 rounded-2xl border border-white/10 bg-white/[0.02] flex items-center justify-center">
                    <User className="w-4 h-4 text-white/70" />
                  </div>
                  <div className="font-semibold text-base sm:text-lg text-white/90">
                    {currentUser?.name}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Video / Meeting Display */}
          {isMeeting ? (
            <MeetingDisplay
              activeReadingId={roomState?.activeReadingId || null}
              isHost={false}
              onSelectReading={() => {}}
            />
          ) : isStreaming ? (
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
              // ✅ we’ll use this in VideoPlayer to make “Performance Mode” opt-in
              performanceModeOptIn={true}
            />
          )}

          {/* Spotlight */}
          <SingerSpotlight
            roomCode={roomCode}
            roomMode={roomMode}
            currentSong={isKaraoke ? currentSong : null}
            participantMutes={participantMutes}
            onMuteToggle={() => {}}
            onMuteAll={() => {}}
            queue={isKaraoke ? queue : []}
            canControlMics={false}
            currentUser={currentUser}
            micsLocked={roomState?.hostControls?.micsLocked || false}
            // ✅ helps DJ mode choose “host first” when idle
            preferHostWhenIdle={isDJ}
          />

          {!isMeeting && (
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
                        roomCode={roomCode}
                        isParticipant={true}
                        // Optional: if SongSearch supports disabling UI, you can use this:
                        // disabled={userAlreadyQueued}
                      />
                      {userAlreadyQueued && (
                        <div className="mt-3 text-xs text-white/45">
                          You already have a song queued. (Host override coming later.)
                        </div>
                      )}
                    </div>

                    <div className="rounded-3xl border border-white/10 bg-white/[0.03] backdrop-blur-md shadow-lg p-6">
                      <SongQueue queue={queue} onPlaySong={null} onDeleteSong={null} isHost={false} />
                    </div>
                  </div>
                )}
              </div>

              <div>
                <ChatPanel roomCode={roomCode} currentUser={memoizedUser} currentSong={currentSong} inline={true} />
              </div>
            </div>
          )}

          {isMeeting && (
            <ChatPanel roomCode={roomCode} currentUser={memoizedUser} currentSong={currentSong} inline={true} />
          )}
        </div>
      </div>

      <DeviceSettingsPanel />
      <EmojiReactions roomCode={roomCode} currentUser={memoizedUser} />
    </div>
  );
}

export default ParticipantView;