// src/components/NAProfiles.jsx
//
// Displays the live panel of fake NA members currently in the room.
// Works together with NASimulator.jsx which writes the data to Firebase.
//
// USAGE in HostView.jsx / ParticipantView.jsx:
//   import NAProfiles from "./NAProfiles";
//   <NAProfiles roomCode={roomCode} />

import React, { useEffect, useState } from "react";
import { database, ref, onValue } from "../utils/firebase";

const GRADIENTS = [
  "from-orange-500/25 to-red-600/25",
  "from-blue-500/25 to-cyan-500/25",
  "from-yellow-500/25 to-amber-600/25",
  "from-green-500/25 to-emerald-600/25",
  "from-pink-500/25 to-rose-500/25",
  "from-purple-500/25 to-fuchsia-500/25",
  "from-red-500/25 to-pink-600/25",
  "from-teal-500/25 to-cyan-600/25",
  "from-indigo-500/25 to-blue-600/25",
];

function grad(nickname) {
  return GRADIENTS[nickname.charCodeAt(0) % GRADIENTS.length];
}

// "joined 3 min ago" style label
function timeAgo(ts) {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60)  return "just joined";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

function ProfileCard({ member, lastSong }) {
  return (
    <div
      className={`rounded-2xl border border-white/10 bg-gradient-to-br ${grad(member.nickname)} p-3 flex items-center gap-3 transition-all duration-500`}
    >
      {/* Avatar */}
      <div className="w-10 h-10 rounded-full border border-white/20 bg-black/30 flex items-center justify-center text-xl shrink-0 select-none">
        {member.avatar}
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-extrabold text-sm leading-tight">{member.nickname}</span>
          <span className="text-[10px] text-white/40">{timeAgo(member.joinedAt)}</span>
        </div>
        <div className="text-[11px] text-white/50 truncate">{member.group}</div>
        {lastSong && (
          <div className="mt-0.5 text-[11px] text-fuchsia-300 truncate">
            🎵 {lastSong}
          </div>
        )}
      </div>

      {/* Live pulse */}
      <div
        className="w-2 h-2 rounded-full bg-fuchsia-400 shrink-0"
        style={{
          boxShadow: "0 0 10px rgba(232,121,249,0.9)",
          animation: "pulseGlow 1.8s ease-in-out infinite",
        }}
      />
    </div>
  );
}

export default function NAProfiles({ roomCode }) {
  const [members, setMembers]   = useState([]);  // active members
  const [songMap, setSongMap]   = useState({});   // nickname → last requested song title

  // Listen to naMembers node
  useEffect(() => {
    if (!roomCode) return;
    const membersRef = ref(database, `karaoke-rooms/${roomCode}/naMembers`);
    return onValue(membersRef, (snap) => {
      const data = snap.val() || {};
      const active = Object.values(data)
        .filter((m) => m.active)
        .sort((a, b) => (a.joinedAt || 0) - (b.joinedAt || 0));
      setMembers(active);
    });
  }, [roomCode]);

  // Listen to queue to extract last song per nickname
  useEffect(() => {
    if (!roomCode) return;
    const queueRef = ref(database, `karaoke-rooms/${roomCode}/queue`);
    return onValue(queueRef, (snap) => {
      const data = snap.val() || {};
      const map  = {};
      Object.values(data)
        .filter((s) => s.isNASeed && s.requestedBy && s.title)
        .sort((a, b) => (a.addedAt || 0) - (b.addedAt || 0))
        .forEach((s) => { map[s.requestedBy] = s.title; });
      setSongMap(map);
    });
  }, [roomCode]);

  if (members.length === 0) return null;

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-xl p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-xs tracking-widest uppercase text-white/50">In The Room</div>
          <h3 className="text-lg font-extrabold">
            NA Members{" "}
            <span className="text-white/50 font-semibold">({members.length})</span>
          </h3>
        </div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-black/30 text-xs text-white/70">
          <span
            className="w-2 h-2 rounded-full bg-green-400"
            style={{ boxShadow: "0 0 8px rgba(74,222,128,0.9)" }}
          />
          Live
        </div>
      </div>

      {/* Cards */}
      <div className="space-y-2">
        {members.map((m) => (
          <ProfileCard key={m.nickname} member={m} lastSong={songMap[m.nickname]} />
        ))}
      </div>
    </div>
  );
}