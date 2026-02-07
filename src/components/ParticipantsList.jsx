import React, { useMemo } from "react";
import { useParticipants } from "@livekit/components-react";

function ParticipantsList({ currentUser }) {
  const liveKitParticipants = useParticipants();

  const normalized = useMemo(() => {
    const list = Array.isArray(liveKitParticipants) ? liveKitParticipants : [];

    const mapped = list.map((p, idx) => {
      const name = String(p?.name || p?.identity || `Guest ${idx + 1}`).trim();
      const id = String(p?.identity || p?.sid || `p-${idx}-${name}`);
      return { id, name };
    });

    // remove duplicates
    const seen = new Set();
    return mapped.filter((x) => {
      if (seen.has(x.id)) return false;
      seen.add(x.id);
      return true;
    });
  }, [liveKitParticipants]);

  const youName = String(currentUser?.name || "").trim();
  const youId = String(currentUser?.id || currentUser?.identity || "").trim(); // ✅ better match
  const count = normalized.length || (youName ? 1 : 0);

  return (
    <div>
      <div className="flex items-end justify-between gap-4 mb-4">
        <div>
          <div className="text-xs tracking-widest uppercase text-white/50">Room</div>
          <h3 className="text-xl md:text-2xl font-extrabold">
            Participants <span className="text-white/60 font-semibold">({count})</span>
          </h3>
        </div>

        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-black/30 text-xs text-white/70">
          <span className="w-2 h-2 rounded-full bg-indigo-400 shadow-[0_0_18px_rgba(99,102,241,0.8)]" />
          Live
        </div>
      </div>

      <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
        {normalized.length === 0 && youName ? (
          <div className="rounded-2xl border border-white/10 bg-black/25 p-3 flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-full border border-white/10 bg-gradient-to-br from-fuchsia-500/40 to-indigo-500/40 flex items-center justify-center font-extrabold">
                {youName.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="font-bold">{youName}</div>
                <div className="text-xs text-white/50">You (alone but iconic)</div>
              </div>
            </div>
          </div>
        ) : (
          normalized.map((p) => {
            const isYou =
              (youId && p.id === youId) || (youName && p.name === youName); // ✅ safer

            return (
              <div
                key={p.id}
                className="rounded-2xl border border-white/10 bg-black/25 p-3 flex items-center justify-between"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-full border border-white/10 bg-gradient-to-br from-fuchsia-500/40 to-indigo-500/40 flex items-center justify-center font-extrabold">
                    {p.name.charAt(0).toUpperCase()}
                  </div>

                  <div className="min-w-0">
                    <div className="font-bold truncate">{p.name}</div>
                    <div className="text-xs text-white/50">
                      {isYou ? "You" : "In the room"}
                    </div>
                  </div>
                </div>

                {isYou && (
                  <span className="text-xs px-2 py-1 rounded-full border border-white/10 bg-white/10">
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