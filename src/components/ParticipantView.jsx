import React, { useEffect, useMemo, useState } from "react";
import { LiveKitRoom, RoomAudioRenderer, useLocalParticipant } from "@livekit/components-react";
import { database, ref, push, set } from "../utils/firebase";
import { searchKaraokeVideos } from "../utils/youtube";
import VideoPlayer from "./VideoPlayer";
import SongQueue from "./SongQueue";
import SingerSpotlight from "./SingerSpotlight";
import SongSearch from "./SongSearch";

function ParticipantView({ roomCode, currentUser, roomState }) {
  const [token, setToken] = useState("");
  const [lkError, setLkError] = useState("");

  // Song search states
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [cooldownMessage, setCooldownMessage] = useState("");

  const queue = useMemo(() => {
    return roomState?.queue ? Object.values(roomState.queue) : [];
  }, [roomState?.queue]);

  const currentSong = roomState?.currentSong || null;
  const participantMutes = roomState?.participantMutes || {};

  // Check if current user already has a song in queue
  const userHasSongInQueue = useMemo(() => {
    return queue.some(song => song.requestedBy === currentUser?.name);
  }, [queue, currentUser?.name]);

  // Handle search
  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setHasSearched(true);
    const results = await searchKaraokeVideos(searchQuery);
    setSearchResults(results);
    setIsSearching(false);
  };

  // Handle adding to queue
  const handleAddToQueue = async (video) => {
    // Check if user already has a song
    if (userHasSongInQueue) {
      const messages = [
        "Whoa there, champ. One song at a time. 🎤",
        "Easy tiger. You've already got one queued. 🐯",
        "Chill. Your masterpiece is already in line. 😎",
        "Slow down, Beyoncé. One per person. 👑",
        "Patience, grasshopper. You're already on the list. 🦗",
        "Nice try. Queue limit: 1. Current status: maxed out. 🚫",
      ];
      const randomMsg = messages[Math.floor(Math.random() * messages.length)];
      setCooldownMessage(randomMsg);
      setTimeout(() => setCooldownMessage(""), 4000);
      return;
    }

    // Add song to queue
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

    // Clear search
    setSearchQuery("");
    setSearchResults([]);
    setHasSearched(false);
  };

  // --- LiveKit token fetch (Netlify function) ---
  useEffect(() => {
    let cancelled = false;

    async function getToken() {
      try {
        setLkError("");
        setToken("");

        const res = await fetch("/.netlify/functions/livekit-token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            room: roomCode,
            name: currentUser?.name || "Guest",
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "Failed to fetch LiveKit token");

        if (!cancelled) setToken(data.token);
      } catch (e) {
        if (!cancelled) setLkError(String(e?.message || e));
      }
    }

    if (roomCode && currentUser?.name) getToken();

    return () => {
      cancelled = true;
    };
  }, [roomCode, currentUser?.name]);

  // Participant should not control mutes (host-only).
  const noopMuteToggle = async () => {};
  const noopMuteAll = async () => {};

  const content = (
    <div className="min-h-screen relative overflow-hidden text-white">
      <div className="absolute inset-0 bg-[#070712]" />
      <div className="absolute -top-40 -left-40 w-[520px] h-[520px] rounded-full blur-3xl opacity-50 bg-fuchsia-600" />
      <div className="absolute -bottom-56 -right-56 w-[640px] h-[640px] rounded-full blur-3xl opacity-50 bg-indigo-600" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,0,153,0.18),transparent_55%),radial-gradient(ellipse_at_bottom,rgba(99,102,241,0.18),transparent_55%)]" />

      <div className="relative p-4">
        <div className="max-w-[1800px] mx-auto">
          {/* Banner */}
          <div className="rounded-3xl overflow-hidden border border-white/10 bg-white/5 backdrop-blur-xl shadow-2xl mb-6">
            <div className="relative h-28 bg-gradient-to-r from-fuchsia-900/40 via-indigo-900/40 to-purple-900/40">
              <div className="relative p-5 flex items-center justify-between h-full">
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-black/35 text-xs tracking-widest uppercase">
                    <span className="w-2 h-2 rounded-full bg-indigo-300 shadow-[0_0_18px_rgba(165,180,252,0.8)]" />
                    Participant
                  </div>

                  <h1 className="mt-2 text-3xl font-extrabold">
                    <span className="bg-clip-text text-transparent bg-[linear-gradient(90deg,#ff3aa7,#9b7bff,#ffd24a)]">
                      3PM Karaoke
                    </span>
                  </h1>

                  <div className="mt-1 text-sm text-white/70">
                    Room:{" "}
                    <span className="font-mono text-white tracking-[0.2em] bg-black/35 px-2 py-1 rounded-lg">
                      {roomCode}
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-xs text-white/50">You</div>
                  <div className="font-bold text-lg">{currentUser?.name || "Guest"} 🎧</div>

                  <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-black/25">
                    <span className="text-xs font-semibold text-white/70">
                      Mic: auto (host controls)
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* LiveKit error (non-blocking UI) */}
          {lkError && (
            <div className="mb-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
              LiveKit error: {lkError}
            </div>
          )}

          {/* Layout like HostView */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* Left: Video + Participants */}
            <div className="xl:col-span-2 space-y-6">
              <VideoPlayer
                currentSong={currentSong}
                playbackState={roomState?.playbackState}
                isHost={false}
              />

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

            {/* Right: Queue + Song Search */}
            <div className="space-y-6">
              <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-xl p-6">
                <SongQueue queue={queue} isHost={false} />
              </div>

              {/* Song Search for Participants */}
              <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-xl p-6">
                <div className="mb-4">
                  <div className="text-xs tracking-widest uppercase text-white/50">Request</div>
                  <h3 className="text-xl md:text-2xl font-extrabold">
                    Add Your Song
                  </h3>
                  {userHasSongInQueue ? (
                    <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 rounded-full border border-emerald-500/30 bg-emerald-500/10">
                      <span className="text-xs font-semibold text-emerald-400">
                        ✓ You have 1 song queued
                      </span>
                    </div>
                  ) : (
                    <div className="mt-2 text-sm text-white/60">
                      You can queue 1 song at a time
                    </div>
                  )}
                </div>

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
        </div>
      </div>
    </div>
  );

  // Wrap in LiveKitRoom only when we have a token
  if (!token) return content;

  return (
    <LiveKitRoom
      token={token}
      serverUrl={import.meta.env.VITE_LIVEKIT_URL}
      connect={true}
      video={true}
      audio={true}
      data-lk-theme="default"
    >
      <RoomAudioRenderer />
      {content}
    </LiveKitRoom>
  );
}

export default ParticipantView;