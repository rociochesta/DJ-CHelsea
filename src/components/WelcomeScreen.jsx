import React, { useState } from "react";

function WelcomeScreen({ onCreateRoom, onJoinRoom }) {
  const [mode, setMode] = useState(null); // null, 'join'
  const [roomCode, setRoomCode] = useState("");
  const [userName, setUserName] = useState("");

  const [adminName, setAdminName] = useState("");
  const [adminPass, setAdminPass] = useState("");
  const [adminUnlocked, setAdminUnlocked] = useState(false);

  const handleJoinSubmit = (e) => {
    e.preventDefault();
    if (roomCode.length === 6 && userName.trim()) {
      onJoinRoom(roomCode, userName.trim());
    }
  };

  // ✅ TEST MODE: any non-empty DJ name + EMPTY password unlocks DJ mode
  // also pre-fills userName so host uses that DJ name when creating room
  const handleAdminLogin = (e) => {
    e?.preventDefault?.();

    const dj = adminName.trim();
    const passIsEmpty = adminPass.trim() === "";

    if (dj && passIsEmpty) {
      setAdminUnlocked(true);

      // ✅ make Create Room use this name (since App uses stored/entered names)
      setUserName(dj);

      setAdminName("");
      setAdminPass("");
    } else {
      alert("Type a DJ name and leave password empty (test mode).");
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden text-white">
      {/* Background */}
      <div className="absolute inset-0 bg-[#070712]" />
      <div className="absolute -top-40 -left-40 w-[520px] h-[520px] rounded-full blur-3xl opacity-50 bg-fuchsia-600" />
      <div className="absolute -bottom-56 -right-56 w-[640px] h-[640px] rounded-full blur-3xl opacity-50 bg-indigo-600" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,0,153,0.18),transparent_55%),radial-gradient(ellipse_at_bottom,rgba(99,102,241,0.18),transparent_55%)]" />

      {/* Local keyframes (no Tailwind config needed) */}
      <style>{`
        @keyframes sweep {
          0%   { transform: translateX(-120%); opacity: 0; }
          10%  { opacity: 0.8; }
          50%  { opacity: 0.8; }
          90%  { opacity: 0.6; }
          100% { transform: translateX(120%); opacity: 0; }
        }
        @keyframes spinSlow {
          0% { transform: translate(-50%, -50%) rotate(0deg); }
          100% { transform: translate(-50%, -50%) rotate(360deg); }
        }
        @keyframes pulseGlow {
          0%,100% { opacity: .75; }
          50% { opacity: 1; }
        }
      `}</style>

      <div className="relative min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-5xl">
          <div className="rounded-3xl overflow-hidden border border-white/10 shadow-2xl bg-white/5 backdrop-blur-xl">
            {/* Banner (taller) */}
            <div className="relative h-44 md:h-60 overflow-hidden">
              <video
                className="absolute inset-0 w-full h-full object-cover"
                src="/dj_chelsea_banner.mp4"
                autoPlay
                loop
                muted
                playsInline
              />

              {/* Auto-darken where text sits (left heavy) */}
              <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(0,0,0,0.78)_0%,rgba(0,0,0,0.46)_44%,rgba(0,0,0,0.18)_100%)]" />
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,0,153,0.18),transparent_60%),radial-gradient(ellipse_at_bottom,rgba(99,102,241,0.14),transparent_60%)]" />

              {/* Moving light sweep */}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background:
                    "linear-gradient(120deg, transparent 0%, rgba(255,255,255,0.18) 45%, rgba(255,0,153,0.10) 55%, transparent 100%)",
                  mixBlendMode: "screen",
                  animation: "sweep 3.8s ease-in-out infinite",
                }}
              />

              {/* Vinyl glow rotation */}
              <div
                className="absolute right-10 md:right-14 top-1/2 pointer-events-none"
                style={{
                  width: 120,
                  height: 120,
                  borderRadius: "9999px",
                  background:
                    "conic-gradient(from 0deg, rgba(255,0,153,0.0), rgba(255,0,153,0.35), rgba(99,102,241,0.30), rgba(255,210,74,0.25), rgba(255,0,153,0.0))",
                  opacity: 0.55,
                  animation: "spinSlow 2.8s linear infinite",
                  transform: "translate(-50%, -50%)",
                }}
              />
              <div
                className="absolute right-10 md:right-14 top-1/2 pointer-events-none"
                style={{
                  width: 92,
                  height: 92,
                  borderRadius: "9999px",
                  border: "1px solid rgba(255,255,255,0.10)",
                  boxShadow: "0 0 40px rgba(255,0,153,0.16)",
                  transform: "translate(-50%, -50%)",
                }}
              />

              {/* NOW SPINNING badge */}
              <div className="absolute left-5 md:left-7 top-4 md:top-5">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-black/35 text-[11px] tracking-widest uppercase">
                  <span
                    className="w-2 h-2 rounded-full bg-fuchsia-400"
                    style={{
                      boxShadow: "0 0 18px rgba(232,121,249,0.95)",
                      animation: "pulseGlow 1.6s ease-in-out infinite",
                    }}
                  />
                  NOW SPINNING
                </div>
              </div>

              <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-white/10" />
            </div>

            <div className="p-6 md:p-10">
              <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-black/30 text-xs tracking-widest uppercase">
                    <span className="w-2 h-2 rounded-full bg-fuchsia-400 shadow-[0_0_18px_rgba(232,121,249,0.8)]" />
                    Saturday Night • NA DJ Mode
                  </div>

                  <h1 className="mt-4 text-4xl md:text-6xl font-extrabold leading-tight">
                    <span className="bg-clip-text text-transparent bg-[linear-gradient(90deg,#ff3aa7,#9b7bff,#ffd24a)] drop-shadow-[0_6px_20px_rgba(255,0,153,0.25)]">
                      DJ CHELSEA NA
                    </span>
                  </h1>

                  <p className="mt-3 text-white/75 text-base md:text-lg max-w-2xl">
                    Queue songs. Spin chaos. Stay anyway.
                  </p>
                </div>

                <div className="flex flex-col md:items-end gap-3">
                  {/* Admin unlock */}
                  {!adminUnlocked ? (
                    <form
                      onSubmit={handleAdminLogin}
                      className="flex gap-2 bg-black/30 border border-white/10 rounded-xl p-2 backdrop-blur-xl"
                    >
                      <input
                        type="text"
                        placeholder="DJ name"
                        value={adminName}
                        onChange={(e) => setAdminName(e.target.value)}
                        className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm w-28 focus:outline-none"
                      />
                      <input
                        type="password"
                        placeholder="leave empty"
                        value={adminPass}
                        onChange={(e) => setAdminPass(e.target.value)}
                        className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm w-28 focus:outline-none"
                      />
                      <button
                        type="submit"
                        className="px-4 py-2 rounded-lg text-xs font-bold bg-fuchsia-600/80 hover:bg-fuchsia-600"
                      >
                        Unlock DJ
                      </button>
                    </form>
                  ) : (
                    <div className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-white/10 bg-black/30 text-xs">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_18px_rgba(52,211,153,0.75)]" />
                      DJ Unlocked
                    </div>
                  )}

                  <div className="flex gap-3 flex-wrap md:justify-end">
                    <button
                      onClick={() => onCreateRoom(userName)}
                      disabled={!adminUnlocked}
                      title={!adminUnlocked ? "Unlock DJ to host" : "Create the room"}
                      className="px-6 py-3 rounded-xl font-bold bg-[linear-gradient(90deg,#ff2aa1,#7c3aed)] disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-95 active:scale-[0.99] transition shadow-[0_0_0_1px_rgba(255,255,255,0.10),0_18px_60px_rgba(255,0,153,0.20)]"
                    >
                      Create Room
                    </button>

                    <button
                      onClick={() => setMode("join")}
                      className="px-6 py-3 rounded-xl font-bold bg-white/10 hover:bg-white/15 active:scale-[0.99] transition border border-white/10"
                    >
                      Join Room
                    </button>
                  </div>
                </div>
              </div>

              {/* Join mode */}
              {mode === "join" && (
                <div className="mt-8 grid grid-cols-1 md:grid-cols-5 gap-6">
                  <div className="md:col-span-2">
                    <button onClick={() => setMode(null)} className="text-white/70 hover:text-white transition">
                      ← Back
                    </button>
                    <h2 className="mt-3 text-2xl font-bold">Join the room</h2>
                    <p className="mt-2 text-white/60">Enter your name + the 6-character code.</p>
                  </div>

                  <div className="md:col-span-3 rounded-2xl border border-white/10 bg-black/30 p-5 md:p-6 backdrop-blur-xl">
                    <form onSubmit={handleJoinSubmit} className="space-y-4">
                      <div>
                        <label className="block text-sm font-semibold text-white/80 mb-2">Your name</label>
                        <input
                          type="text"
                          value={userName}
                          onChange={(e) => setUserName(e.target.value)}
                          placeholder="Someone emotionally responsible"
                          className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 focus:outline-none focus:border-fuchsia-400/70 focus:ring-2 focus:ring-fuchsia-400/20"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-white/80 mb-2">Room code</label>
                        <input
                          type="text"
                          value={roomCode}
                          onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                          placeholder="ABC123"
                          maxLength={6}
                          className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 focus:outline-none focus:border-indigo-400/70 focus:ring-2 focus:ring-indigo-400/20 text-center text-2xl font-mono tracking-[0.35em]"
                          required
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={roomCode.length !== 6 || !userName.trim()}
                        className="w-full px-6 py-3 rounded-xl font-bold bg-[linear-gradient(90deg,#ff2aa1,#7c3aed)] disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-95 transition shadow-[0_18px_60px_rgba(124,58,237,0.18)]"
                      >
                        Join Room
                      </button>
                    </form>
                  </div>
                </div>
              )}

              {/* Bottom cards (3PM-ish) */}
              {mode !== "join" && (
                <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    { t: "Sad Song Court", d: "Bring your tragic bangers. We will judge lovingly and cry privately." },
                    { t: "Horny, but respectful", d: "Flirty tracks allowed. No inspirational speeches. No emotional jump scares." },
                    { t: "Why this song?", d: "Optional. But if it’s unhinged, you owe us a one-line explanation." },
                  ].map((x) => (
                    <div key={x.t} className="rounded-2xl border border-white/10 bg-black/25 p-5 backdrop-blur-xl">
                      <div className="text-sm font-bold text-white/90">{x.t}</div>
                      <div className="mt-2 text-white/60">{x.d}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 text-center text-xs text-white/40">
            NA-friendly • chaos-controlled • no inspirational speeches (we’re busy)
          </div>
        </div>
      </div>
    </div>
  );
}

export default WelcomeScreen;