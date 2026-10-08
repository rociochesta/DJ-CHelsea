import React, { useEffect, useState } from "react";
import {
  Headphones,
  Mic,
  MonitorPlay,
  Users,
  ArrowRight,
  Plus,
  LogIn,
  Radio,
  LockKeyhole,
} from "lucide-react";
import { database, ref, onValue, get } from "../utils/firebase";
import { isSecretRoom, verifyRoomPassword, getRoomMode } from '../utils/secretRoom';

const AVATAR_OPTIONS = ["🎤","🎵","🎶","🎸","🥁","🎹","🎧","🌟","🔥","💫","✨","🌈","💎","👑","🏆","❤️","🙏","💪","🌊","🌺","😊","🎯","🦋","🌙","🃏"];

function WelcomeScreen({ onCreateRoom, onJoinRoom }) {
  const [mode, setMode] = useState(null); // null | "create" | "join"
  const [roomCode, setRoomCode] = useState("");

  // ✅ separate names (future-proof for host transfer)
  const [hostName, setHostName] = useState("");
  const [hostGroup, setHostGroup] = useState("");
  const [hostAvatar, setHostAvatar] = useState("🎤");
  const [participantName, setParticipantName] = useState("");
  const [participantGroup, setParticipantGroup] = useState("");
  const [participantAvatar, setParticipantAvatar] = useState("🎤");

  // backend modes: dj, karaoke, streaming
  const [roomMode, setRoomMode] = useState("dj");
  const [hostPassword, setHostPassword] = useState('');
  const [joinPassword, setJoinPassword] = useState('');
  const [needsPassword, setNeedsPassword] = useState(false);
  const [entryError, setEntryError] = useState('');
  const [entryBusy, setEntryBusy] = useState(false);

  const [activeRooms, setActiveRooms] = useState([]);

  // Listen for active rooms
  useEffect(() => {
    const roomsRef = ref(database, "karaoke-rooms");
    const unsub = onValue(roomsRef, (snapshot) => {
      const data = snapshot.val();
      if (!data) {
        setActiveRooms([]);
        return;
      }

      const rooms = Object.entries(data)
        .map(([code, room]) => ({
          code,
          hostName: room.hostName || "Unknown",
          roomMode: getRoomMode(room),
          participantCount:
            (room.participants ? Object.keys(room.participants).length : 0) +
            // TEST ONLY: include fake NA members in room count — remove for production
            (room.naMembers
              ? Object.values(room.naMembers).filter((m) => m.active).length
              : 0),
          createdAt: room.createdAt || 0,
        }))
        .filter((room) => room.participantCount > 0 || room.roomMode === 'secret')
        .sort((a, b) => b.createdAt - a.createdAt);

      setActiveRooms(rooms);
    });

    return () => unsub();
  }, []);

  const getHostName = () => hostName.trim() || "DJ";

  useEffect(() => {
    if (mode !== 'join' || roomCode.length !== 6) return;
    let active = true;
    get(ref(database, `karaoke-rooms/${roomCode}`)).then(snapshot => {
      if (active) setNeedsPassword(isSecretRoom(snapshot.val()));
    }).catch(() => {});
    return () => { active = false; };
  }, [mode, roomCode]);

  const handleJoinSubmit = async (e) => {
    e.preventDefault();
    if (entryBusy) return;
    if (roomCode.length === 6 && participantName.trim()) {
      setEntryBusy(true);
      setEntryError('');
      try {
      const snapshot = await get(ref(database, `karaoke-rooms/${roomCode}`));
      if (!snapshot.exists()) throw new Error('Room not found. Check the code and try again.');
      const secret = isSecretRoom(snapshot.val());
      setNeedsPassword(secret);
      if (secret && !joinPassword) throw new Error('Enter the password for this Secret room.');
      if (!await verifyRoomPassword(snapshot.val(), joinPassword)) throw new Error('Incorrect password. Try again.');
      await onJoinRoom(roomCode, participantName.trim(), participantGroup.trim(), participantAvatar, joinPassword);
      } catch (cause) { setEntryError(cause.message || 'Could not join the room. Please try again.'); }
      finally { setEntryBusy(false); }
    }
  };

  const handleCreateSubmit = async () => {
    if (entryBusy || !hostName.trim() || (roomMode === 'secret' && !hostPassword.trim())) return;
    setEntryBusy(true); setEntryError('');
    try { await onCreateRoom(getHostName(), hostGroup.trim(), hostAvatar, roomMode, hostPassword); }
    catch (cause) { setEntryError(cause.message || 'Could not create the room. Please try again.'); }
    finally { setEntryBusy(false); }
  };

  const getModeLabel = () => {
    if (roomMode === "dj") return "Jam";
    if (roomMode === "karaoke") return "Karaoke";
    if (roomMode === "secret") return "Secret";
    return "Streaming";
  };

  const cards = [
    { t: "Jam", d: "Queue the song you’re definitely over that person about. Then lose the music quiz. Stay humble.", chip: "Music • games • suspiciously specific lyrics", Icon: Headphones },
    { t: "Karaoke", d: "I can’t promise we’ll hit the notes. I can promise someone will sing like the divorce is final.", chip: "Songs • lyrics • consequences", Icon: Mic },
    { t: "Streaming", d: "Watch together. Escape your own plot for a bit. Judge someone else’s terrible decisions.", chip: "Watch parties • synced playback", Icon: MonitorPlay },
    { t: "Secret room", d: "Bring your friends and a password. Keep the playlist and the inside jokes in the room.", chip: "Password • music • games", Icon: LockKeyhole },
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
              {/* light overlays */}
              <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(0,0,0,0.78)_0%,rgba(0,0,0,0.44)_48%,rgba(0,0,0,0.18)_100%)]" />
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,0,153,0.18),transparent_60%),radial-gradient(ellipse_at_bottom,rgba(99,102,241,0.14),transparent_60%)]" />

              <div className="absolute bottom-5 left-5 md:bottom-7 md:left-7">
                <h1 className="text-4xl md:text-6xl font-extrabold">
                  <span className="bg-clip-text text-transparent bg-[linear-gradient(90deg,#ff3aa7,#9b7bff,#ffd24a)]">
                    Rociwi's Hub
                  </span>
                </h1>
                <p className="mt-2 text-base md:text-lg text-white/90">
                  I made us a place to hang out. Apparently I do want company. Annoying discovery.
                </p>
              </div>
            </div>

            <div className="p-6 md:p-10">
              {entryError && <p role="alert" className="mb-4 rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-red-200">{entryError}</p>}
              {/* LANDING CTA */}
              {!mode && (
                <div className="text-center">
                  <p className="text-white/60 mb-6">
                    Pick a room. Bring your friends and your questionable taste. Mine’s already here.
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

                  {/* ACTIVE ROOMS */}
                  {activeRooms.length > 0 && (
                    <div className="mt-8">
                      <div className="flex items-center justify-center gap-2 mb-4">
                        <Radio className="w-4 h-4 text-emerald-400" />
                        <span className="text-sm font-semibold text-white/70">Rooms</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-w-3xl mx-auto">
                        {activeRooms.map((room) => {
                          const ModeIcon =
                            room.roomMode === "dj" ? Headphones
                            : room.roomMode === "karaoke" ? Mic
                            : room.roomMode === "streaming" ? MonitorPlay
                            : room.roomMode === 'secret' ? LockKeyhole : Users;
                          const modeLabel =
                            room.roomMode === "dj" ? "Jam"
                            : room.roomMode === "karaoke" ? "Karaoke"
                            : room.roomMode === "streaming" ? "Streaming"
                            : room.roomMode === 'secret' ? 'Secret room' : "Meeting";

                          return (
                            <button
                              key={room.code}
                              onClick={() => {
                                setRoomCode(room.code);
                                setNeedsPassword(room.roomMode === 'secret');
                                setJoinPassword('');
                                setEntryError('');
                                setMode("join");
                              }}
                              className="flex items-center gap-3 p-4 rounded-2xl border border-white/10 bg-black/20 hover:border-emerald-500/30 hover:bg-white/[0.04] transition active:scale-[0.98] text-left"
                            >
                              <div className="w-10 h-10 rounded-xl border border-white/10 bg-white/[0.03] flex items-center justify-center flex-shrink-0">
                                <ModeIcon className="w-5 h-5 text-white/70" />
                              </div>

                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-bold text-white/90 truncate">
                                    {room.hostName}
                                  </span>
                                  <span className="flex-shrink-0 w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(16,185,129,0.5)]" />
                                </div>
                                <div className="text-xs text-white/45 mt-0.5">
                                  {modeLabel} · {room.participantCount} {room.participantCount === 1 ? "person" : "people"}
                                </div>
                              </div>

                              <div className="text-xs font-mono text-white/30 flex-shrink-0">
                                {room.code}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* CREATE */}
              {mode === "create" && (
                <div className="mt-8 rounded-2xl border border-white/10 bg-black/30 p-6 backdrop-blur-xl">
                  <button
                    onClick={() => setMode(null)}
                    className="text-white/70 hover:text-white transition mb-4"
                  >
                    ← Back
                  </button>

                  <h2 className="text-2xl font-bold mb-2">Create a room</h2>
                  <p className="text-white/60 mb-6">Host name first. Chaos second.</p>

                  {/* Avatar picker */}
                  <div className="mb-4">
                    <label className="block text-sm font-semibold text-white/80 mb-2">
                      Pick your vibe
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {AVATAR_OPTIONS.map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => setHostAvatar(emoji)}
                          className={`w-10 h-10 rounded-xl text-xl transition border ${
                            hostAvatar === emoji
                              ? "border-fuchsia-400/70 bg-fuchsia-500/20 shadow-[0_0_12px_rgba(232,121,249,0.4)]"
                              : "border-white/10 bg-white/5 hover:border-white/25"
                          }`}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Host name */}
                  <div className="mb-4">
                    <label className="block text-sm font-semibold text-white/80 mb-2">
                      Host name
                    </label>
                    <input
                      type="text"
                      value={hostName}
                      onChange={(e) => setHostName(e.target.value)}
                      placeholder="Your name. We’ll discover the rest of the damage later."
                      className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 focus:outline-none focus:border-fuchsia-400/70 focus:ring-2 focus:ring-fuchsia-400/20"
                      required
                    />
                  </div>

                  {/* Group name */}
                  <div className="mb-6">
                    <label className="block text-sm font-semibold text-white/80 mb-2">
                      Group name <span className="text-white/40 font-normal">(optional)</span>
                    </label>
                    <input
                      type="text"
                      value={hostGroup}
                      onChange={(e) => setHostGroup(e.target.value)}
                      placeholder="e.g. The usual suspects"
                      className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 focus:outline-none focus:border-fuchsia-400/70 focus:ring-2 focus:ring-fuchsia-400/20"
                    />
                  </div>

                  <h3 className="text-lg font-bold mb-3">Choose mode</h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    <ModeCard
                      active={roomMode === "dj"}
                      onClick={() => setRoomMode("dj")}
                      title="Jam Mode"
                      subtitle="A playlist and a quiz to keep your ego in check."
                      Icon={Headphones}
                    />
                    <ModeCard
                      active={roomMode === "karaoke"}
                      onClick={() => setRoomMode("karaoke")}
                      title="Karaoke Mode"
                      subtitle="Some feelings apparently need a backing track."
                      Icon={Mic}
                    />
                    <ModeCard
                      active={roomMode === "streaming"}
                      onClick={() => setRoomMode("streaming")}
                      title="Streaming Mode"
                      subtitle="Other people’s problems. Better lighting."
                      Icon={MonitorPlay}
                    />
                    <ModeCard
                      active={roomMode === "secret"}
                      onClick={() => setRoomMode("secret")}
                      title="Secret room"
                      subtitle="The Jam experience, with a password for your friends."
                      Icon={LockKeyhole}
                    />
                  </div>


                  {roomMode === 'secret' && <div className="mb-6">
                    <label htmlFor="secret-room-password" className="block text-sm font-semibold text-white/80 mb-2">Room password</label>
                    <input id="secret-room-password" type="password" autoComplete="new-password" value={hostPassword} onChange={e => setHostPassword(e.target.value)} placeholder="Choose a password" required className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 focus:outline-none focus:border-fuchsia-400/70" />
                    <p className="mt-2 text-sm text-white/60">Share this password with the friends you want to invite.</p>
                  </div>}

                  <button
                    onClick={handleCreateSubmit}
                    disabled={entryBusy || !hostName.trim() || (roomMode === 'secret' && !hostPassword.trim())}
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
                    <p className="mt-2 text-white/60">Name + 6-character code.</p>
                  </div>

                  <div className="md:col-span-3 rounded-2xl border border-white/10 bg-black/30 p-5 md:p-6 backdrop-blur-xl">
                    <form onSubmit={handleJoinSubmit} className="space-y-4">
                      {/* Avatar picker */}
                      <div>
                        <label className="block text-sm font-semibold text-white/80 mb-2">
                          Pick your vibe
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {AVATAR_OPTIONS.map((emoji) => (
                            <button
                              key={emoji}
                              type="button"
                              onClick={() => setParticipantAvatar(emoji)}
                              className={`w-10 h-10 rounded-xl text-xl transition border ${
                                participantAvatar === emoji
                                  ? "border-fuchsia-400/70 bg-fuchsia-500/20 shadow-[0_0_12px_rgba(232,121,249,0.4)]"
                                  : "border-white/10 bg-white/5 hover:border-white/25"
                              }`}
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-white/80 mb-2">
                          Your name
                        </label>
                        <input
                          type="text"
                          value={participantName}
                          onChange={(e) => setParticipantName(e.target.value)}
                          placeholder="What should we call you?"
                          className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 focus:outline-none focus:border-fuchsia-400/70 focus:ring-2 focus:ring-fuchsia-400/20"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-white/80 mb-2">
                          Group name <span className="text-white/40 font-normal">(optional)</span>
                        </label>
                        <input
                          type="text"
                          value={participantGroup}
                          onChange={(e) => setParticipantGroup(e.target.value)}
                          placeholder="e.g. The usual suspects"
                          className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 focus:outline-none focus:border-fuchsia-400/70 focus:ring-2 focus:ring-fuchsia-400/20"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-white/80 mb-2">
                          Room code
                        </label>
                        <input
                          type="text"
                          value={roomCode}
                          onChange={(e) => { const code = e.target.value.toUpperCase(); setRoomCode(code); setNeedsPassword(activeRooms.some(room => room.code === code && room.roomMode === 'secret')); setJoinPassword(''); setEntryError(''); }}
                          placeholder="ABC123"
                          maxLength={6}
                          className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 focus:outline-none focus:border-indigo-400/70 focus:ring-2 focus:ring-indigo-400/20 text-center text-2xl font-mono tracking-[0.35em]"
                          required
                        />
                      </div>

                      {needsPassword && <div>
                        <label htmlFor="join-room-password" className="block text-sm font-semibold text-white/80 mb-2">Room password</label>
                        <input id="join-room-password" type="password" autoComplete="current-password" value={joinPassword} onChange={e => setJoinPassword(e.target.value)} placeholder="Enter the room password" required className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 focus:outline-none focus:border-fuchsia-400/70" />
                      </div>}

                      <button
                        type="submit"
                        disabled={entryBusy || roomCode.length !== 6 || !participantName.trim() || (needsPassword && !joinPassword)}
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
              {mode === null && (
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
            Glad you’re here. I made a whole website to avoid saying that out loud.
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
