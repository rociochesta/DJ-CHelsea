import React, { useMemo, useState } from "react";
import { searchKaraokeVideos } from "../utils/youtube";

function SongSearch({ onAddToQueue, participants = [] }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // ✅ picker modal state
  const [pickOpen, setPickOpen] = useState(false);
  const [pickedVideo, setPickedVideo] = useState(null);
  const [pickedUserId, setPickedUserId] = useState("");
  const [customName, setCustomName] = useState("");

  const sortedParticipants = useMemo(() => {
    const list = Array.isArray(participants) ? participants : [];
    return [...list].sort((a, b) => {
      if (a.role === "host" && b.role !== "host") return -1;
      if (b.role === "host" && a.role !== "host") return 1;
      return String(a.name || "").localeCompare(String(b.name || ""));
    });
  }, [participants]);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsLoading(true);
    setError("");

    try {
      const videos = await searchKaraokeVideos(searchQuery);
      setSearchResults(videos);

      if (videos.length === 0) {
        setError("No videos found. Try adding 'karaoke', 'instrumental', or 'lyrics'.");
      }
    } catch (err) {
      console.error("Search error:", err);
      setError("Search failed. Check your YouTube API key and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const openPicker = (video) => {
    setPickedVideo(video);
    setCustomName("");

    // default select first participant if exists
    setPickedUserId(sortedParticipants[0]?.id || "");
    setPickOpen(true);
  };

  const closePicker = () => {
    setPickOpen(false);
    setPickedVideo(null);
    setPickedUserId("");
    setCustomName("");
  };

  const confirmPick = () => {
    let chosen =
      sortedParticipants.find((p) => p.id === pickedUserId) || null;

    // fallback: custom name
    if (!chosen) {
      const name = customName.trim();
      chosen = name ? { id: null, name } : { id: null, name: "Someone" };
    }

    onAddToQueue?.(pickedVideo, chosen);
    closePicker();
  };

  return (
    <div className="card">
      <h3 className="text-xl font-bold mb-4">Find a track</h3>

      <form onSubmit={handleSearch} className="mb-4 flex gap-3">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder='Search YouTube... (e.g. "Mr Brightside karaoke")'
          className="flex-1 p-3 rounded-lg bg-karaoke-bg border border-gray-600 text-white focus:border-karaoke-accent focus:outline-none"
        />
        <button type="submit" disabled={isLoading} className="btn-primary">
          {isLoading ? "Searching..." : "Search"}
        </button>
      </form>

      <div className="text-sm text-gray-400 mb-4">
        💡 Some videos can't be embedded (official uploads often block playback). If a video fails, it'll auto-skip.
      </div>

      {error && (
        <div className="bg-yellow-900/20 border border-yellow-600/30 p-3 rounded-lg mb-4 text-yellow-400 text-sm">
          {error}
        </div>
      )}

      <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
        {searchResults.map((video) => (
          <div
            key={video.id}
            className="flex gap-3 items-center p-3 rounded-lg bg-karaoke-bg border border-gray-700"
          >
            <img
              src={video.thumbnail}
              alt={video.title}
              className="w-20 h-14 rounded object-cover"
            />
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-white truncate">{video.title}</div>
              <div className="text-sm text-gray-400 truncate">{video.channelTitle}</div>
            </div>
            <button
              onClick={() => openPicker(video)}
              className="btn-secondary whitespace-nowrap"
            >
              Add to Queue
            </button>
          </div>
        ))}
      </div>

      {/* ✅ Who requested? modal */}
      {pickOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0b0b18] p-4 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs tracking-widest uppercase text-white/50">
                  Who requested this?
                </div>
                <div className="text-lg font-extrabold mt-1">
                  Pick the singer 🎤
                </div>
                <div className="text-sm text-white/60 mt-1 truncate">
                  {pickedVideo?.title}
                </div>
              </div>

              <button
                onClick={closePicker}
                className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 space-y-3">
              {sortedParticipants.length > 0 ? (
                <>
                  <select
                    value={pickedUserId}
                    onChange={(e) => setPickedUserId(e.target.value)}
                    className="w-full rounded-xl bg-white/10 border border-white/10 p-3 text-white"
                  >
                    {sortedParticipants.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name || "Guest"}{p.role === "host" ? " (DJ)" : ""}
                      </option>
                    ))}
                    <option value="">Someone else…</option>
                  </select>

                  {!pickedUserId && (
                    <input
                      value={customName}
                      onChange={(e) => setCustomName(e.target.value)}
                      placeholder="Type name…"
                      className="w-full rounded-xl bg-white/10 border border-white/10 p-3 text-white"
                    />
                  )}
                </>
              ) : (
                <input
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="No participants found — type name…"
                  className="w-full rounded-xl bg-white/10 border border-white/10 p-3 text-white"
                />
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={closePicker}
                  className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmPick}
                  className="px-3 py-2 rounded-xl bg-fuchsia-600 hover:bg-fuchsia-500 font-bold"
                >
                  Add
                </button>
              </div>

              <div className="text-xs text-white/40">
                Tip: if someone hasn’t joined yet, pick “Someone else…” and type it.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SongSearch;