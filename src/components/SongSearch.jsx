import React, { useState } from "react";
import { Search, Plus, Music } from "lucide-react";

function SongSearch({
  searchQuery,
  setSearchQuery,
  onSearch,
  isSearching,
  searchResults,
  onAddToQueue,
  hasSearched,
  currentUser,
  participants,
  roomCode,
  isParticipant,
}) {
  const [error, setError] = useState("");

  const outlineBtn =
    "border-fuchsia-500/35 hover:border-fuchsia-400/50 hover:shadow-[0_0_14px_rgba(232,121,249,0.16)]";

  const handleSearch = (e) => {
    e.preventDefault();
    onSearch?.(e);
  };

  const handleAdd = (video) => {
    if (!isParticipant && currentUser?.name) {
      const options = [
        currentUser.name,
        ...((participants || []).map((p) => p.name).filter((n) => n !== currentUser.name)),
        "Other (type name)",
      ];

      const choice = window.prompt(
        `Who's singing this song?\n\n${options.map((opt, i) => `${i + 1}. ${opt}`).join("\n")}`,
        "1"
      );

      if (!choice) return;

      const choiceNum = parseInt(choice);
      let requestedBy;

      if (choiceNum >= 1 && choiceNum <= options.length) {
        const selected = options[choiceNum - 1];
        if (selected === "Other (type name)") {
          requestedBy = window.prompt("Enter singer's name:", "")?.trim() || "Someone";
        } else {
          requestedBy = selected;
        }
      } else {
        requestedBy = choice.trim() || currentUser.name;
      }

      onAddToQueue?.(video, requestedBy);
    } else {
      onAddToQueue?.(video, currentUser?.name || "Someone");
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <Music className="w-5 h-5 text-white/60" />
        <h3 className="text-xl font-bold">Find a track</h3>
      </div>

      {/* Search bar */}
      <form onSubmit={handleSearch} className="mb-4 flex gap-3">
        <input
          type="text"
          value={searchQuery || ""}
          onChange={(e) => setSearchQuery?.(e.target.value)}
          placeholder='Search YouTube… (e.g. "Mr Brightside karaoke")'
          className="
            flex-1 px-4 py-3 rounded-2xl
            bg-white/[0.03] border border-white/10
            text-white placeholder-white/35
            focus:outline-none focus:border-fuchsia-400/50 focus:ring-2 focus:ring-fuchsia-400/10
          "
        />

        <button
          type="submit"
          disabled={isSearching}
          onMouseDown={(e) => e.preventDefault()}
          className={`
            inline-flex items-center gap-2 px-4 py-3 rounded-2xl border
            bg-transparent text-white/85 font-semibold
            transition active:scale-[0.98]
            ${outlineBtn}
            disabled:opacity-40 disabled:cursor-not-allowed
          `}
        >
          <Search className="w-4 h-4" />
          {isSearching ? "Searching…" : "Search"}
        </button>
      </form>

      {/* Tip */}
      <div className="text-xs text-white/50 mb-4">
        Some videos cannot be embedded. If playback fails, it will auto-skip.
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-2xl border border-yellow-500/30 bg-yellow-500/10 px-3 py-2 text-yellow-300 text-sm mb-4">
          {error}
        </div>
      )}

      {/* Results */}
      <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
        {searchResults?.map((video) => (
          <div
            key={video.id}
            className="
              flex gap-3 items-center p-3 rounded-3xl
              border border-white/10 bg-white/[0.02]
              hover:bg-white/[0.03] transition backdrop-blur-md
            "
          >
            <img
              src={video.thumbnail}
              alt={video.title}
              className="w-20 h-14 rounded-2xl object-cover border border-white/10 shrink-0"
            />

            <div className="flex-1 min-w-0">
              <div className="font-semibold text-white/90 truncate">
                {video.title}
              </div>
              <div className="text-xs text-white/55 truncate">
                {video.channelTitle}
              </div>
            </div>

            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handleAdd(video)}
              className={`
                inline-flex items-center gap-2 px-3 py-2 rounded-2xl border
                bg-transparent text-white/85 text-sm font-semibold
                transition active:scale-[0.98]
                ${outlineBtn}
              `}
            >
              <Plus className="w-4 h-4" />
              Add
            </button>
          </div>
        ))}
      </div>

      {/* Empty */}
      {hasSearched && searchResults?.length === 0 && (
        <div className="text-center py-10 text-white/45">
          <Search className="w-8 h-8 mx-auto mb-2 text-white/35" />
          <div>No results found</div>
        </div>
      )}
    </div>
  );
}

export default SongSearch;