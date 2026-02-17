import { BookOpen, ChevronLeft, ChevronRight, Video } from "lucide-react";
import HostCameraPreview from "./HostCameraPreview";
import MEETING_READINGS from "../utils/meetingReadings";

/**
 * MeetingDisplay — center area for meeting mode.
 *
 * Default: shows the host camera feed.
 * When a reading is selected: shows it as a full slide.
 *
 * Props:
 *  - activeReadingId : string | null
 *  - isHost          : boolean
 *  - onSelectReading : (id: string | null) => void
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

  // ── No reading selected → show host camera ──
  if (!activeReading) {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/[0.03] backdrop-blur-md shadow-lg overflow-hidden">
        <div className="aspect-video bg-black/40 relative">
          <HostCameraPreview isHost={isHost} />
        </div>

        <div className="px-6 py-4 border-t border-white/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-white/55">
              <Video className="w-4 h-4 text-white/50" />
              <span>Host Camera</span>
            </div>
            <div className="text-xs text-white/35">
              {isHost
                ? "Select a reading from the list to display it."
                : "Waiting for the host to select a reading."}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Active reading → slide view ──
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.03] backdrop-blur-md shadow-lg overflow-hidden">
      {/* Slide header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
        <div className="flex items-center gap-3 min-w-0">
          <BookOpen className="w-5 h-5 text-fuchsia-400/80 flex-shrink-0" />
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-widest text-white/40">
              Reading {activeIndex + 1} of {MEETING_READINGS.length}
            </div>
            <h2 className="text-lg font-bold text-white/90 truncate">{activeReading.title}</h2>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Back to camera (host only) */}
          {isHost && (
            <button
              onClick={() => onSelectReading(null)}
              className="flex items-center gap-1.5 rounded-xl px-3 py-2 border border-white/10 bg-white/[0.03] text-white/70 hover:border-white/20 hover:text-white/90 transition active:scale-[0.98] text-xs font-medium"
              title="Back to camera"
            >
              <Video className="w-3.5 h-3.5" />
              Camera
            </button>
          )}

          {/* Prev / Next (host only) */}
          {isHost && (
            <>
              <button
                onClick={handlePrev}
                disabled={!hasPrev}
                className="w-9 h-9 rounded-xl border border-white/10 bg-white/[0.03] text-white/70 disabled:opacity-30 disabled:cursor-not-allowed hover:border-white/20 transition active:scale-[0.98] flex items-center justify-center"
                title="Previous reading"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={handleNext}
                disabled={!hasNext}
                className="w-9 h-9 rounded-xl border border-white/10 bg-white/[0.03] text-white/70 disabled:opacity-30 disabled:cursor-not-allowed hover:border-white/20 transition active:scale-[0.98] flex items-center justify-center"
                title="Next reading"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Slide body */}
      <div className="aspect-video flex items-center justify-center p-8 sm:p-12">
        {activeReading.body ? (
          <div className="w-full max-w-3xl mx-auto text-center space-y-6">
            <h3 className="text-2xl sm:text-3xl md:text-4xl font-extrabold leading-tight">
              <span className="bg-clip-text text-transparent bg-[linear-gradient(90deg,#ff3aa7,#9b7bff,#ffd24a)]">
                {activeReading.title}
              </span>
            </h3>
            <div className="text-base sm:text-lg md:text-xl text-white/80 leading-relaxed whitespace-pre-wrap">
              {activeReading.body}
            </div>
          </div>
        ) : (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-3xl border border-white/10 bg-white/[0.03] flex items-center justify-center">
              <BookOpen className="w-8 h-8 text-fuchsia-400/60" />
            </div>
            <h3 className="text-2xl sm:text-3xl font-extrabold">
              <span className="bg-clip-text text-transparent bg-[linear-gradient(90deg,#ff3aa7,#9b7bff,#ffd24a)]">
                {activeReading.title}
              </span>
            </h3>
            <p className="text-sm text-white/40 italic">Reading content will be added here.</p>
          </div>
        )}
      </div>
    </div>
  );
}
