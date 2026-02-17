import React, { useEffect, useMemo, useState } from "react";
import PreJoinDeviceSetup from "./PreJoinDeviceSetup";

function WelcomeScreen({ onCreateRoom, onJoinRoom }) {
  const [mode, setMode] = useState(null);
  const [roomCode, setRoomCode] = useState("");
  const [userName, setUserName] = useState("");

  // Backend modes existentes: dj, karaoke, streaming
  // UI rename: dj => Jam
  const [roomMode, setRoomMode] = useState("dj");

  const [useExternalVideo, setUseExternalVideo] = useState(false);
  const [externalVideoLink, setExternalVideoLink] = useState("");
  const [showDeviceSetup, setShowDeviceSetup] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);

  // ✅ Rotating banners (PNGs in /public/banners)
  const heroModes = useMemo(
    () => [
      {
        key: "jam",
        name: "3PM JAM",
        tagline: "Feel — Queue — Vibe",
        banner: "/banners/3pm-jam.png",
      },
      {
        key: "karaoke",
        name: "3PM KARAOKE",
        tagline: "Sing — Feel — Survive",
        banner: "/banners/3pm-karaoke.png",
      },
      {
        key: "streaming",
        name: "3PM STREAMING",
        tagline: "Sync — Play — Judge Quietly",
        banner: "/banners/3pm-streaming.png",
      },
      {
        key: "meeting",
        name: "3PM MEETING",
        tagline: "Chaos — Moderated",
        banner: "/banners/3pm-meeting.png",
      },
    ],
    []
  );

  const [heroIndex, setHeroIndex] = useState(0);
  const [heroTick, setHeroTick] = useState(0); // forces subtle re-animate

  useEffect(() => {
    // Preload images so it doesn’t flash on rotate
    heroModes.forEach((h) => {
      const img = new Image();
      img.src = h.banner;
    });

    const t = setInterval(() => {
      setHeroIndex((i) => (i + 1) % heroModes.length);
      setHeroTick((x) => x + 1);
    }, 3200);

    return () => clearInterval(t);
  }, [heroModes]);

  const getDJName = () => {
    const n = userName.trim();
    return n || "DJ";
  };

  const handleJoinSubmit = (e) => {
    e.preventDefault();
    if (roomCode.length === 6 && userName.trim()) {
      setPendingAction(() => () => onJoinRoom(roomCode, userName.trim()));
      setShowDeviceSetup(true);
    }
  };

  const handleCreateSubmit = () => {
    setPendingAction(
      () => () =>
        onCreateRoom(getDJName(), roomMode, useExternalVideo ? externalVideoLink : null)
    );
    setShowDeviceSetup(true);
  };

  const handleDeviceSetupContinue = () => {
    if (pendingAction) pendingAction();
  };

  const handleDeviceSetupSkip = () => {
    if (pendingAction) pendingAction();
  };

  const getModeLabel = () => {
    if (roomMode === "dj") return "Jam";
    if (roomMode === "karaoke") return "Karaoke";
    return "Streaming";
  };

  // ✅ New: landing cards (1 per product)
  const landingCards = [
    {
      t: "3PM Jam",
      d: "Bring your tragic bangers. We’ll vibe responsibly and cry privately.",
      chip: "Queue • vibes • no mic drama",
      icon: "🎧",
    },
    {
      t: "3PM Karaoke",
      d: "Live singing, spotlight, and consent-based chaos. No emotional jump scares.",
      chip: "Mic • spotlight • rules",
      icon: "🎤",
    },
    {
      t: "3PM Streaming",
      d: "Watch together in sync. Pause like an adult. Rewind like a villain.",
      chip: "Sync • playback • watch party",
      icon: "📺",
    },
    {
      t: "3PM Meeting (Soon)",
      d: "Zoom but prettier. Same humans, better UI, fewer reasons to scream.",
      chip: "Overlay • tools • polish",
      icon: "🫶",
      soon: true,
    },
  ];

  const currentHero = heroModes[heroIndex];

  return (
    <div className="min-h-screen relative overflow-hidden text-white">
      <div className="absolute inset-0 bg-[#070712]" />
      <div className="absolute -top-40 -left-40 w-[520px] h-[520px] rounded-full blur-3xl opacity-50 bg-fuchsia-600" />
      <div className="absolute -bottom-56 -right-56 w-[640px] h-[640px] rounded-full blur-3xl opacity-50 bg-indigo-600" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,0,153,0.18),transparent_55%),radial-gradient(ellipse_at_bottom,rgba(99,102,241,0.18),transparent_55%)]" />

      <div className="relative min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-5xl">
          <div className="rounded-3xl overflow-hidden border border-white/10 shadow-2xl bg-white/5 backdrop-blur-xl">
            {/* HERO */}
            <div className="relative h-44 md:h-60 overflow-hidden">
              {/* rotating banner image */}
              <img
                key={`banner-${heroTick}`}
                src={currentHero.banner}
                alt={currentHero.name}
                className="absolute inset-0 w-full h-full object-cover animate-[fadeIn_240ms_ease-out]"
                loading="eager"
                decoding="async"
              />

              {/* overlays to keep text readable */}
              <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(0,0,0,0.80)_0%,rgba(0,0,0,0.48)_44%,rgba(0,0,0,0.18)_100%)]" />
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,0,153,0.16),transparent_60%),radial-gradient(ellipse_at_bottom,rgba(99,102,241,0.14),transparent_60%)]" />

              <div className="absolute bottom-5 left-5 md:bottom-7 md:left-7">
                <h1
                  key={`title-${heroTick}`}
                  className="text-4xl md:text-6xl font-extrabold animate-[fadeIn_300ms_ease-out]"
                >
                  <span className="bg-clip-text text-transparent bg-[linear-gradient(90deg,#ff3aa7,#9b7bff,#ffd24a)]">
                    {currentHero.name}
                  </span>
                </h1>

                <p
                  key={`tag-${heroTick}`}
                  className="mt-2 text-base md:text-lg text-white/90 animate-[fadeIn_350ms_ease-out]"
                >
                  {currentHero.tagline}
                </p>

                {/* tiny pills */}
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="px-3 py-1 rounded-full text-xs bg-black/35 border border-white/10">
                    NA-friendly
                  </span>
                  <span className="px-3 py-1 rounded-full text-xs bg-black/35 border border-white/10">
                    chaos-controlled
                  </span>
                  <span className="px-3 py-1 rounded-full text-xs bg-black/35 border border-white/10">
                    no inspirational speeches
                  </span>
                </div>
              </div>
            </div>

            <div className="p-6 md:p-10">
              {/* LANDING CTA */}
              {!mode && !showDeviceSetup && (
                <div className="text-center">
                  <p className="text-white/60 mb-6">
                    Pick a room. Bring a song. Don’t bring a TED Talk.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
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
              )}

              {/* DEVICE SETUP */}
              {showDeviceSetup && (
                <div className="mt-8 rounded-2xl border border-white/10 bg-black/30 p-6 backdrop-blur-xl">
                  <button
                    onClick={() => setShowDeviceSetup(false)}
                    className="text-white/70 hover:text-white transition mb-4"
                  >
                    ← Back
                  </button>
                  <PreJoinDeviceSetup
                    onContinue={handleDeviceSetupContinue}
                    onSkip={handleDeviceSetupSkip}
                  />
                </div>
              )}

              {/* CREATE */}
              {mode === "create" && !showDeviceSetup && (
                <div className="mt-8 rounded-2xl border border-white/10 bg-black/30 p-6 backdrop-blur-xl">
                  <button
                    onClick={() => setMode(null)}
                    className="text-white/70 hover:text-white transition mb-4"
                  >
                    ← Back
                  </button>

                  <h2 className="text-2xl font-bold mb-2">Choose your chaos</h2>
                  <p className="text-white/60 mb-6">
                    Select what kind of room you’re running today.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    {/* JAM (DJ backend) */}
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
                              <path
                                fillRule="evenodd"
                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                clipRule="evenodd"
                              />
                            </svg>
                          </div>
                        )}
                      </div>
                      <h3 className="text-xl font-bold mb-2">Jam Mode</h3>
                      <p className="text-sm text-white/70 mb-3">
                        Listening party. Feelings allowed. Sermons not.
                      </p>
                      <ul className="text-xs text-white/60 space-y-1">
                        <li>✓ Queue and play</li>
                        <li>✓ Video-only (clean audio)</li>
                        <li>✓ Perfect for “I’m fine” playlists</li>
                        <li>✓ Zero mic chaos</li>
                      </ul>
                    </button>

                    {/* KARAOKE */}
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
                              <path
                                fillRule="evenodd"
                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                clipRule="evenodd"
                              />
                            </svg>
                          </div>
                        )}
                      </div>
                      <h3 className="text-xl font-bold mb-2">Karaoke Mode</h3>
                      <p className="text-sm text-white/70 mb-3">
                        Full chaos, live singing, spotlight — consent-based.
                      </p>
                      <ul className="text-xs text-white/60 space-y-1">
                        <li>✓ Live mic for singers</li>
                        <li>✓ Singer spotlight view</li>
                        <li>✓ Auto mic policy</li>
                        <li>✓ “Respectful but unhinged” ready</li>
                      </ul>
                    </button>

                    {/* STREAMING */}
                    <button
                      onClick={() => setRoomMode("streaming")}
                      className={`p-6 rounded-2xl border-2 transition text-left ${
                        roomMode === "streaming"
                          ? "border-fuchsia-500 bg-fuchsia-500/10"
                          : "border-white/10 bg-black/25 hover:border-white/20"
                      }`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="text-4xl">📺</div>
                        {roomMode === "streaming" && (
                          <div className="w-6 h-6 rounded-full bg-fuchsia-500 flex items-center justify-center">
                            <svg className="w-4 h-4" fill="white" viewBox="0 0 20 20">
                              <path
                                fillRule="evenodd"
                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                clipRule="evenodd"
                              />
                            </svg>
                          </div>
                        )}
                      </div>
                      <h3 className="text-xl font-bold mb-2">Streaming Mode</h3>
                      <p className="text-sm text-white/70 mb-3">
                        Watch together, synced. Pause like an adult.
                      </p>
                      <ul className="text-xs text-white/60 space-y-1">
                        <li>✓ Synced video playback</li>
                        <li>✓ Shared time controls</li>
                        <li>✓ Movie nights, clip nights, chaos nights</li>
                        <li>✓ Your vibe, your rules</li>
                      </ul>
                    </button>

                    {/* MEETING (UI only) */}
                    <button
                      disabled
                      className="p-6 rounded-2xl border-2 text-left border-white/10 bg-black/20 opacity-60 cursor-not-allowed md:col-span-3"
                      title="Soon"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="text-4xl">🫶</div>
                        <span className="px-2 py-1 rounded-lg text-xs bg-white/10 border border-white/10">
                          Soon
                        </span>
                      </div>
                      <h3 className="text-xl font-bold mb-2">Meeting Mode (Soon)</h3>
                      <p className="text-sm text-white/70">
                        “Zoom but prettier.” Same humans, better UI. Coming soon.
                      </p>
                    </button>
                  </div>

                  <div className="mb-6 p-5 rounded-2xl border border-white/10 bg-black/25">
                    <label className="flex items-start gap-3 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={useExternalVideo}
                        onChange={(e) => setUseExternalVideo(e.target.checked)}
                        className="mt-1 w-5 h-5 rounded border-white/20 bg-white/10 checked:bg-fuchsia-500"
                      />
                      <div className="flex-1">
                        <div className="font-bold text-white group-hover:text-fuchsia-300 transition">
                          Use external video chat (Zoom, Meet, etc.)
                        </div>
                        <div className="text-sm text-white/60 mt-1">
                          Your app handles the synced experience. Video chat lives elsewhere.
                        </div>
                      </div>
                    </label>

                    {useExternalVideo && (
                      <div className="mt-4">
                        <label className="block text-sm font-semibold text-white/80 mb-2">
                          Video Chat Link
                        </label>
                        <input
                          type="url"
                          value={externalVideoLink}
                          onChange={(e) => setExternalVideoLink(e.target.value)}
                          placeholder="https://zoom.us/j/123456789 or meet.google.com/abc-defg-hij"
                          className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 focus:outline-none focus:border-fuchsia-400/70 focus:ring-2 focus:ring-fuchsia-400/20 text-sm"
                        />
                        <div className="mt-2 text-xs text-white/50">
                          Tip: paste the link here so people don’t ask “where’s the Zoom” 14 times.
                        </div>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={handleCreateSubmit}
                    className="w-full px-6 py-3 rounded-xl font-bold bg-[linear-gradient(90deg,#ff2aa1,#7c3aed)] hover:opacity-95 transition"
                  >
                    Create {getModeLabel()} Room
                  </button>
                </div>
              )}

              {/* JOIN */}
              {mode === "join" && !showDeviceSetup && (
                <div className="mt-8 grid grid-cols-1 md:grid-cols-5 gap-6">
                  <div className="md:col-span-2">
                    <button
                      onClick={() => setMode(null)}
                      className="text-white/70 hover:text-white transition"
                    >
                      ← Back
                    </button>
                    <h2 className="mt-3 text-2xl font-bold">Join the room</h2>
                    <p className="mt-2 text-white/60">Name + 6-character code.</p>
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

              {/* LANDING CARDS (only when not in join/create) */}
              {mode !== "join" && mode !== "create" && (
                <div className="mt-10 grid grid-cols-1 md:grid-cols-4 gap-4">
                  {landingCards.map((x) => (
                    <div
                      key={x.t}
                      className={`rounded-2xl border border-white/10 bg-black/25 p-5 backdrop-blur-xl ${
                        x.soon ? "opacity-70" : ""
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="text-xl">{x.icon}</div>
                        <div className="text-xs px-2 py-1 rounded-lg bg-white/10 border border-white/10 text-white/80">
                          {x.chip}
                        </div>
                      </div>

                      <div className="mt-3 text-sm font-bold text-white/90">{x.t}</div>
                      <div className="mt-2 text-white/60 text-sm">{x.d}</div>

                      {x.soon && (
                        <div className="mt-3 text-xs text-white/50">
                          Coming soon. Don’t panic. Panic later.
                        </div>
                      )}
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

      {/* tiny keyframes for the rotating hero */}
      <style>
        {`
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(4px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}
      </style>
    </div>
  );
}

export default WelcomeScreen;