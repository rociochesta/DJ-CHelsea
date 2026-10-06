import React, { useEffect, useState } from "react";
import { database, ref, runTransaction } from "../utils/firebase";
import TwoTruthsGame from "./TwoTruthsGame";
import MusicTrivia from "./MusicTrivia";
import { createTrivia } from "../utils/musicTrivia";
import MusicQuiz from "./MusicQuiz";
import { createMusicQuiz, loadMusicQuizCatalog, musicQuizCategories, musicQuizSong, finishMusicQuiz } from "../utils/musicQuiz";

export default function JamGames({ roomCode, currentUser, roomState, featured = false }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [catalog, setCatalog] = useState(null);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [questionCount, setQuestionCount] = useState(20);
  const [catalogError, setCatalogError] = useState('');
  const [catalogRetry, setCatalogRetry] = useState(0);
  const categories = musicQuizCategories(catalog);
  useEffect(() => {
    let active = true;
    setCatalogError('');
    loadMusicQuizCatalog().then(songs => {
      if (!active) return;
      setCatalog(songs);
      setSelectedCategories(musicQuizCategories(songs));
    }).catch(cause => { if (active) setCatalogError(cause.message); });
    return () => { active = false; };
  }, [catalogRetry]);
  const invitation = roomState?.gameInvitation;
  const response = invitation?.responses?.[currentUser?.id];
  const players = Object.values(roomState?.participants || {});
  const joined = players.filter((player) => invitation?.responses?.[player.id] === "joined");
  const session = invitation && roomState?.jamGames?.[invitation.id];
  const isInviter = invitation?.inviterId === currentUser?.id;
  const pending = invitation && !response;
  const gameTitle = invitation?.type === "music-quiz" ? "Music Quiz" : invitation?.type === "music-trivia" ? "Music Trivia" : "Two Truths and a Lie";
  const quizComplete = invitation?.type === 'music-quiz' && !musicQuizSong(invitation.quiz);

  const act = async (operation) => {
    setBusy(true);
    setError("");
    try { await operation(); } catch (cause) { setError(cause.message || "Could not update the game. Please try again."); }
    finally { setBusy(false); }
  };
  const invite = (type) => act(async () => {
    const id = crypto.randomUUID();
    const trivia = type === "music-trivia" ? createTrivia() : null;
    const quiz = type === "music-quiz" ? createMusicQuiz(catalog, Math.random, selectedCategories, questionCount) : null;
    const result = await runTransaction(ref(database, `karaoke-rooms/${roomCode}/gameInvitation`), (existing) => {
      if (existing) return;
      return { id, type, ...(trivia ? { trivia } : {}), ...(quiz ? { quiz } : {}), inviterId: currentUser.id, inviterName: currentUser.name,
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
    if (currentUser.id !== existing.inviterId && currentUser.id !== roomState?.hostId) return;
    if (existing.type === 'music-quiz' && !quizComplete) {
      return finishMusicQuiz(existing, invitation.id, currentUser, players, roomState?.hostId);
    }
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
      <details className="rounded-3xl border border-white/10 bg-white/[0.03] shadow-lg" key={invitation?.id || "idle"} open={featured || response === "joined" ? true : undefined}>
        <summary className="cursor-pointer p-5 font-bold text-lg">{featured ? 'Music Quiz · Listen, guess, win' : 'Games'}</summary>
        <div className="px-5 pb-5 space-y-4">
          {!invitation ? (
            <div className="space-y-3">
            <div className="rounded-2xl border border-white/15 bg-black/20 p-4 space-y-3">
              <div>
                <span className="block font-semibold">Music Quiz</span>
                <span className="block mt-1 text-sm text-white/60">Listen to a 30-second clip and guess. Invite the room to play!</span>
              </div>
              <fieldset disabled={busy} className="space-y-2">
                <legend className="text-sm text-white/70 mb-2">Choose one or more categories</legend>
                <div className="flex flex-wrap gap-2">{categories.map(category => <label key={category} className={`flex items-center gap-2 cursor-pointer rounded-xl border px-3 py-2 ${selectedCategories.includes(category) ? 'border-fuchsia-400/60 bg-fuchsia-500/15' : 'border-white/15'}`}>
                  <input type="checkbox" checked={selectedCategories.includes(category)} onChange={event => setSelectedCategories(current => event.target.checked ? [...current, category] : current.filter(value => value !== category))} className="accent-fuchsia-500" />
                  <span>{category}</span>
                </label>)}</div>
              </fieldset>
              <label className="block text-sm text-white/70">Number of questions
                <select value={questionCount} disabled={busy} onChange={event => setQuestionCount(event.target.value === 'unlimited' ? 'unlimited' : Number(event.target.value))} className="mt-2 block w-full rounded-xl border border-white/15 bg-gray-900 px-3 py-2 text-white">
                  <option value={20}>20 questions</option>
                  <option value={50}>50 questions</option>
                  <option value="unlimited">Continuous — until the host ends the game</option>
                </select>
              </label>
              {!catalog && !catalogError && <p role="status" className="text-sm text-white/60">Loading categories…</p>}
              {catalogError && <div role="alert" className="text-sm text-red-300">{catalogError} <button onClick={() => setCatalogRetry(value => value + 1)} className="underline">Try again</button></div>}
              {catalog && !selectedCategories.length && <p role="status" className="text-sm text-amber-200">Select at least one category.</p>}
              <button disabled={busy || !currentUser?.id || !catalog || !selectedCategories.length} onClick={() => invite("music-quiz")} className="rounded-xl bg-fuchsia-600 px-4 py-2 disabled:opacity-40">Invite room to Music Quiz</button>
            </div>
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
              {(response === "joined" || quizComplete) && (invitation.type === "music-quiz"
                ? <MusicQuiz key={invitation.id} roomCode={roomCode} currentUser={currentUser} invitation={invitation} players={joined} />
                : invitation.type === "music-trivia"
                ? <MusicTrivia key={invitation.id} roomCode={roomCode} currentUser={currentUser} invitation={invitation} players={joined} />
                : <TwoTruthsGame key={invitation.id} sessionId={invitation.id} roomCode={roomCode} currentUser={currentUser} roomState={{...roomState, participants:Object.fromEntries(joined.map((player) => [player.id, player])), gameStatements:session?.statements || {}, gameGuesses:session?.guesses || {}}} />)}
              {(isInviter || roomState?.hostId === currentUser?.id) ? <button disabled={busy} onClick={end} className="rounded-xl border border-fuchsia-400/40 px-4 py-2 text-sm hover:bg-fuchsia-500/10">{invitation.type === 'music-quiz' ? quizComplete ? 'Back to game setup' : 'Finish game & show results' : 'End game'}</button> : response === "joined" && !quizComplete && <button disabled={busy} onClick={() => respond("declined")} className="text-sm text-white/60 hover:text-white">Leave game</button>}
            </>
          )}
        </div>
      </details>
    </section>
  );
}
