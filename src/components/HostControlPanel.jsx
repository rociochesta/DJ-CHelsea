import { useState } from "react";
import { useParticipants } from "@livekit/components-react";
import {
  X,
  Play,
  Pause,
  SkipForward,
  MicOff,
  Lock,
  Unlock,
  Mic,
  UserX,
  ChevronDown,
  ChevronUp,
  Users,
  Settings,
  Sliders,
  Sparkles,
} from "lucide-react";

// ─── Bot message pools ────────────────────────────────────────────────────────
const BOT_MESSAGES = {
  safety: [
    "🔒 Share Mode disabled.\nIf you are struggling with a burning desire to use, hurt yourself, or hurt someone, please reach out to the Host immediately. You matter and support is available.",
    "🔒 Share Mode is currently disabled.\nIf you are experiencing a burning desire to use, hurt yourself, or hurt someone else, please contact the Host immediately. You are not alone.",
    "🔒 Share Mode is off.\nIf you are having thoughts of using, self-harm, or harming others, reach out to the Host right away. Support is here.",
    "🔒 Share Mode OFF.\nIf you feel a burning desire to use or harm yourself/others, message the Host now.",
    "🔒 Share Mode disabled.\nIf you are struggling with a burning desire to use, hurt yourself, or hurt someone, please reach out to the Host immediately. You matter and support is available.",
  ],
  spanjft: [
    "📘 If you're here and mysteriously have nothing to do… go check Today's SPAN or JFT. Growth occasionally happens when we least want it.",
    "📘 If you're just floating around with free time… Today's SPAN and JFT are waiting for you.",
    "📘 Got a quiet moment? Take a look at Today's SPAN / JFT.",
    "📘 Today's SPAN / JFT might accidentally become your meeting topic later. Spiritual foreshadowing is real.",
    "📘 Go check Today's SPAN or JFT. It may contain information about you that you weren't emotionally prepared for.",
    "📘 Could be boring. Could be life-altering. We won't know until you click.",
    "📘 You might discover the meeting already started — internally.",
    "📘 Today's SPAN / JFT may become tonight's 'why am I like this' discussion.",
  ],
  playful: [
    "😈 This music ain't it. Pick something smoother… warmer… a little dangerous. Impress the Host.",
    "😈 Current vibe: questionable. Choose something with more chemistry.",
    "😈 Music weak. Energy low. Select a track with better intentions.",
    "😈 This song not doing you any favors. Try again — darker, smoother, hotter.",
    "😈 Respectfully… this ain't the one. Redeem yourself.",
    "😈 The room needs atmosphere. Bring something hypnotic.",
    "😈 This track committed a minor crime. Please select something better.",
    "😈 This ain't it. Try again.",
  ],
  sad: [
    "🖤 This one feels a little empty. Choose something that understands you better tonight.",
    "🖤 Music not reaching the heart. Try something slower… softer.",
    "🖤 Not every song finds us. Pick one that feels like your story.",
    "🖤 This track missed the feeling. Choose something with more soul.",
    "🖤 Some nights need softer music.",
    "🖤 Sometimes the right song finds the part of us we don't talk about. Try again.",
  ],
  dark: [
    "🌑 Choose something that sounds like the inside of your mind at 2AM.",
    "🌑 Not every track carries weight. Try one that breathes in the dark.",
    "🌑 Some music hides from the truth. Pick one that doesn't.",
    "🌑 Low light. Quiet room. Choose the song that feels like night.",
    "🌑 Too light. Try darker.",
    "🌑 Bring the sound of slow thoughts and long nights.",
    "🌑 If the music doesn't touch the shadow, it's not the right one.",
  ],
  dance: [
    "💃 Enough feelings. Time to move. Bring something with rhythm.",
    "💃 This room has legs. Use them.",
    "💃 Mood shift. We dance now.",
    "💃 Sad hours closed. Dance floor open.",
    "💃 Emotional processing complete. Initiating: questionable dancing.",
    "💃 Bring the beat. The room is ready.",
    "💃 Lights up. Mood up. Give us something alive.",
    "💃 Dancing recommended. Coordination optional.",
  ],
};

const pickMsg = (arr) => arr[Math.floor(Math.random() * arr.length)];

export default function HostControlPanel({
  isOpen,
  onClose,
  roomState,
  roomCode,
  onSkip,
  onMuteAll,
  onMuteToggle,
  onRequestUnmute,
  onPlayPause,
  onKick,
  onUpdateHostControls,
  onSendBotMessage,
}) {
  const [expandedSection, setExpandedSection] = useState("room");
  const [kickConfirm, setKickConfirm] = useState(null);

  const liveKitParticipants = useParticipants();

  const playbackState = roomState?.playbackState;
  const isPlaying = playbackState?.isPlaying || false;
  const currentSong = roomState?.currentSong;
  const participantMutes = roomState?.participantMutes || {};
  const hostControls = roomState?.hostControls || {};
  const micsLocked = hostControls.micsLocked || false;
  const autoMuteOnJoin = hostControls.autoMuteOnJoin !== false;
  const onlySingerMic = hostControls.onlySingerMic || false;
  const shareMode = hostControls.shareMode !== false; // default ON
  const currentSinger =
    currentSong?.requestedBy || currentSong?.singerName || "";

  const toggleSection = (section) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const handleKick = (participantId, participantName) => {
    if (kickConfirm === participantId) {
      onKick(participantId, participantName);
      setKickConfirm(null);
    } else {
      setKickConfirm(participantId);
      setTimeout(() => setKickConfirm(null), 3000);
    }
  };

  const outlineBtn = (tone = "fuchsia") =>
    tone === "indigo"
      ? "border-indigo-500/30 hover:border-indigo-400/45 hover:shadow-[0_0_14px_rgba(99,102,241,0.14)]"
      : tone === "red"
      ? "border-red-500/30 hover:border-red-400/45 hover:shadow-[0_0_14px_rgba(239,68,68,0.14)]"
      : tone === "emerald"
      ? "border-emerald-500/30 hover:border-emerald-400/45 hover:shadow-[0_0_14px_rgba(16,185,129,0.14)]"
      : tone === "neutral"
      ? "border-white/10 hover:border-white/20 hover:shadow-[0_0_12px_rgba(232,121,249,0.10)]"
      : "border-fuchsia-500/35 hover:border-fuchsia-400/50 hover:shadow-[0_0_14px_rgba(232,121,249,0.16)]";

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative w-full max-w-md h-full overflow-y-auto border-l border-white/10 bg-[#0a0a1a]/95 backdrop-blur-xl shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 border-b border-white/10 bg-[#0a0a1a]/95 backdrop-blur-xl p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl border border-white/10 bg-white/[0.03] flex items-center justify-center">
                <Sliders className="w-5 h-5 text-white/70" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white/90">
                  Host Controls
                </h2>
                <p className="text-xs text-white/45">Manage your room</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className={[
                "w-10 h-10 rounded-2xl border bg-white/[0.03]",
                "text-white/70 transition active:scale-[0.98]",
                outlineBtn("neutral"),
              ].join(" ")}
            >
              <X className="w-5 h-5 mx-auto" />
            </button>
          </div>
        </div>

        <div className="p-4 space-y-3">
          {/* ── ROOM CONTROLS ── */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] overflow-hidden">
            <button
              onClick={() => toggleSection("room")}
              className="w-full flex items-center justify-between p-4 hover:bg-white/[0.02] transition"
            >
              <div className="flex items-center gap-3">
                <Mic className="w-5 h-5 text-fuchsia-400/80" />
                <span className="font-semibold text-white/85">
                  Room Controls
                </span>
              </div>
              {expandedSection === "room" ? (
                <ChevronUp className="w-4 h-4 text-white/50" />
              ) : (
                <ChevronDown className="w-4 h-4 text-white/50" />
              )}
            </button>

            {expandedSection === "room" && (
              <div className="px-4 pb-4 space-y-3">
                {/* Now playing */}
                {currentSong && (
                  <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
                    <div className="text-[10px] uppercase tracking-widest text-white/40 mb-1">
                      Now Playing
                    </div>
                    <div className="text-sm font-semibold text-white/80 truncate">
                      {currentSong.title}
                    </div>
                    {currentSinger && (
                      <div className="text-xs text-fuchsia-400/70 mt-0.5">
                        Singer: {currentSinger}
                      </div>
                    )}
                  </div>
                )}

                {/* Playback controls */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={onPlayPause}
                    disabled={!currentSong}
                    className={[
                      "flex items-center justify-center gap-2 rounded-xl px-3 py-3",
                      "border bg-transparent text-white/85 transition active:scale-[0.98]",
                      currentSong ? outlineBtn("emerald") : "border-white/5 text-white/30 cursor-not-allowed",
                    ].join(" ")}
                  >
                    {isPlaying ? (
                      <>
                        <Pause className="w-4 h-4" />
                        <span className="text-sm font-semibold">Pause</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4" />
                        <span className="text-sm font-semibold">Play</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={onSkip}
                    disabled={!currentSong}
                    className={[
                      "flex items-center justify-center gap-2 rounded-xl px-3 py-3",
                      "border bg-transparent text-white/85 transition active:scale-[0.98]",
                      currentSong ? outlineBtn("indigo") : "border-white/5 text-white/30 cursor-not-allowed",
                    ].join(" ")}
                  >
                    <SkipForward className="w-4 h-4" />
                    <span className="text-sm font-semibold">Skip</span>
                  </button>
                </div>

                {/* Mic controls */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={onMuteAll}
                    className={[
                      "flex items-center justify-center gap-2 rounded-xl px-3 py-3",
                      "border bg-transparent text-white/85 transition active:scale-[0.98]",
                      outlineBtn("indigo"),
                    ].join(" ")}
                  >
                    <MicOff className="w-4 h-4" />
                    <span className="text-sm font-semibold">Mute All</span>
                  </button>

                  <button
                    onClick={() =>
                      onUpdateHostControls({ micsLocked: !micsLocked })
                    }
                    className={[
                      "flex items-center justify-center gap-2 rounded-xl px-3 py-3",
                      "border bg-transparent transition active:scale-[0.98]",
                      micsLocked
                        ? "border-red-500/40 text-red-400/90 bg-red-500/[0.06]"
                        : outlineBtn("neutral") + " text-white/85",
                    ].join(" ")}
                  >
                    {micsLocked ? (
                      <>
                        <Lock className="w-4 h-4" />
                        <span className="text-sm font-semibold">Locked</span>
                      </>
                    ) : (
                      <>
                        <Unlock className="w-4 h-4" />
                        <span className="text-sm font-semibold">Lock Mics</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ── PARTICIPANTS ── */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] overflow-hidden">
            <button
              onClick={() => toggleSection("participants")}
              className="w-full flex items-center justify-between p-4 hover:bg-white/[0.02] transition"
            >
              <div className="flex items-center gap-3">
                <Users className="w-5 h-5 text-indigo-400/80" />
                <span className="font-semibold text-white/85">
                  Participants
                </span>
                <span className="text-xs text-white/40 ml-1">
                  ({liveKitParticipants?.length || 0})
                </span>
              </div>
              {expandedSection === "participants" ? (
                <ChevronUp className="w-4 h-4 text-white/50" />
              ) : (
                <ChevronDown className="w-4 h-4 text-white/50" />
              )}
            </button>

            {expandedSection === "participants" && (
              <div className="px-4 pb-4 space-y-1">
                {liveKitParticipants.length === 0 && (
                  <div className="text-sm text-white/40 text-center py-4">
                    No participants yet
                  </div>
                )}

                {liveKitParticipants.map((p, idx) => {
                  const name = p?.name || p?.identity || `Guest ${idx + 1}`;
                  const identity = p?.identity || "";
                  const muteKey = identity || name;
                  const isMuted = participantMutes?.[muteKey] === true;
                  const isSpeaking = p?.isSpeaking || false;
                  const isSinger = name === currentSinger;
                  const isLocal = !!p?.isLocal;

                  // Find Firebase participant record for kick
                  const fbParticipants = roomState?.participants
                    ? Object.values(roomState.participants)
                    : [];
                  const fbRecord = fbParticipants.find(
                    (fp) => fp.name === name || fp.id === identity
                  );
                  const isHost = fbRecord?.role === "host";

                  return (
                    <div
                      key={identity || `${name}-${idx}`}
                      className={[
                        "flex items-center gap-3 rounded-xl px-3 py-2.5 transition",
                        isSpeaking
                          ? "bg-emerald-500/[0.06] border border-emerald-500/20"
                          : "border border-transparent hover:bg-white/[0.02]",
                      ].join(" ")}
                    >
                      {/* Speaking indicator */}
                      <div
                        className={[
                          "w-2 h-2 rounded-full flex-shrink-0 transition",
                          isSpeaking ? "bg-emerald-400 shadow-[0_0_6px_rgba(16,185,129,0.5)]" : "bg-white/10",
                        ].join(" ")}
                      />

                      {/* Mic state */}
                      <div className="flex-shrink-0">
                        {micsLocked && !isSinger ? (
                          <Lock className="w-3.5 h-3.5 text-red-400/60" />
                        ) : isMuted ? (
                          <MicOff className="w-3.5 h-3.5 text-white/30" />
                        ) : (
                          <Mic className="w-3.5 h-3.5 text-emerald-400/70" />
                        )}
                      </div>

                      {/* Name */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-white/80 truncate">
                            {name}
                          </span>
                          {isHost && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-lg border border-fuchsia-500/25 text-fuchsia-400/70">
                              Host
                            </span>
                          )}
                          {isSinger && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-lg border border-fuchsia-500/25 text-fuchsia-400/70">
                              Singing
                            </span>
                          )}
                          {isSpeaking && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-lg border border-emerald-500/25 text-emerald-400/70">
                              Speaking
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      {!isLocal && (
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <button
                            onClick={() => {
                              if (isMuted) {
                                // Can't force-unmute remotely — send a request
                                onRequestUnmute(muteKey);
                              } else {
                                onMuteToggle(muteKey, true);
                              }
                            }}
                            className={[
                              "w-8 h-8 rounded-xl border bg-transparent transition active:scale-[0.95]",
                              isMuted
                                ? outlineBtn("emerald")
                                : outlineBtn("indigo"),
                            ].join(" ")}
                            title={isMuted ? "Request unmute" : "Mute"}
                          >
                            {isMuted ? (
                              <Mic className="w-3.5 h-3.5 mx-auto text-emerald-400/70" />
                            ) : (
                              <MicOff className="w-3.5 h-3.5 mx-auto text-white/60" />
                            )}
                          </button>

                          {!isHost && fbRecord && (
                            <button
                              onClick={() => handleKick(fbRecord.id, name)}
                              className={[
                                "w-8 h-8 rounded-xl border bg-transparent transition active:scale-[0.95]",
                                kickConfirm === fbRecord.id
                                  ? "border-red-500/50 bg-red-500/[0.1]"
                                  : outlineBtn("red"),
                              ].join(" ")}
                              title={
                                kickConfirm === fbRecord.id
                                  ? "Click again to confirm kick"
                                  : "Kick"
                              }
                            >
                              <UserX
                                className={[
                                  "w-3.5 h-3.5 mx-auto",
                                  kickConfirm === fbRecord.id
                                    ? "text-red-400"
                                    : "text-white/50",
                                ].join(" ")}
                              />
                            </button>
                          )}
                        </div>
                      )}

                      {isLocal && (
                        <span className="text-[10px] text-white/30">You</span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── RULES ── */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] overflow-hidden">
            <button
              onClick={() => toggleSection("rules")}
              className="w-full flex items-center justify-between p-4 hover:bg-white/[0.02] transition"
            >
              <div className="flex items-center gap-3">
                <Settings className="w-5 h-5 text-amber-400/80" />
                <span className="font-semibold text-white/85">Room Rules</span>
              </div>
              {expandedSection === "rules" ? (
                <ChevronUp className="w-4 h-4 text-white/50" />
              ) : (
                <ChevronDown className="w-4 h-4 text-white/50" />
              )}
            </button>

            {expandedSection === "rules" && (
              <div className="px-4 pb-4 space-y-3">
                {/* Auto-mute on join */}
                <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3">
                  <div>
                    <div className="text-sm font-semibold text-white/80">
                      Auto-mute on join
                    </div>
                    <div className="text-xs text-white/40 mt-0.5">
                      New participants join muted
                    </div>
                  </div>
                  <button
                    onClick={() =>
                      onUpdateHostControls({ autoMuteOnJoin: !autoMuteOnJoin })
                    }
                    className={[
                      "relative w-11 h-6 rounded-full transition-colors",
                      autoMuteOnJoin ? "bg-fuchsia-500/50" : "bg-white/10",
                    ].join(" ")}
                  >
                    <div
                      className={[
                        "absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform",
                        autoMuteOnJoin ? "translate-x-[22px]" : "translate-x-0.5",
                      ].join(" ")}
                    />
                  </button>
                </div>

                {/* Only singer mic */}
                <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3">
                  <div>
                    <div className="text-sm font-semibold text-white/80">
                      Only singer mic
                    </div>
                    <div className="text-xs text-white/40 mt-0.5">
                      Only the current singer can unmute
                    </div>
                  </div>
                  <button
                    onClick={() =>
                      onUpdateHostControls({ onlySingerMic: !onlySingerMic })
                    }
                    className={[
                      "relative w-11 h-6 rounded-full transition-colors",
                      onlySingerMic ? "bg-fuchsia-500/50" : "bg-white/10",
                    ].join(" ")}
                  >
                    <div
                      className={[
                        "absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform",
                        onlySingerMic ? "translate-x-[22px]" : "translate-x-0.5",
                      ].join(" ")}
                    />
                  </button>
                </div>

                {/* Share Mode */}
                <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3">
                  <div>
                    <div className="text-sm font-semibold text-white/80">
                      Share Mode
                    </div>
                    <div className="text-xs text-white/40 mt-0.5">
                      Allow participants to share / speak
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      const next = !shareMode;
                      onUpdateHostControls({ shareMode: next });
                      if (!next) {
                        onSendBotMessage?.(pickMsg(BOT_MESSAGES.safety), "safety");
                      }
                    }}
                    className={[
                      "relative w-11 h-6 rounded-full transition-colors",
                      shareMode ? "bg-fuchsia-500/50" : "bg-red-500/40",
                    ].join(" ")}
                  >
                    <div
                      className={[
                        "absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform",
                        shareMode ? "translate-x-[22px]" : "translate-x-0.5",
                      ].join(" ")}
                    />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ── BOT MESSAGES ── */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] overflow-hidden">
            <button
              onClick={() => toggleSection("bot")}
              className="w-full flex items-center justify-between p-4 hover:bg-white/[0.02] transition"
            >
              <div className="flex items-center gap-3">
                <Sparkles className="w-5 h-5 text-fuchsia-400/80" />
                <span className="font-semibold text-white/85">Bot Messages</span>
              </div>
              {expandedSection === "bot" ? (
                <ChevronUp className="w-4 h-4 text-white/50" />
              ) : (
                <ChevronDown className="w-4 h-4 text-white/50" />
              )}
            </button>

            {expandedSection === "bot" && (
              <div className="px-4 pb-4 space-y-2">
                <p className="text-xs text-white/35 mb-3">
                  Send an automated message to the chat room.
                </p>

                {[
                  { key: "safety",  label: "🔒 Safety / Crisis",    sub: "Share Mode off + crisis support",  border: "border-red-500/30 hover:border-red-400/45",    text: "text-red-200/90"   },
                  { key: "spanjft", label: "📘 SPAN / JFT",          sub: "Encourage daily reading",           border: "border-blue-500/30 hover:border-blue-400/45",  text: "text-blue-200/90"  },
                  { key: "playful", label: "😈 Playful / Flirty",    sub: "Tease the song choice",             border: "border-fuchsia-500/30 hover:border-fuchsia-400/45", text: "text-fuchsia-200/90" },
                  { key: "sad",     label: "🖤 Sad",                  sub: "Softer, emotional mood",            border: "border-white/10 hover:border-white/20",        text: "text-white/75"     },
                  { key: "dark",    label: "🌑 Very Dark",            sub: "Deep / introspective vibe",         border: "border-indigo-500/30 hover:border-indigo-400/45", text: "text-indigo-200/90" },
                  { key: "dance",   label: "💃 Dancing / Energy",     sub: "Get the room moving",               border: "border-amber-500/30 hover:border-amber-400/45", text: "text-amber-200/90"  },
                ].map(({ key, label, sub, border, text }) => (
                  <button
                    key={key}
                    onClick={() => onSendBotMessage?.(pickMsg(BOT_MESSAGES[key]), key)}
                    className={[
                      "w-full flex items-start gap-3 rounded-xl px-3 py-2.5 border bg-white/[0.02] hover:bg-white/[0.04] transition active:scale-[0.98] text-left",
                      border,
                    ].join(" ")}
                  >
                    <div className="min-w-0">
                      <div className={["text-sm font-semibold", text].join(" ")}>{label}</div>
                      <div className="text-xs text-white/35 mt-0.5">{sub}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
