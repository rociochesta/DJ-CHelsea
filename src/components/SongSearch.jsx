import React, { useState } from "react";
import { searchKaraokeVideos } from "../utils/youtube";

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
  isParticipant 
}) {
  const [error, setError] = useState("");

  const handleSearch = async (e) => {
    e.preventDefault();
    if (onSearch) {
      onSearch(e);
    }
  };

  const handleAdd = (video) => {
    // For DJ/Host: show options with their name first
    if (!isParticipant && currentUser?.name) {
      const options = [
        currentUser.name, // DJ's name first
        ...((participants || []).map(p => p.name).filter(n => n !== currentUser.name)),
        "Other (type name)"
      ];
      
      const choice = window.prompt(
        `Who's singing this song?\n\nOptions:\n${options.map((opt, i) => `${i + 1}. ${opt}`).join('\n')}`,
        "1"
      );
      
      if (!choice) return; // Cancelled
      
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
        // They typed a name directly
        requestedBy = choice.trim() || currentUser.name;
      }
      
      onAddToQueue?.(video, requestedBy);
    } else {
      // For participants: just use their name
      onAddToQueue?.(video, currentUser?.name || "Someone");
    }
  };

  return (
    <div>
      <h3 className="text-xl font-bold mb-4">Find a track</h3>

      <form onSubmit={handleSearch} className="mb-4 flex gap-3">
        <input
          type="text"
          value={searchQuery || ""}
          onChange={(e) => setSearchQuery?.(e.target.value)}
          placeholder='Search YouTube... (e.g. "Mr Brightside karaoke")'
          className="flex-1 p-3 rounded-xl bg-white/5 border border-white/10 text-white focus:border-fuchsia-400/70 focus:outline-none focus:ring-2 focus:ring-fuchsia-400/20"
        />
        <button 
          type="submit" 
          disabled={isSearching} 
          className="px-6 py-3 rounded-xl font-bold bg-[linear-gradient(90deg,#ff2aa1,#7c3aed)] hover:opacity-95 active:scale-[0.99] transition disabled:opacity-50"
        >
          {isSearching ? "Searching..." : "Search"}
        </button>
      </form>

      <div className="text-sm text-white/60 mb-4">
        💡 Some videos can't be embedded (official uploads often block playback). If a video fails, it'll auto-skip.
      </div>

      {error && (
        <div className="bg-yellow-900/20 border border-yellow-600/30 p-3 rounded-lg mb-4 text-yellow-400 text-sm">
          {error}
        </div>
      )}

      <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
        {searchResults && searchResults.map((video) => (
          <div key={video.id} className="flex gap-3 items-center p-3 rounded-xl bg-black/25 border border-white/10 hover:bg-black/35 transition">
            <img src={video.thumbnail} alt={video.title} className="w-20 h-14 rounded object-cover shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-white truncate">{video.title}</div>
              <div className="text-sm text-white/60 truncate">{video.channelTitle}</div>
            </div>
            <button 
              onClick={() => handleAdd(video)} 
              className="px-4 py-2 rounded-xl font-bold bg-white/10 hover:bg-white/20 transition whitespace-nowrap"
            >
              Add to Queue
            </button>
          </div>
        ))}
      </div>
      
      {hasSearched && searchResults && searchResults.length === 0 && (
        <div className="text-center py-8 text-white/50">
          <div className="text-4xl mb-2">🔍</div>
          <div>No results found. Try a different search.</div>
        </div>
      )}
    </div>
  );
}

export default SongSearch;