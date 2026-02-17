import React, { useEffect, useMemo, useState } from "react";
import {
  Headphones,
  Mic,
  MonitorPlay,
  Users,
  ArrowRight,
  Plus,
  LogIn,
} from "lucide-react";
import PreJoinDeviceSetup from "./PreJoinDeviceSetup";

function WelcomeScreen({ onCreateRoom, onJoinRoom }) {
  const [mode, setMode] = useState(null); // null | "create" | "join"
  const [roomCode, setRoomCode] = useState("");

  // ✅ separate names (future-proof for host transfer)
  const [hostName, setHostName] = useState("");
  const [participantName, setParticipantName] = useState("");

  // backend modes: dj, karaoke, streaming
  const [roomMode, setRoomMode] = useState("dj");

  const [useExternalVideo, setUseExternalVideo] = useState(false);
  const [externalVideoLink, setExternalVideoLink] = useState("");
  const [showDeviceSetup, setShowDeviceSetup] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);

  // ✅ Rotating banners only (text static)
  const heroBanners = useMemo(
    () => [
      "/banners/3pm-jam.png",
      "/banners/3pm-karaoke.png",
      "/banners/3pm-streaming.png",
      "/banners/3pm-meeting.png",
    ],
    []
  );

  const [heroIndex, setHeroIndex] = useState(0);

  useEffect(() => {
    heroBanners.forEach((src) => {
      const img = new Image();
      img.src = src;
    });

    const t = setInterval(() => {
      setHeroIndex((i) => (i + 1) % heroBanners.length);
    }, 3200);

    return () => clearInterval(t);
  }, [heroBanners]);

  const getHostName = () => hostName.trim() || "DJ";

  const handleJoinSubmit = (e) => {
    e.preventDefault();
    if (roomCode.length === 6 && participantName.trim()) {
      setPendingAction(() => () => onJoinRoom(roomCode, participantName.trim()));
      setShowDeviceSetup(true);
    }
  };

  const handleCreateSubmit = () => {
    if (!hostName.trim()) return; // ✅ require host name
    setPendingAction(
      () => () =>
        onCreateRoom(getHostName(), roomMode, useExternalVideo ? externalVideoLink : null)
    );
    setShowDeviceSetup(true);
  };

  const handleDeviceSetupContinue = () => pendingAction?.();
  const handleDeviceSetupSkip = () => pendingAction?.();

  const getModeLabel = () => {
    if (roomMode === "dj") return "Jam";
    if (roomMode === "karaoke") return "Karaoke";
    if (roomMode === "meeting") return "Meeting";
    return "Streaming";
  };

  const cards = [
    { t: "3PM Jam", d: "Bring your tragic bangers. We’ll vibe responsibly and cry privately.", chip: "Queue • vibes • no mic drama", Icon: Headphones },
    { t: "3PM Karaoke", d: "Live singing, spotlight, consent-based chaos. No emotional jump scares.", chip: "Mic • spotlight • rules", Icon: Mic },
    { t: "3PM Streaming", d: "Watch together in sync. Pause like an adult. Rewind like a villain.", chip: "Sync • playback • watch party", Icon: MonitorPlay },
    { t: "3PM Meeting", d: "Readings, structure, and shared screen. Emotionally supervised.", chip: "Readings • structure • mic control", Icon: Users },
  ];

  return (
    <div className="min-h-screen relative overflow-hidden text-white">
      <div className="absolute inset-0 bg-[#070712]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,0,153,0.12),transparent_60%),radial-gradient(ellipse_at_bottom,rgba(99,102,241,0.12),transparent_60%)]" />

      <div className="relative min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-5xl">
          <div className="rounded-3xl overflow-hidden border border-white/10 shadow-2xl bg-white/5 backdrop-blur-xl">
            {/* HERO */}
            <div className="relative h-44 md:h-60 overflow-hidden">
              <img
                src={heroBanners[heroIndex]}
                alt="3PM banner"
                className="absolute inset-0 w-full h-full object-cover"
                loading="eager"
                decoding="async"
              />

              {/* light overlays */}
              <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(0,0,0,0.78)_0%,rgba(0,0,0,0.44)_48%,rgba(0,0,0,0.18)_100%)]" />
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,0,153,0.18),transparent_60%),radial-gradient(ellipse_at_bottom,rgba(99,102,241,0.14),transparent_60%)]" />

              <div className="absolute bottom-5 left-5 md:bottom-7 md:left-7">
                <h1 className="text-4xl md:text-6xl font-extrabold">
                  <span className="bg-clip-text text-transparent bg-[linear-gradient(90deg,#ff3aa7,#9b7bff,#ffd24a)]">
                    3PM Hub
                  </span>
                </h1>
                <p className="mt-2 text-base md:text-lg text-white/90">
                  Everything happens here. Emotionally supervised chaos.
                </p>
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
                      onClick={() => {
                        setMode("create");
                        // optional: clear join-only fields
                        setRoomCode("");
                        setParticipantName("");
                      }}
                      className="w-full sm:w-auto px-6 py-3 rounded-xl font-semibold
                        border border-fuchsia-400/55 bg-transparent
                        hover:border-fuchsia-300 hover:shadow-[0_0_0_1px_rgba(255,0,153,0.22),0_0_34px_rgba(255,0,153,0.18)]
                        active:scale-[0.99] transition"
                    >
                      <span className="inline-flex items-center gap-2">
                        <Plus className="w-5 h-5" />
                        Start a Room
                      </span>
                    </button>

                    <button
                      onClick={() => {
                        setMode("join");
                        // optional: clear create-only fields
                        setHostName("");
                      }}
                      className="w-full sm:w-auto px-6 py-3 rounded-xl font-semibold
                        border border-white/15 bg-white/5
                        hover:bg-white/8 hover:border-white/25
                        active:scale-[0.99] transition"
                    >
                      <span className="inline-flex items-center gap-2">
                        <LogIn className="w-5 h-5" />
                        Join Room
                      </span>
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

                  <h2 className="text-2xl font-bold mb-2">Create a room</h2>
                  <p className="text-white/60 mb-6">Host name first. Chaos second.</p>

                  {/* ✅ host name */}
                  <div className="mb-6">
                    <label className="block text-sm font-semibold text-white/80 mb-2">
                      Host name
                    </label>
                    <input
                      type="text"
                      value={hostName}
                      onChange={(e) => setHostName(e.target.value)}
                      placeholder="DJ Chelsea’s supervisor"
                      className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 focus:outline-none focus:border-fuchsia-400/70 focus:ring-2 focus:ring-fuchsia-400/20"
                      required
                    />
                  </div>

                  <h3 className="text-lg font-bold mb-3">Choose mode</h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    <ModeCard
                      active={roomMode === "dj"}
                      onClick={() => setRoomMode("dj")}
                      title="Jam Mode"
                      subtitle="Listening party. Feelings allowed. Sermons not."
                      Icon={Headphones}
                    />
                    <ModeCard
                      active={roomMode === "karaoke"}
                      onClick={() => setRoomMode("karaoke")}
                      title="Karaoke Mode"
                      subtitle="Live mic, spotlight, consent-based chaos."
                      Icon={Mic}
                    />
                    <ModeCard
                      active={roomMode === "streaming"}
                      onClick={() => setRoomMode("streaming")}
                      title="Streaming Mode"
                      subtitle="Watch together in sync. Pause like an adult."
                      Icon={MonitorPlay}
                    />
                    <ModeCard
                      active={roomMode === "meeting"}
                      onClick={() => setRoomMode("meeting")}
                      title="Meeting Mode"
                      subtitle="Readings, structure, and shared screen. No chaos."
                      Icon={Users}
                    />
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
                        <div className="font-semibold text-white group-hover:text-fuchsia-200 transition">
                          Use external video chat (Zoom, Meet, etc.)
                        </div>
                        <div className="text-sm text-white/60 mt-1">
                          3PM sync runs here. Video chat lives elsewhere.
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
                          Tip: paste the link so nobody asks “where’s the Zoom” 14 times.
                        </div>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={handleCreateSubmit}
                    disabled={!hostName.trim()}
                    className="w-full px-6 py-3 rounded-xl font-semibold
                      border border-fuchsia-400/55 bg-transparent
                      disabled:opacity-40 disabled:cursor-not-allowed
                      hover:border-fuchsia-300 hover:shadow-[0_0_0_1px_rgba(255,0,153,0.22),0_0_34px_rgba(255,0,153,0.18)]
                      transition"
                  >
                    <span className="inline-flex items-center justify-center gap-2">
                      Create {getModeLabel()} Room
                      <ArrowRight className="w-5 h-5" />
                    </span>
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
                          value={participantName}
                          onChange={(e) => setParticipantName(e.target.value)}
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
                        disabled={roomCode.length !== 6 || !participantName.trim()}
                        className="w-full px-6 py-3 rounded-xl font-semibold
                          border border-white/15 bg-white/5
                          disabled:opacity-40 disabled:cursor-not-allowed
                          hover:bg-white/8 hover:border-white/25 transition"
                      >
                        Join Room
                      </button>
                    </form>
                  </div>
                </div>
              )}

              {/* HOME CARDS */}
              {mode !== "join" && mode !== "create" && (
                <div className="mt-10 grid grid-cols-1 md:grid-cols-4 gap-4">
                  {cards.map(({ t, d, chip, Icon, soon }) => (
                    <div
                      key={t}
                      className={`rounded-2xl border border-white/10 bg-black/20 p-5 backdrop-blur-xl ${
                        soon ? "opacity-65" : ""
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl border border-white/10 bg-white/5 flex items-center justify-center">
                          <Icon className="w-5 h-5 text-white/85" />
                        </div>
                        <div className="text-sm font-semibold text-white/90">{t}</div>
                      </div>

                      <div className="mt-3 text-xs text-white/50">{chip}</div>
                      <div className="mt-3 text-white/70 text-sm leading-relaxed">{d}</div>

                      {soon && (
                        <div className="mt-3 text-xs text-white/45">
                          Coming soon. Don’t panic. Panic later.
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 text-center text-xs text-white/35">
            NA-friendly • chaos-controlled • no inspirational speeches (we’re busy)
          </div>
        </div>
      </div>
    </div>
  );
}

function ModeCard({ active, onClick, title, subtitle, Icon }) {
  return (
    <button
      onClick={onClick}
      className={`p-6 rounded-2xl border transition text-left ${
        active
          ? "border-fuchsia-400/60 bg-white/5 shadow-[0_0_0_1px_rgba(255,0,153,0.18),0_0_28px_rgba(255,0,153,0.10)]"
          : "border-white/10 bg-black/20 hover:border-white/20"
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 rounded-xl border border-white/10 bg-white/5 flex items-center justify-center">
          <Icon className="w-5 h-5 text-white/85" />
        </div>
        {active && (
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

      <h3 className="text-xl font-bold mb-2">{title}</h3>
      <p className="text-sm text-white/70">{subtitle}</p>
    </button>
  );
}

export default WelcomeScreen;