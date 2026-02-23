import { useEffect, useMemo, useState } from "react";
import { useParticipants } from "@livekit/components-react";
import { database, ref, onValue } from "../utils/firebase";
import { Users } from "lucide-react";

// ─── TEST ONLY ────────────────────────────────────────────────────────────────
// The useEffect below that reads `naMembers` from Firebase is TEST DATA.
// Remove the naMembers useEffect + fakeNormalized merge when going to production.
// ──────────────────────────────────────────────────────────────────────────────

function ParticipantsList({ currentUser, roomCode }) {
  const liveKitParticipants = useParticipants();

  // ── TEST ONLY: fake NA members from Firebase ──────────────────────────────
  const [naMembers, setNaMembers] = useState([]);
  useEffect(() => {
    if (!roomCode) return;
    const membersRef = ref(database, `karaoke-rooms/${roomCode}/naMembers`);
    return onValue(membersRef, (snap) => {
      const data = snap.val() || {};
      setNaMembers(Object.values(data).filter((m) => m.active));
    });
  }, [roomCode]);
  // ── END TEST ONLY ──────────────────────────────────────────────────────────

  // Real LiveKit participants — normalized
  const normalized = useMemo(() => {
    const list = Array.isArray(liveKitParticipants) ? liveKitParticipants : [];

    const mapped = list.map((p, idx) => {
      const name = String(p?.name || p?.identity || `Guest ${idx + 1}`).trim();
      const id = String(p?.identity || p?.sid || `p-${idx}-${name}`);
      // avatar may be embedded in LiveKit metadata, fallback to first letter placeholder
      const avatar = null; // real avatar comes from Firebase participant entry
      return { id, name, avatar, isReal: true, participant: p };
    });

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

  // ── TEST ONLY: merge fake members into display list ───────────────────────
  const fakeNormalized = useMemo(() => {
    const realNames = new Set(normalized.map((p) => p.name.toLowerCase()));
    return naMembers
      .filter((m) => !realNames.has(m.nickname.toLowerCase()))
      .map((m) => ({
        id: `na-${m.nickname}`,
        name: m.nickname,
        avatar: m.avatar || "🎵",
        group: m.group || "",
        isReal: false,
      }));
  }, [naMembers, normalized]);
  // ── END TEST ONLY ──────────────────────────────────────────────────────────

  const allParticipants = useMemo(
    () => [...normalized, ...fakeNormalized],
    [normalized, fakeNormalized]
  );

  const youName = String(currentUser?.name || "").trim();
  const youId   = String(currentUser?.id || currentUser?.identity || "").trim();
  const youAvatar = currentUser?.avatar || null;
  const count   = allParticipants.length || (youName ? 1 : 0);

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

        <div className="inline-flex items-center gap-2 text-xs text-white/50">
          <span className="w-1.5 h-1.5 rounded-full bg-white/40" />
          Live
        </div>
      </div>

      <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
        {allParticipants.length === 0 && youName ? (
          <div className="rounded-3xl border border-white/10 bg-white/[0.03] backdrop-blur-md shadow-lg p-3 flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-2xl border border-white/10 bg-white/[0.02] flex items-center justify-center text-lg">
                {youAvatar || youName.charAt(0).toUpperCase()}
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
          allParticipants.map((p) => {
            const isYou = (youId && p.id === youId) || (youName && p.name === youName);

            return (
              <div
                key={p.id}
                className="rounded-3xl border border-white/10 bg-white/[0.03] backdrop-blur-md shadow-lg p-3 flex items-center justify-between"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {/* Emoji avatar for fakes / real if available, letter initial fallback */}
                  <div className="w-9 h-9 rounded-2xl border border-white/10 bg-white/[0.02] flex items-center justify-center text-lg font-semibold text-white/85">
                    {p.avatar
                      ? p.avatar
                      : isYou && youAvatar
                      ? youAvatar
                      : p.name.charAt(0).toUpperCase()}
                  </div>

                  <div className="min-w-0">
                    <div className="font-semibold text-white/90 truncate">{p.name}</div>
                    <div className="text-xs text-white/50">
                      {isYou ? "You" : p.group ? p.group : "In the room"}
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
