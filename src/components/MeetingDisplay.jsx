import { BookOpen, ChevronLeft, ChevronRight, Video } from "lucide-react";
import HostCameraPreview from "./HostCameraPreview";
import MEETING_READINGS from "../utils/meetingReadings.jsx";

const parseReadingKey = (key) => {
  if (!key) return { topicId: null, slideIndex: 0 };
  const [topicId, rawIndex] = String(key).split("|");
  const idx = Number.isFinite(Number(rawIndex)) ? parseInt(rawIndex, 10) : 0;
  return { topicId, slideIndex: Math.max(0, idx) };
};

export default function MeetingDisplay({
  activeReadingId,
  isHost,
  onSelectReading,     // new name
  setActiveReadingId,  // old name (fallback)
}) {
  const selectReading =
    typeof onSelectReading === "function"
      ? onSelectReading
      : typeof setActiveReadingId === "function"
      ? setActiveReadingId
      : null;

  const { topicId, slideIndex } = parseReadingKey(activeReadingId);
  const activeReading = MEETING_READINGS.find((r) => r.id === topicId) || null;

  const slides = activeReading
    ? Array.isArray(activeReading.slides) && activeReading.slides.length > 0
      ? activeReading.slides
      : activeReading.slide
      ? [activeReading.slide]
      : []
    : [];

  const safeSlideIndex = Math.min(Math.max(0, slideIndex), Math.max(0, slides.length - 1));
  const currentSlide = slides[safeSlideIndex] || null;

  const hasPrevSlide = safeSlideIndex > 0;
  const hasNextSlide = safeSlideIndex < slides.length - 1;

  const goPrev = () => {
    if (!selectReading || !activeReading || !hasPrevSlide) return;
    selectReading(`${activeReading.id}|${safeSlideIndex - 1}`);
  };

  const goNext = () => {
    if (!selectReading || !activeReading || !hasNextSlide) return;
    selectReading(`${activeReading.id}|${safeSlideIndex + 1}`);
  };

  // No reading selected → show camera card
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
              {isHost ? "Select a reading from the list to display it." : "Waiting for the host to select a reading."}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Reading selected → slide view
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.03] backdrop-blur-md shadow-lg overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
        <div className="flex items-center gap-3 min-w-0">
          <BookOpen className="w-5 h-5 text-fuchsia-400/80 flex-shrink-0" />
          <h2 className="text-lg font-bold text-white/90 truncate">{activeReading.title}</h2>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {isHost && (
            <button
              onClick={() => selectReading && selectReading(null)}
              className="flex items-center gap-1.5 rounded-xl px-3 py-2 border border-white/10 bg-white/[0.03] text-white/70 hover:border-white/20 hover:text-white/90 transition active:scale-[0.98] text-xs font-medium"
              title="Back to camera"
            >
              <Video className="w-3.5 h-3.5" />
              Camera
            </button>
          )}

          {isHost && slides.length > 1 && (
            <>
              <button
                onClick={goPrev}
                disabled={!hasPrevSlide}
                className="w-9 h-9 rounded-xl border border-white/10 bg-white/[0.03] text-white/70 disabled:opacity-30 disabled:cursor-not-allowed hover:border-white/20 transition active:scale-[0.98] flex items-center justify-center"
                title="Previous slide"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <button
                onClick={goNext}
                disabled={!hasNextSlide}
                className="w-9 h-9 rounded-xl border border-white/10 bg-white/[0.03] text-white/70 disabled:opacity-30 disabled:cursor-not-allowed hover:border-white/20 transition active:scale-[0.98] flex items-center justify-center"
                title="Next slide"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>

      <div className="bg-black/30">
        {currentSlide ? (
          <img
            src={currentSlide}
            alt={activeReading.title}
            className="w-full h-auto max-h-[70vh] object-contain mx-auto"
            draggable={false}
          />
        ) : (
          <div className="aspect-video flex items-center justify-center text-white/45 text-sm">
            No slide found for this reading.
          </div>
        )}
      </div>
    </div>
  );
}