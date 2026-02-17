import React, { useMemo } from "react";
import meetingReadings from "./meetingReadings";

/**
 * Props:
 * - activeReadingId: string | null   // "topicId|slideIndex" or "topicId" or null
 * - setActiveReadingId: (val: string | null) => void
 * - isHost?: boolean                 // only host can change slides (optional)
 */
export default function MeetingDisplay({
  activeReadingId,
  setActiveReadingId,
  isHost = true,
}) {
  const { topic, slideIndex } = useMemo(() => {
    if (!activeReadingId) return { topic: null, slideIndex: 0 };

    const [topicId, rawIndex] = String(activeReadingId).split("|");
    const idx = Number.isFinite(Number(rawIndex)) ? Math.max(0, parseInt(rawIndex, 10)) : 0;

    const found = meetingReadings.find((r) => r.id === topicId) || null;
    return { topic: found, slideIndex: idx };
  }, [activeReadingId]);

  const slides = topic?.slides || [];
  const safeIndex = Math.min(slideIndex, Math.max(0, slides.length - 1));
  const slideSrc = slides[safeIndex] || null;

  const canGoPrev = isHost && topic && safeIndex > 0;
  const canGoNext = isHost && topic && safeIndex < slides.length - 1;

  const goPrev = () => {
    if (!topic) return;
    const next = `${topic.id}|${Math.max(0, safeIndex - 1)}`;
    setActiveReadingId(next);
  };

  const goNext = () => {
    if (!topic) return;
    const next = `${topic.id}|${Math.min(slides.length - 1, safeIndex + 1)}`;
    setActiveReadingId(next);
  };

  if (!topic) {
    return (
      <div className="w-full h-full flex items-center justify-center rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl p-10">
        <div className="text-white/70 text-center">
          <div className="text-xl font-semibold text-white/80">No reading selected</div>
          <div className="mt-2">Pick a topic to display the slide.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl p-6 flex flex-col">
      {/* Title row */}
      <div className="flex items-center justify-between gap-4 mb-4">
        <div className="text-white/90 font-semibold text-lg">{topic.title}</div>

        {/* Host-only controls (no slide number shown) */}
        {isHost && slides.length > 1 && (
          <div className="flex items-center gap-2">
            <button
              onClick={goPrev}
              disabled={!canGoPrev}
              className={`px-3 py-2 rounded-xl border transition
                ${canGoPrev ? "border-white/20 bg-white/10 hover:bg-white/15" : "border-white/10 bg-white/5 opacity-40 cursor-not-allowed"}`}
            >
              Prev
            </button>
            <button
              onClick={goNext}
              disabled={!canGoNext}
              className={`px-3 py-2 rounded-xl border transition
                ${canGoNext ? "border-white/20 bg-white/10 hover:bg-white/15" : "border-white/10 bg-white/5 opacity-40 cursor-not-allowed"}`}
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* Slide */}
      <div className="flex-1 flex items-center justify-center">
        {slideSrc ? (
          <img
            src={slideSrc}
            alt={topic.title}
            className="max-h-full max-w-full object-contain rounded-2xl"
            draggable={false}
          />
        ) : (
          <div className="text-white/70 text-center">
            <div className="text-lg font-semibold text-white/80">No slide found</div>
            <div className="mt-2">Add PNG paths to <code className="text-white/90">slides: []</code> for this topic.</div>
          </div>
        )}
      </div>
    </div>
  );
}