import React, { useState } from "react";
import { database, ref, runTransaction } from "../utils/firebase";
import TwoTruthsGame from "./TwoTruthsGame";
import MusicTrivia from "./MusicTrivia";
import { createTrivia } from "../utils/musicTrivia";

export default function JamGames({ roomCode, currentUser, roomState }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const invitation = roomState?.gameInvitation;
  const response = invitation?.responses?.[currentUser?.id];
  const players = Object.values(roomState?.participants || {});
  const joined = players.filter((player) => invitation?.responses?.[player.id] === "joined");
  const session = invitation && roomState?.jamGames?.[invitation.id];
  const isInviter = invitation?.inviterId === currentUser?.id;
  const pending = invitation && !response;
  const gameTitle = invitation?.type === "music-trivia" ? "Music Trivia" : "Two Truths and a Lie";

  const act = async (operation) => {
    setBusy(true);
    setError("");
    try { await operation(); } catch { setError("Could not update the game. Please try again."); }
    finally { setBusy(false); }
  };
  const invite = (type) => act(async () => {
    const id = crypto.randomUUID();
    const trivia = type === "music-trivia" ? createTrivia() : null;
    const result = await runTransaction(ref(database, `karaoke-rooms/${roomCode}/gameInvitation`), (existing) => {
      if (existing) return;
      return { id, type, ...(trivia ? { trivia } : {}), inviterId: currentUser.id, inviterName: currentUser.name,
        createdAt: Date.now(), responses: { [currentUser.id]: "joined" } };
    });
    if (!result.committed) setError("Someone has already invited the room. Join that game below.");
  });
  const respond = (value) => act(() => runTransaction(ref(database, `karaoke-rooms/${roomCode}/gameInvitation`), (existing) => {
    if (existing?.id !== invitation.id) return;
    return {...existing, responses: {...existing.responses, [currentUser.id]: value}};
  }));
  const end = () => act(() => runTransaction(ref(database, `karaoke-rooms/${roomCode}/gameInvitation`), (existing) => {
    if (existing?.id !== invitation.id) return;
    return null;
  }));

  return (
    <section className="space-y-3">
      {pending && (
        <div role="status" className="rounded-2xl border border-fuchsia-400/40 bg-fuchsia-500/10 p-5">
          <h3 className="font-bold">Want to play {gameTitle}?</h3>
          <p className="text-sm text-white/70 mt-2">{invitation.inviterName} invited the room. Joining is optional; the music keeps playing.</p>
          <div className="flex gap-3 mt-4">
            <button disabled={busy} onClick={() => respond("joined")} className="rounded-xl border border-fuchsia-400/55 px-4 py-2">Join game</button>
            <button disabled={busy} onClick={() => respond("declined")} className="rounded-xl border border-white/15 px-4 py-2 text-white/70">No thanks</button>
          </div>
        </div>
      )}
      {error && <p role="alert" className="text-red-300 text-sm">{error}</p>}
      <details className="rounded-3xl border border-white/10 bg-white/[0.03] shadow-lg" key={invitation?.id || "idle"} open={response === "joined" ? true : undefined}>
        <summary className="cursor-pointer p-5 font-bold text-lg">Games</summary>
        <div className="px-5 pb-5 space-y-4">
          {!invitation ? (
            <div className="space-y-3">
            <button disabled={busy || !currentUser?.id} onClick={() => invite("two-truths")} className="w-full rounded-2xl border border-white/15 bg-black/20 p-4 text-left hover:border-fuchsia-400/55 disabled:opacity-40">
              <span className="block font-semibold">Two Truths and a Lie</span>
              <span className="block mt-1 text-sm text-white/60">Invite the guests to play. Everyone who joins writes three statements.</span>
            </button>
            <button disabled={busy || !currentUser?.id} onClick={() => invite("music-trivia")} className="w-full rounded-2xl border border-white/15 bg-black/20 p-4 text-left hover:border-fuchsia-400/55 disabled:opacity-40">
              <span className="block font-semibold">Music Trivia</span>
              <span className="block mt-1 text-sm text-white/60">Race to answer. First correct answer gets the point!</span>
            </button>
            </div>
          ) : (
            <>
              <p className="text-sm text-white/60">{joined.length} joined · {players.filter((player) => !invitation.responses?.[player.id]).length} deciding</p>
              {response === "declined" && <><p className="text-sm text-white/60">You declined this invitation. You can join later.</p><button disabled={busy} onClick={() => respond("joined")} className="rounded-xl border border-white/15 px-4 py-2">Join game</button></>}
              {response === "joined" && (invitation.type === "music-trivia"
                ? <MusicTrivia key={invitation.id} roomCode={roomCode} currentUser={currentUser} invitation={invitation} players={joined} />
                : <TwoTruthsGame key={invitation.id} sessionId={invitation.id} roomCode={roomCode} currentUser={currentUser} roomState={{...roomState, participants:Object.fromEntries(joined.map((player) => [player.id, player])), gameStatements:session?.statements || {}, gameGuesses:session?.guesses || {}}} />)}
              {(isInviter || roomState?.hostId === currentUser?.id) ? <button disabled={busy} onClick={end} className="text-sm text-white/60 hover:text-white">End game</button> : response === "joined" && <button disabled={busy} onClick={() => respond("declined")} className="text-sm text-white/60 hover:text-white">Leave game</button>}
            </>
          )}
        </div>
      </details>
    </section>
  );
}
