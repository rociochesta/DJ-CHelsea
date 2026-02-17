import { BookOpen, Check } from "lucide-react";
import MEETING_READINGS from "../utils/meetingReadings";

/**
 * MeetingReadingsList — scrollable sidebar list for the host to pick a reading.
 *
 * Props:
 *  - activeReadingId  : string | null
 *  - onSelectReading  : (id: string) => void
 */
export default function MeetingReadingsList({ activeReadingId, onSelectReading }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.03] backdrop-blur-md shadow-lg overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-white/10">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-white/60" />
          <h3 className="font-semibold text-white/85">Meeting Readings</h3>
          <span className="text-xs text-white/40 ml-auto">{MEETING_READINGS.length}</span>
        </div>
      </div>

      {/* List */}
      <div
        className="overflow-y-auto divide-y divide-white/[0.06]"
        style={{ maxHeight: "28rem" }}
      >
        {MEETING_READINGS.map((reading, idx) => {
          const isActive = reading.id === activeReadingId;
          return (
            <button
              key={reading.id}
              onClick={() => onSelectReading(reading.id)}
              className={[
                "w-full text-left px-5 py-4 transition",
                "hover:bg-white/[0.03] active:scale-[0.995]",
                isActive
                  ? "bg-fuchsia-500/[0.06] border-l-2 border-l-fuchsia-400"
                  : "border-l-2 border-l-transparent",
              ].join(" ")}
            >
              <div className="flex items-center gap-3">
                <div
                  className={[
                    "w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0",
                    isActive
                      ? "bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/30"
                      : "bg-white/[0.04] text-white/50 border border-white/10",
                  ].join(" ")}
                >
                  {isActive ? <Check className="w-3.5 h-3.5" /> : idx + 1}
                </div>
                <span
                  className={[
                    "text-sm font-medium truncate",
                    isActive ? "text-fuchsia-300" : "text-white/75",
                  ].join(" ")}
                >
                  {reading.title}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
