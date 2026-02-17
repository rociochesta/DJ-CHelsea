import React, { useMemo } from "react";

function SongQueue({ queue, onPlaySong, onDeleteSong, onMoveSongUp, onMoveSongDown, isHost }) {
  const sortedQueue = useMemo(() => {
    return [...(queue || [])].sort((a, b) => (a.addedAt || 0) - (b.addedAt || 0));
  }, [queue]);

  return (
    <div>
      <div className="flex items-end justify-between gap-4 mb-4">
        <div>
          <div className="text-xs tracking-widest uppercase text-white/50">Up Next</div>
          <h3 className="text-xl md:text-2xl font-extrabold">
            Queue{" "}
            <span className="text-white/60 font-semibold">({sortedQueue.length})</span>
          </h3>
        </div>

        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-black/30 text-xs">
          <span className="w-2 h-2 rounded-full bg-fuchsia-400 shadow-[0_0_18px_rgba(232,121,249,0.8)]" />
          {isHost ? "Host Controls" : "View Only"}
        </div>
      </div>

      {sortedQueue.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-black/25 p-6 text-center">
          <div className="text-5xl mb-3">🧾</div>
          <div className="text-lg font-bold">No tracks queued</div>
          <div className="mt-1 text-white/60 text-sm">
            Add something emotionally irresponsible and pretend it’s curated.
          </div>
        </div>
      ) : (
        <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
          {sortedQueue.map((song, index) => {
           const asName = (v) => {
  if (typeof v === "string") return v.trim();
  if (v && typeof v === "object") return String(v.name || v.identity || "").trim();
  return "";
};

const requestedBy = asName(song.requestedBy) || "Someone";
const queuedBy = asName(song.addedByName) || null;
            return (
              <div
                key={song.id}
                className="rounded-2xl border border-white/10 bg-black/25 hover:bg-black/35 transition p-3"
              >
                <div className="flex gap-3">
                  <div className="relative shrink-0">
                    <img
                      src={song.thumbnail}
                      alt={song.title}
                      className="w-24 h-16 object-cover rounded-xl border border-white/10"
                    />
                    <div className="absolute -top-2 -left-2 px-2 py-1 rounded-lg text-xs font-extrabold bg-black/70 border border-white/10">
                      #{index + 1}
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm md:text-base leading-snug line-clamp-2">
                      {song.title}
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      {/* ✅ Requested by */}
                      <span className="text-xs px-2 py-1 rounded-full border border-white/10 bg-white/5 text-white/85">
                        🙋 Requested by:{" "}
                        <span className="font-semibold text-white">{requestedBy}</span>
                      </span>

                      {/* Optional: show who queued it (only if you later store addedByName) */}
                      {queuedBy && (
                        <span className="text-xs px-2 py-1 rounded-full border border-white/10 bg-white/5 text-white/60">
                          +queued by {queuedBy}
                        </span>
                      )}

                      {/* Fallback pill if you want some status tag */}
                      {!queuedBy && (
                        <span className="text-xs px-2 py-1 rounded-full border border-white/10 bg-white/5 text-white/60">
                          +queued
                        </span>
                      )}
                    </div>
                  </div>

             {isHost && (
  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-2 shrink-0">
    {/* Top row (mobile): Play Now full width */}
    <button
      onClick={() => onPlaySong?.(song)}
      className="
        w-full sm:w-auto
        px-4 py-2 rounded-xl font-bold
        bg-[linear-gradient(90deg,#ff2aa1,#7c3aed)]
        hover:opacity-95 active:scale-[0.99] transition
        border border-white/10
        shadow-[0_18px_60px_rgba(255,0,153,0.14)]
        whitespace-nowrap
      "
    >
      Play Now
    </button>

    {/* Bottom row (mobile): reorder + delete in a compact bar */}
    <div className="flex items-center justify-between sm:justify-start gap-2">
      {/* Reorder buttons */}
      <div className="flex items-center gap-2 sm:flex-col sm:gap-1">
        <button
          onClick={() => onMoveSongUp?.(song, index)}
          disabled={index === 0}
          className="p-2 sm:p-1 rounded bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition"
          title="Move up"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
          </svg>
        </button>

        <button
          onClick={() => onMoveSongDown?.(song, index)}
          disabled={index === sortedQueue.length - 1}
          className="p-2 sm:p-1 rounded bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition"
          title="Move down"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {/* Delete button */}
      <button
        onClick={() => {
          if (window.confirm(`Remove "${song.title}" from queue?`)) {
            onDeleteSong?.(song.id);
          }
        }}
        className="p-2 rounded bg-red-500/20 hover:bg-red-500/30 transition"
        title="Delete"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>
    </div>
  </div>
)}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default SongQueue;