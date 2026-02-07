import React from "react";

function ParticipantsList({ participants = [], currentUser }) {
  return (
    <div>
      <div className="flex items-end justify-between gap-4 mb-4">
        <div>
          <div className="text-xs tracking-widest uppercase text-white/50">
            Room
          </div>
          <h3 className="text-xl md:text-2xl font-extrabold">
            Participants{" "}
            <span className="text-white/60 font-semibold">({participants.length})</span>
          </h3>
        </div>

        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-black/30 text-xs text-white/70">
          <span className="w-2 h-2 rounded-full bg-indigo-400 shadow-[0_0_18px_rgba(99,102,241,0.8)]" />
          Live
        </div>
      </div>

      <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
        {participants.map((participant) => {
          const name = participant?.name || "Anonymous Legend";
          const isYou = currentUser?.name && name === currentUser.name;

          return (
            <div
              key={name}
              className="rounded-2xl border border-white/10 bg-black/25 p-3 flex items-center justify-between"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-full border border-white/10 bg-[linear-gradient(135deg,rgba(255,42,161,0.35),rgba(124,58,237,0.35))] flex items-center justify-center font-extrabold shadow-[0_0_24px_rgba(255,0,153,0.12)]">
                  {name.charAt(0).toUpperCase()}
                </div>

                <div className="min-w-0">
                  <div className="font-bold truncate">{name}</div>
                  <div className="text-xs text-white/50 truncate">
                    {isYou ? "You (main character energy)" : "In the room"}
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
        })}
      </div>
    </div>
  );
}

export default ParticipantsList;