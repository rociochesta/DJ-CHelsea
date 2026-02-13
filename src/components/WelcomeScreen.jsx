import React, { useState } from "react";

function WelcomeScreen({ onCreateRoom, onJoinRoom }) {
  const [mode, setMode] = useState(null); // null, 'join', 'create'
  const [roomCode, setRoomCode] = useState("");
  const [userName, setUserName] = useState("");
  const [roomMode, setRoomMode] = useState("dj"); // 'dj' or 'karaoke'

  const getDJName = () => {
    const n = userName.trim();
    return n || "DJ";
  };

  const handleJoinSubmit = (e) => {
    e.preventDefault();
    if (roomCode.length === 6 && userName.trim()) {
      onJoinRoom(roomCode, userName.trim());
    }
  };

  const handleCreateSubmit = () => {
    onCreateRoom(getDJName(), roomMode);
  };

  return (
    <div className="min-h-screen relative overflow-hidden text-white">
      {/* Background */}
      <div className="absolute inset-0 bg-[#070712]" />
      <div className="absolute -top-40 -left-40 w-[520px] h-[520px] rounded-full blur-3xl opacity-50 bg-fuchsia-600" />
      <div className="absolute -bottom-56 -right-56 w-[640px] h-[640px] rounded-full blur-3xl opacity-50 bg-indigo-600" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,0,153,0.18),transparent_55%),radial-gradient(ellipse_at_bottom,rgba(99,102,241,0.18),transparent_55%)]" />

      {/* Local keyframes */}
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
            {/* Banner */}
            <div className="relative h-44 md:h-60 overflow-hidden">
              <video
                className="absolute inset-0 w-full h-full object-cover"
                src="/dj_chelsea_banner.mp4"
                autoPlay
                loop
                muted
                playsInline
              />

              <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(0,0,0,0.78)_0%,rgba(0,0,0,0.46)_44%,rgba(0,0,0,0.18)_100%)]" />
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,0,153,0.18),transparent_60%),radial-gradient(ellipse_at_bottom,rgba(99,102,241,0.14),transparent_60%)]" />

              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background:
                    "linear-gradient(120deg, transparent 0%, rgba(255,255,255,0.18) 45%, rgba(255,0,153,0.10) 55%, transparent 100%)",
                  mixBlendMode: "screen",
                  animation: "sweep 3.8s ease-in-out infinite",
                }}
              />

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

                <div className="flex flex-col md:items-end gap-3 w-full md:w-auto">
                  <div className="w-full md:w-auto">
                    <label className="block text-xs tracking-widest uppercase text-white/50 mb-2">
                      Your name (optional)
                    </label>
                    <input
                      type="text"
                      value={userName}
                      onChange={(e) => setUserName(e.target.value)}
                      placeholder='Leave empty = "DJ"'
                      className="w-full md:w-80 px-4 py-3 rounded-xl bg-black/30 border border-white/10 focus:outline-none focus:border-fuchsia-400/60"
                    />
                  </div>

                  <div className="flex gap-3 flex-wrap md:justify-end w-full">
                    <button
                      onClick={() => setMode("create")}
                      className="w-full sm:w-auto px-6 py-3 rounded-xl font-bold bg-[linear-gradient(90deg,#ff2aa1,#7c3aed)] hover:opacity-95 active:scale-[0.99] transition shadow-[0_0_0_1px_rgba(255,255,255,0.10),0_18px_60px_rgba(255,0,153,0.20)]"
                    >
                      Start a Room
                    </button>

                    <button
                      onClick={() => setMode("join")}
                      className="w-full sm:w-auto px-6 py-3 rounded-xl font-bold bg-white/10 hover:bg-white/15 active:scale-[0.99] transition border border-white/10"
                    >
                      Join Room
                    </button>
                  </div>
                </div>
              </div>

              {/* Create Room Mode Selection */}
              {mode === "create" && (
                <div className="mt-8 rounded-2xl border border-white/10 bg-black/30 p-6 backdrop-blur-xl">
                  <button
                    onClick={() => setMode(null)}
                    className="text-white/70 hover:text-white transition mb-4"
                  >
                    ← Back
                  </button>

                  <h2 className="text-2xl font-bold mb-2">Choose Room Mode</h2>
                  <p className="text-white/60 mb-6">
                    Select how you want to run your room
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    {/* DJ Mode */}
                    <button
                      onClick={() => setRoomMode("dj")}
                      className={`p-6 rounded-2xl border-2 transition text-left ${
                        roomMode === "dj"
                          ? "border-fuchsia-500 bg-fuchsia-500/10"
                          : "border-white/10 bg-black/25 hover:border-white/20"
                      }`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="text-4xl">🎧</div>
                        {roomMode === "dj" && (
                          <div className="w-6 h-6 rounded-full bg-fuchsia-500 flex items-center justify-center">
                            <svg className="w-4 h-4" fill="white" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          </div>
                        )}
                      </div>
                      <h3 className="text-xl font-bold mb-2">DJ Mode</h3>
                      <p className="text-sm text-white/70 mb-3">
                        Classic music session - no karaoke features
                      </p>
                      <ul className="text-xs text-white/60 space-y-1">
                        <li>✓ Queue and play songs</li>
                        <li>✓ Video only (no mic echo)</li>
                        <li>✓ Clean audio experience</li>
                        <li>✓ Perfect for listening parties</li>
                      </ul>
                    </button>

                    {/* Karaoke Mode */}
                    <button
                      onClick={() => setRoomMode("karaoke")}
                      className={`p-6 rounded-2xl border-2 transition text-left ${
                        roomMode === "karaoke"
                          ? "border-fuchsia-500 bg-fuchsia-500/10"
                          : "border-white/10 bg-black/25 hover:border-white/20"
                      }`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="text-4xl">🎤</div>
                        {roomMode === "karaoke" && (
                          <div className="w-6 h-6 rounded-full bg-fuchsia-500 flex items-center justify-center">
                            <svg className="w-4 h-4" fill="white" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          </div>
                        )}
                      </div>
                      <h3 className="text-xl font-bold mb-2">Karaoke Mode</h3>
                      <p className="text-sm text-white/70 mb-3">
                        Full karaoke experience with live singing
                      </p>
                      <ul className="text-xs text-white/60 space-y-1">
                        <li>✓ Live mic for singers</li>
                        <li>✓ Singer spotlight view</li>
                        <li>✓ Auto mic policy (only singer unmuted)</li>
                        <li>✓ Echo compensation</li>
                      </ul>
                    </button>
                  </div>

                  <button
                    onClick={handleCreateSubmit}
                    className="w-full px-6 py-3 rounded-xl font-bold bg-[linear-gradient(90deg,#ff2aa1,#7c3aed)] hover:opacity-95 transition"
                  >
                    Create {roomMode === "dj" ? "DJ" : "Karaoke"} Room
                  </button>
                </div>
              )}

              {/* Join mode */}
              {mode === "join" && (
                <div className="mt-8 grid grid-cols-1 md:grid-cols-5 gap-6">
                  <div className="md:col-span-2">
                    <button
                      onClick={() => setMode(null)}
                      className="text-white/70 hover:text-white transition"
                    >
                      ← Back
                    </button>
                    <h2 className="mt-3 text-2xl font-bold">Join the room</h2>
                    <p className="mt-2 text-white/60">
                      Enter your name + the 6-character code.
                    </p>
                  </div>

                  <div className="md:col-span-3 rounded-2xl border border-white/10 bg-black/30 p-5 md:p-6 backdrop-blur-xl">
                    <form onSubmit={handleJoinSubmit} className="space-y-4">
                      <div>
                        <label className="block text-sm font-semibold text-white/80 mb-2">
                          Your name
                        </label>
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
                        <label className="block text-sm font-semibold text-white/80 mb-2">
                          Room code
                        </label>
                        <input
                          type="text"
                          value={roomCode}
                          onChange={(e) =>
                            setRoomCode(e.target.value.toUpperCase())
                          }
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

              {/* Bottom cards */}
              {mode !== "join" && mode !== "create" && (
                <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    {
                      t: "Sad Song Court",
                      d: "Bring your tragic bangers. We will judge lovingly and cry privately.",
                    },
                    {
                      t: "Always respectful",
                      d: "Flirty tracks allowed. No inspirational speeches. No emotional jump scares.",
                    },
                    {
                      t: "Why this song?",
                      d: "Optional. But if it's unhinged, you owe us a one-line explanation.",
                    },
                  ].map((x) => (
                    <div
                      key={x.t}
                      className="rounded-2xl border border-white/10 bg-black/25 p-5 backdrop-blur-xl"
                    >
                      <div className="text-sm font-bold text-white/90">
                        {x.t}
                      </div>
                      <div className="mt-2 text-white/60">{x.d}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 text-center text-xs text-white/40">
            NA-friendly • chaos-controlled • no inspirational speeches (we're busy)
          </div>
        </div>
      </div>
    </div>
  );
}

export default WelcomeScreen;