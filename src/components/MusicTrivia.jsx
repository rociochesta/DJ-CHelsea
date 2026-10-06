import React, { useState } from 'react';
import { database, ref, runTransaction } from '../utils/firebase';
import { MUSIC_QUESTIONS, answerTrivia } from '../utils/musicTrivia';

export default function MusicTrivia({ roomCode, currentUser, invitation, players }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const trivia = invitation.trivia;
  const round = trivia.round;
  const question = MUSIC_QUESTIONS[trivia.order[round]];
  const lastWinner = trivia.winners?.[round - 1];
  const attempts = trivia.attempts?.[round]?.[currentUser.id] || {};
  const answer = async (choice) => {
    if (busy) return;
    setBusy(true); setError('');
    try {
      await runTransaction(ref(database, `karaoke-rooms/${roomCode}/gameInvitation`), current =>
        answerTrivia(current, invitation.id, round, currentUser, choice)
      );
    } catch { setError('Could not send your answer. Please try again.'); }
    finally { setBusy(false); }
  };
  return <section className="rounded-2xl border border-fuchsia-400/20 bg-black/20 p-5 space-y-4">
    <h2 className="text-2xl font-bold">Music Trivia</h2>
    <p className="text-sm text-white/60">First correct answer wins 1 point. The next question appears automatically for everyone.</p>
    <div className="flex flex-wrap gap-2" aria-label="Trivia scores">{[...players].sort((a,b) => (trivia.scores?.[b.id] || 0) - (trivia.scores?.[a.id] || 0)).map(player => <span key={player.id} className="rounded-full border border-white/15 px-3 py-2 text-sm">{player.name}: {trivia.scores?.[player.id] || 0} points</span>)}</div>
    {lastWinner && <div role="status" className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-3 text-sm">🎉 {lastWinner.name} got it first! +1 point<br /><span className="text-white/60">Answer: {lastWinner.answer}</span></div>}
    {question ? <>
      <p className="text-sm text-fuchsia-300">Question {round + 1} of {trivia.order.length}</p>
      <h3 className="text-xl font-semibold" aria-live="polite">{question.question}</h3>
      <div className="grid grid-cols-1 gap-2" key={round}>{question.choices.map((choice,index) => <button key={index} disabled={busy || !!attempts[index]} onClick={() => answer(index)} className={`rounded-xl border p-3 text-left transition disabled:opacity-50 ${attempts[index] ? 'border-amber-400/40' : 'border-white/15 hover:border-fuchsia-400/60 hover:bg-fuchsia-500/10'}`}>{choice}{attempts[index] && ' — incorrect'}</button>)}</div>
      {Object.keys(attempts).length > 0 && <p className="text-sm text-white/60">Try another answer before someone else gets it!</p>}
    </> : <div role="status" className="text-center py-6"><p className="text-4xl mb-3">🏆</p><h3 className="text-xl font-bold">Trivia complete!</h3><p className="text-white/60 mt-2">Check the final scores above. End this game to invite everyone to a new one.</p></div>}
    {error && <p role="alert" className="text-red-300 text-sm">{error}</p>}
  </section>;
}
