import { useMemo, useState } from "react";
import { Search, Plus, Music, X } from "lucide-react";

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
  naMembers,
  isParticipant,
}) {
  const [pendingVideo, setPendingVideo] = useState(null);

  const outlineBtn =
    "border-fuchsia-500/35 hover:border-fuchsia-400/50 hover:shadow-[0_0_14px_rgba(232,121,249,0.16)]";

  // Build unified singer list (only relevant for host)
  const allSingers = useMemo(() => {
    if (isParticipant) return [];

    const singers = [];

    // Current user (host) first
    if (currentUser?.name) {
      singers.push({
        key: `user-${currentUser.id || "host"}`,
        name: currentUser.name,
        avatar: currentUser.avatar || "🎤",
        group: currentUser.group || "",
      });
    }

    // Real participants (excluding self)
    (participants || []).forEach((p) => {
      if (p.name && p.name !== currentUser?.name) {
        singers.push({
          key: `part-${p.id || p.name}`,
          name: p.name,
          avatar: p.avatar || "🎤",
          group: p.group || "",
        });
      }
    });

    // NA (fake) members
    (naMembers || []).forEach((m) => {
      singers.push({
        key: `na-${m.nickname}`,
        name: m.nickname,
        avatar: m.avatar || "🎵",
        group: m.group || "",
      });
    });

    return singers;
  }, [isParticipant, currentUser, participants, naMembers]);

  const handleSearch = (e) => {
    e.preventDefault();
    onSearch?.(e);
  };

  const handleAdd = (video) => {
    if (!isParticipant) {
      setPendingVideo(video);
    } else {
      onAddToQueue?.(video, currentUser?.name || "Someone");
    }
  };

  const confirmSinger = (singer) => {
    if (!pendingVideo) return;
    onAddToQueue?.(pendingVideo, singer.name);
    setPendingVideo(null);
  };

  const confirmCustom = () => {
    if (!pendingVideo) return;
    const name = window.prompt("Enter singer's name:", "")?.trim();
    if (name) {
      onAddToQueue?.(pendingVideo, name);
      setPendingVideo(null);
    }
  };

  return (
    <div>
      {/* Singer picker modal */}
      {pendingVideo && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) setPendingVideo(null); }}
        >
          <div className="w-full max-w-sm rounded-3xl border border-white/10 bg-[#0d0d1f] shadow-2xl overflow-hidden">
            {/* Modal header */}
            <div className="flex items-center justify-between p-5 border-b border-white/10">
              <h3 className="font-bold text-lg">Who's singing?</h3>
              <button
                onClick={() => setPendingVideo(null)}
                className="w-8 h-8 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 flex items-center justify-center transition"
              >
                <X className="w-4 h-4 text-white/70" />
              </button>
            </div>

            {/* Song preview */}
            <div className="mx-5 mt-4 flex gap-3 p-3 rounded-2xl border border-white/10 bg-white/[0.03]">
              <img
                src={pendingVideo.thumbnail}
                alt={pendingVideo.title}
                className="w-16 h-12 rounded-xl object-cover border border-white/10 shrink-0"
              />
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-sm text-white/90 line-clamp-2 leading-snug">
                  {pendingVideo.title}
                </div>
                <div className="text-xs text-white/50 mt-0.5 truncate">
                  {pendingVideo.channelTitle}
                </div>
              </div>
            </div>

            {/* Singer list */}
            <div className="p-5 pt-3 space-y-2 max-h-64 overflow-y-auto">
              {allSingers.map((singer) => (
                <button
                  key={singer.key}
                  type="button"
                  onClick={() => confirmSinger(singer)}
                  className="w-full flex items-center gap-3 p-3 rounded-2xl border border-white/10 hover:border-fuchsia-400/40 hover:bg-fuchsia-500/10 active:scale-[0.98] transition text-left"
                >
                  <span className="text-xl w-10 h-10 flex items-center justify-center rounded-full bg-black/30 border border-white/15 shrink-0">
                    {singer.avatar}
                  </span>
                  <div className="min-w-0">
                    <div className="font-semibold text-sm text-white/90 truncate">
                      {singer.name}
                    </div>
                    {singer.group && (
                      <div className="text-xs text-white/50 truncate">{singer.group}</div>
                    )}
                  </div>
                </button>
              ))}

              {/* Someone else */}
              <button
                type="button"
                onClick={confirmCustom}
                className="w-full flex items-center gap-3 p-3 rounded-2xl border border-dashed border-white/15 hover:border-white/30 hover:bg-white/[0.03] active:scale-[0.98] transition text-white/50"
              >
                <span className="text-lg w-10 h-10 flex items-center justify-center rounded-full bg-black/20 border border-white/10 shrink-0">
                  +
                </span>
                <span className="text-sm">Someone else…</span>
              </button>
            </div>
          </div>
        </div>
      )}

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
