import React, { useMemo } from "react";
import { useParticipants } from "@livekit/components-react";
import { Users } from "lucide-react";

function ParticipantsList({ currentUser }) {
  const liveKitParticipants = useParticipants();

  const normalized = useMemo(() => {
    const list = Array.isArray(liveKitParticipants) ? liveKitParticipants : [];

    const mapped = list.map((p, idx) => {
      const name = String(p?.name || p?.identity || `Guest ${idx + 1}`).trim();
      const id = String(p?.identity || p?.sid || `p-${idx}-${name}`);
      return { id, name, participant: p };
    });

    // remove duplicates by ID first, then by name
    const seenIds = new Set();
    const seenNames = new Set();
    return mapped.filter((x) => {
      if (seenIds.has(x.id)) return false;

      if (x.name !== "Guest" && seenNames.has(x.name.toLowerCase())) return false;

      seenIds.add(x.id);
      seenNames.add(x.name.toLowerCase());
      return true;
    });
  }, [liveKitParticipants]);

  const youName = String(currentUser?.name || "").trim();
  const youId = String(currentUser?.id || currentUser?.identity || "").trim();
  const count = normalized.length || (youName ? 1 : 0);

  return (
    <div>
      <div className="flex items-end justify-between gap-4 mb-4">
        <div>
          <div className="text-xs tracking-widest uppercase text-white/45">Room</div>
          <h3 className="text-xl md:text-2xl font-semibold text-white/90">
            Participants{" "}
            <span className="text-white/50 font-medium">({count})</span>
          </h3>
        </div>

        {/* Subtle status (no pill, no glow) */}
        <div className="inline-flex items-center gap-2 text-xs text-white/50">
          <span className="w-1.5 h-1.5 rounded-full bg-white/40" />
          Live
        </div>
      </div>

      <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
        {normalized.length === 0 && youName ? (
          <div className="rounded-3xl border border-white/10 bg-white/[0.03] backdrop-blur-md shadow-lg p-3 flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              {/* Avatar (no gradients) */}
              <div className="w-9 h-9 rounded-2xl border border-white/10 bg-white/[0.02] flex items-center justify-center font-semibold text-white/85">
                {youName.charAt(0).toUpperCase()}
              </div>

              <div className="min-w-0">
                <div className="font-semibold text-white/90 truncate">{youName}</div>
                <div className="text-xs text-white/50">You</div>
              </div>
            </div>

            <div className="inline-flex items-center gap-2 text-xs text-white/45">
              <Users className="w-4 h-4" />
              <span>1</span>
            </div>
          </div>
        ) : (
          normalized.map((p) => {
            const isYou = (youId && p.id === youId) || (youName && p.name === youName);

            return (
              <div
                key={p.id}
                className="rounded-3xl border border-white/10 bg-white/[0.03] backdrop-blur-md shadow-lg p-3 flex items-center justify-between"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-2xl border border-white/10 bg-white/[0.02] flex items-center justify-center font-semibold text-white/85">
                    {p.name.charAt(0).toUpperCase()}
                  </div>

                  <div className="min-w-0">
                    <div className="font-semibold text-white/90 truncate">{p.name}</div>
                    <div className="text-xs text-white/50">
                      {isYou ? "You" : "In the room"}
                    </div>
                  </div>
                </div>

                {isYou && (
                  <span className="text-xs px-3 py-1.5 rounded-2xl border border-fuchsia-500/25 text-white/80 bg-transparent">
                    You
                  </span>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default ParticipantsList;