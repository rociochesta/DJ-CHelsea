import { useEffect, useState } from "react";
import { database, ref, onValue, set } from "../utils/firebase";
import { Mic, X } from "lucide-react";

/**
 * UnmuteRequestPrompt — listens for host unmute requests and shows a prompt.
 *
 * When the host requests a participant to unmute, it writes to
 * `karaoke-rooms/{roomCode}/unmuteRequests/{participantName}`.
 *
 * This component watches that path and shows a toast-like overlay
 * so the participant can accept (unmute) or dismiss.
 */
export default function UnmuteRequestPrompt({ roomCode, currentUser, localParticipant }) {
  const [hasRequest, setHasRequest] = useState(false);

  const userName = currentUser?.name;

  // Listen for unmute requests addressed to this user
  useEffect(() => {
    if (!roomCode || !userName) return;

    const requestRef = ref(database, `karaoke-rooms/${roomCode}/unmuteRequests/${userName}`);
    const unsub = onValue(requestRef, (snapshot) => {
      setHasRequest(!!snapshot.val());
    });

    return () => unsub();
  }, [roomCode, userName]);

  const handleAccept = async () => {
    // Unmute locally
    if (localParticipant?.setMicrophoneEnabled) {
      try {
        await localParticipant.setMicrophoneEnabled(true);
      } catch (e) {
        console.error("Failed to unmute:", e);
      }
    }

    // Clear the mute state in Firebase
    const muteRef = ref(database, `karaoke-rooms/${roomCode}/participantMutes/${userName}`);
    await set(muteRef, false);

    // Clear the request
    const requestRef = ref(database, `karaoke-rooms/${roomCode}/unmuteRequests/${userName}`);
    await set(requestRef, null);

    setHasRequest(false);
  };

  const handleDismiss = async () => {
    // Clear the request without unmuting
    const requestRef = ref(database, `karaoke-rooms/${roomCode}/unmuteRequests/${userName}`);
    await set(requestRef, null);

    setHasRequest(false);
  };

  if (!hasRequest) return null;

  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4">
      <div className="rounded-2xl border border-fuchsia-500/30 bg-[#0a0a1a]/95 backdrop-blur-xl shadow-2xl px-5 py-4 flex items-center gap-4">
        <div className="w-10 h-10 rounded-xl border border-fuchsia-500/25 bg-fuchsia-500/[0.08] flex items-center justify-center flex-shrink-0">
          <Mic className="w-5 h-5 text-fuchsia-400" />
        </div>

        <div className="min-w-0">
          <div className="text-sm font-semibold text-white/90">Host wants you to unmute</div>
          <div className="text-xs text-white/45 mt-0.5">Tap accept to turn on your mic</div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
          <button
            onClick={handleAccept}
            className="rounded-xl px-4 py-2 border border-emerald-500/40 bg-emerald-500/[0.1] text-emerald-300 text-sm font-semibold hover:bg-emerald-500/[0.2] transition active:scale-[0.97]"
          >
            Accept
          </button>

          <button
            onClick={handleDismiss}
            className="w-8 h-8 rounded-xl border border-white/10 bg-white/[0.03] text-white/50 hover:text-white/80 transition active:scale-[0.95] flex items-center justify-center"
            title="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
