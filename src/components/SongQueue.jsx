import React, { useMemo, useState } from "react";
import { ChevronUp, ChevronDown, Minus, Plus, Play, Trash2, ArrowUp, ArrowDown, ListMusic } from "lucide-react";

function SongQueue({
  queue,
  onPlaySong,
  onDeleteSong,
  onMoveSongUp,
  onMoveSongDown,
  isHost,
}) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const sortedQueue = useMemo(() => {
    return [...(queue || [])].sort((a, b) => (a.addedAt || 0) - (b.addedAt || 0));
  }, [queue]);

  const outlineBtn = (tone = "fuchsia") =>
    tone === "indigo"
      ? "border-indigo-500/30 hover:border-indigo-400/45 hover:shadow-[0_0_14px_rgba(99,102,241,0.14)]"
      : tone === "neutral"
      ? "border-white/10 hover:border-white/20 hover:shadow-[0_0_12px_rgba(232,121,249,0.10)]"
      : "border-fuchsia-500/35 hover:border-fuchsia-400/50 hover:shadow-[0_0_14px_rgba(232,121,249,0.16)]";

  const asName = (v) => {
    if (typeof v === "string") return v.trim();
    if (v && typeof v === "object") return String(v.name || v.identity || "").trim();
    return "";
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="min-w-0">
          <div className="text-xs tracking-widest uppercase text-white/50">Up Next</div>
          <h3 className="text-xl md:text-2xl font-extrabold flex items-baseline gap-2">
            <span>Queue</span>
            <span className="text-white/55 font-semibold">({sortedQueue.length})</span>
          </h3>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="hidden sm:inline-flex items-center gap-2 px-3 py-1 rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-md text-xs text-white/70">
            <ListMusic className="w-4 h-4 text-white/55" />
            {isHost ? "Host controls" : "View only"}
          </div>

          {/* + / - */}
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setIsCollapsed((v) => !v)}
            className={[
              "w-10 h-10 rounded-2xl border bg-white/[0.03] backdrop-blur-md",
              "text-white/75 transition active:scale-[0.98]",
              outlineBtn("neutral"),
            ].join(" ")}
            title={isCollapsed ? "Expand" : "Collapse"}
          >
            {isCollapsed ? (
              <Plus className="w-5 h-5 mx-auto" />
            ) : (
              <Minus className="w-5 h-5 mx-auto" />
            )}
          </button>
        </div>
      </div>

      {/* Collapsed state */}
      {isCollapsed ? (
        <div className="rounded-3xl border border-white/10 bg-white/[0.02] backdrop-blur-md p-4 text-white/55 text-sm">
          Queue collapsed.
        </div>
      ) : sortedQueue.length === 0 ? (
        <div className="rounded-3xl border border-white/10 bg-white/[0.02] backdrop-blur-md p-6 text-center">
          <div className="w-12 h-12 mx-auto rounded-2xl border border-white/10 bg-white/[0.03] flex items-center justify-center">
            <ListMusic className="w-6 h-6 text-white/55" />
          </div>
          <div className="mt-3 text-lg font-bold text-white/80">No tracks queued</div>
          <div className="mt-1 text-white/45 text-sm">
            Add something emotionally irresponsible and pretend it’s curated.
          </div>
        </div>
      ) : (
        <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
          {sortedQueue.map((song, index) => {
            const requestedBy = asName(song.requestedBy) || "Someone";
            const queuedBy = asName(song.addedByName) || null;

            return (
              <div
                key={song.id}
                className="rounded-3xl border border-white/10 bg-white/[0.02] backdrop-blur-md hover:bg-white/[0.03] transition p-3"
              >
                <div className="flex gap-3">
                  <div className="relative shrink-0">
                    <img
                      src={song.thumbnail}
                      alt={song.title}
                      className="w-24 h-16 object-cover rounded-2xl border border-white/10"
                    />
                    <div className="absolute -top-2 -left-2 px-2 py-1 rounded-xl text-xs font-extrabold bg-black/50 border border-white/10">
                      #{index + 1}
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm md:text-base leading-snug line-clamp-2 text-white/90">
                      {song.title}
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span className="text-xs px-2 py-1 rounded-2xl border border-white/10 bg-white/[0.02] text-white/75">
                        Requested by{" "}
                        <span className="font-semibold text-white/90">{requestedBy}</span>
                      </span>

                      {queuedBy ? (
                        <span className="text-xs px-2 py-1 rounded-2xl border border-white/10 bg-white/[0.02] text-white/55">
                          queued by {queuedBy}
                        </span>
                      ) : (
                        <span className="text-xs px-2 py-1 rounded-2xl border border-white/10 bg-white/[0.02] text-white/45">
                          queued
                        </span>
                      )}
                    </div>
                  </div>

                  {isHost && (
                    <div className="flex flex-col gap-2 shrink-0">
                      {/* Play */}
                      <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => onPlaySong?.(song)}
                        className={[
                          "inline-flex items-center justify-center gap-2",
                          "px-4 py-2 rounded-2xl border bg-transparent",
                          "text-white/85 font-semibold transition active:scale-[0.98]",
                          outlineBtn("fuchsia"),
                        ].join(" ")}
                        title="Play now"
                      >
                        <Play className="w-4 h-4" />
                        <span className="hidden sm:inline">Play</span>
                      </button>

                      {/* Reorder + delete */}
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => onMoveSongUp?.(song.id)}
                          disabled={index === 0}
                          className={[
                            "w-10 h-10 rounded-2xl border bg-white/[0.03] backdrop-blur-md",
                            "text-white/75 transition active:scale-[0.98]",
                            outlineBtn("neutral"),
                            "disabled:opacity-30 disabled:cursor-not-allowed",
                          ].join(" ")}
                          title="Move up"
                        >
                          <ArrowUp className="w-4 h-4 mx-auto" />
                        </button>

                        <button
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => onMoveSongDown?.(song.id)}
                          disabled={index === sortedQueue.length - 1}
                          className={[
                            "w-10 h-10 rounded-2xl border bg-white/[0.03] backdrop-blur-md",
                            "text-white/75 transition active:scale-[0.98]",
                            outlineBtn("neutral"),
                            "disabled:opacity-30 disabled:cursor-not-allowed",
                          ].join(" ")}
                          title="Move down"
                        >
                          <ArrowDown className="w-4 h-4 mx-auto" />
                        </button>

                        <button
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => {
                            if (window.confirm(`Remove "${song.title}" from queue?`)) {
                              onDeleteSong?.(song.id);
                            }
                          }}
                          className={[
                            "w-10 h-10 rounded-2xl border bg-transparent",
                            "text-white/80 transition active:scale-[0.98]",
                            "border-rose-500/30 hover:border-rose-400/45 hover:shadow-[0_0_14px_rgba(244,63,94,0.14)]",
                          ].join(" ")}
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4 mx-auto" />
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