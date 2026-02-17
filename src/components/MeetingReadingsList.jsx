import React from "react";
import meetingReadings from "./meetingReadings";

/**
 * Props:
 * - activeReadingId: string | null   (stored as "topicId|slideIndex" or "topicId")
 * - setActiveReadingId: (val: string | null) => void
 */
export default function MeetingReadingsList({ activeReadingId, setActiveReadingId }) {
  const activeTopicId = (activeReadingId || "").split("|")[0] || null;

  const onSelectTopic = (topicId) => {
    // toggle off if same topic currently selected
    if (activeTopicId === topicId) {
      setActiveReadingId(null);
      return;
    }
    // default to slide 0 when selecting
    setActiveReadingId(`${topicId}|0`);
  };

  return (
    <div className="space-y-2">
      {meetingReadings.map((r) => {
        const isActive = activeTopicId === r.id;

        return (
          <button
            key={r.id}
            onClick={() => onSelectTopic(r.id)}
            className={`w-full text-left rounded-xl px-4 py-3 border transition
              ${isActive ? "border-white/30 bg-white/10" : "border-white/10 bg-white/5 hover:bg-white/10"}`}
          >
            <div className="font-semibold">{r.title}</div>
          </button>
        );
      })}
    </div>
  );
}