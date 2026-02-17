import { BookOpen, ChevronLeft, ChevronRight } from "lucide-react";
import MEETING_READINGS from "../utils/meetingReadings";

/**
 * MeetingDisplay — shows the currently selected reading in the center area.
 *
 * Props:
 *  - activeReadingId : string | null  (Firebase-synced, so participants see the same one)
 *  - isHost          : boolean
 *  - onSelectReading : (id: string) => void   (host only — writes to Firebase)
 */
export default function MeetingDisplay({ activeReadingId, isHost, onSelectReading }) {
  const activeReading = MEETING_READINGS.find((r) => r.id === activeReadingId) || null;
  const activeIndex = activeReading ? MEETING_READINGS.indexOf(activeReading) : -1;

  const hasPrev = activeIndex > 0;
  const hasNext = activeIndex < MEETING_READINGS.length - 1;

  const handlePrev = () => {
    if (hasPrev) onSelectReading(MEETING_READINGS[activeIndex - 1].id);
  };
  const handleNext = () => {
    if (hasNext) onSelectReading(MEETING_READINGS[activeIndex + 1].id);
  };

  // ── No reading selected ──
  if (!activeReading) {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/[0.03] backdrop-blur-md shadow-lg p-8">
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto rounded-3xl border border-white/10 bg-white/[0.03] flex items-center justify-center">
            <BookOpen className="w-8 h-8 text-white/50" />
          </div>
          <div className="mt-4 text-lg font-bold text-white/80">No reading selected</div>
          <div className="mt-1 text-sm text-white/45">
            {isHost
              ? "Choose a reading from the list to display it here."
              : "Waiting for the host to select a reading."}
          </div>
        </div>
      </div>
    );
  }

  // ── Active reading ──
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.03] backdrop-blur-md shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
        <div className="flex items-center gap-3 min-w-0">
          <BookOpen className="w-5 h-5 text-fuchsia-400/80 flex-shrink-0" />
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-widest text-white/40">Reading</div>
            <h2 className="text-lg font-bold text-white/90 truncate">{activeReading.title}</h2>
          </div>
        </div>

        {/* Prev / Next (host only) */}
        {isHost && (
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={handlePrev}
              disabled={!hasPrev}
              className="w-9 h-9 rounded-xl border border-white/10 bg-white/[0.03] text-white/70 disabled:opacity-30 disabled:cursor-not-allowed hover:border-white/20 transition active:scale-[0.98] flex items-center justify-center"
              title="Previous reading"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs text-white/40 tabular-nums">
              {activeIndex + 1}/{MEETING_READINGS.length}
            </span>
            <button
              onClick={handleNext}
              disabled={!hasNext}
              className="w-9 h-9 rounded-xl border border-white/10 bg-white/[0.03] text-white/70 disabled:opacity-30 disabled:cursor-not-allowed hover:border-white/20 transition active:scale-[0.98] flex items-center justify-center"
              title="Next reading"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Body */}
      <div
        className="px-6 py-6 overflow-y-auto text-white/80 text-sm sm:text-base leading-relaxed whitespace-pre-wrap"
        style={{ maxHeight: "60vh" }}
      >
        {activeReading.body || (
          <div className="text-white/40 italic text-center py-8">
            Reading content will be added here.
          </div>
        )}
      </div>
    </div>
  );
}
