import React, { useState, useEffect, useRef } from 'react';
import { Gamepad2, Check, Pencil } from 'lucide-react';
import { database, ref, runTransaction } from '../utils/firebase';
import { makeEntry, recordGuess, getScores } from '../utils/twoTruths';

const LABELS = ['Truth 1', 'Truth 2', 'Lie'];
function editableValues(entry) {
  if (!entry?.lieId) return ['', '', ''];
  return [...entry.statements.filter(card => card.id !== entry.lieId).map(card => card.text), entry.statements.find(card => card.id === entry.lieId)?.text || ''];
}
export default function TwoTruthsGame({ roomCode, currentUser, roomState, sessionId }) {
  const entries = roomState?.gameStatements || {};
  const guesses = roomState?.gameGuesses || {};
  const saved = entries[currentUser?.id];
  const [draft, setDraft] = useState(() => editableValues(saved));
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [reaction, setReaction] = useState(null);
  const seen = useRef(new Set());
  const mountedAt = useRef(Date.now());
  const players = Object.values(roomState?.participants || {});
  const scores = getScores(guesses);

  useEffect(() => {
    let latest;
    Object.entries(guesses).forEach(([revision, round]) => Object.entries(round).forEach(([id, guess]) => {
      const key = `${revision}:${id}`;
      if (!seen.current.has(key)) {
        seen.current.add(key);
        if (guess.correct && guess.at >= mountedAt.current && Date.now() - guess.at < 8000 && (!latest || guess.at > latest.at)) latest = guess;
      }
    }));
    if (latest) setReaction(latest);
  }, [guesses]);
  useEffect(() => {
    if (!reaction) return;
    const timer = setTimeout(() => setReaction(null), 4000);
    return () => clearTimeout(timer);
  }, [reaction]);

  const act = async (operation) => {
    setBusy(true); setError('');
    try { await operation(); } catch { setError('Could not save your game action. Please try again.'); }
    finally { setBusy(false); }
  };
  const submit = (event) => {
    event.preventDefault();
    if (!currentUser?.id || draft.some(value => !value.trim()) || busy) return;
    const entry = makeEntry(draft);
    act(async () => {
      await runTransaction(ref(database, `karaoke-rooms/${roomCode}/jamGames/${sessionId}`), session => ({
        ...session, statements: {...session?.statements, [currentUser.id]: entry},
      }));
      setEditing(false);
    });
  };
  const guess = (targetId, entry, choiceId) => act(() => runTransaction(
    ref(database, `karaoke-rooms/${roomCode}/jamGames/${sessionId}`),
    session => recordGuess(session, targetId, entry.revision, currentUser, choiceId)
  ));

  return <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-5 space-y-6">
    {reaction && <div role="status" className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center">
      <div className="rounded-3xl border border-fuchsia-300/40 bg-[#171125]/95 p-8 text-center shadow-2xl">
        <div className="text-6xl motion-safe:animate-bounce" aria-hidden="true">🎉 🥳 ✨</div>
        <p className="mt-4 font-bold text-xl">{reaction.playerName} spotted the lie!</p><p className="text-fuchsia-300 mt-2">+1 point</p>
      </div>
    </div>}
    <div><div className="flex gap-2 text-fuchsia-300 text-sm"><Gamepad2 className="w-5 h-5" /> Room game</div>
      <h2 className="mt-2 text-2xl font-bold">Two Truths and a Lie</h2>
      <p className="mt-2 text-white/60">Write two truths and one lie. We shuffle them before the others guess. One guess per player, per round.</p>
    </div>
    <div className="flex flex-wrap gap-2" aria-label="Game scores">{players.map(player => <span key={player.id} className="rounded-full border border-white/15 px-3 py-2 text-sm">{player.name}: {scores[player.id] || 0} points</span>)}</div>
    {error && <p role="alert" className="text-red-300 text-sm">{error}</p>}
    <div className="rounded-2xl border border-fuchsia-400/20 bg-black/20 p-4">
      <h3 className="font-semibold text-lg mb-3">Your statements</h3>
      {saved?.lieId && !editing ? <>
        <ol className="space-y-3">{editableValues(saved).map((text,index) => <li key={index} className="rounded-xl bg-white/5 p-3 break-words"><span className="text-fuchsia-300 mr-2">{LABELS[index]}:</span>{text}</li>)}</ol>
        <p className="mt-3 text-sm text-emerald-300 flex gap-2"><Check className="w-4 h-4" /> Shared in a shuffled order</p>
        <button disabled={busy} onClick={() => {setDraft(editableValues(saved)); setEditing(true);}} className="mt-4 inline-flex gap-2 text-white/70"><Pencil className="w-4 h-4" /> Write a new round</button>
      </> : <form onSubmit={submit} className="space-y-4">
        {draft.map((value,index) => <label key={index} className="block text-sm font-semibold text-white/80">{LABELS[index]}
          <input required maxLength={200} disabled={busy} value={value} placeholder={index === 2 ? 'A convincing bluff…' : 'Something true about you…'} onChange={event => setDraft(items => items.map((item,i) => i === index ? event.target.value : item))} className="mt-2 w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 focus:outline-none focus:border-fuchsia-400" />
        </label>)}
        <button disabled={busy || draft.some(value => !value.trim())} className="rounded-xl border border-fuchsia-400/55 px-4 py-3 disabled:opacity-40">{busy ? 'Sharing…' : 'Share and shuffle'}</button>
        {editing && <button type="button" onClick={() => setEditing(false)} className="ml-3 text-white/60">Cancel</button>}
      </form>}
    </div>
    <div><h3 className="font-semibold text-lg mb-3">Find the lie</h3><div className="space-y-4">
      {players.filter(player => player.id !== currentUser?.id).map(player => {
        const entry = entries[player.id];
        const result = entry?.revision && guesses[entry.revision]?.[currentUser.id];
        return <article key={player.id} className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <h4 className="font-semibold mb-3">{player.avatar || '🎤'} {player.name}</h4>
          {entry?.lieId ? <>
            <div className="space-y-2">{entry.statements.map(card => <button key={card.id} disabled={busy || !!result} aria-pressed={result?.choiceId === card.id} onClick={() => guess(player.id,entry,card.id)} className={`block w-full rounded-xl border p-3 text-left break-words disabled:cursor-default ${result && card.id === entry.lieId ? 'border-fuchsia-400 bg-fuchsia-500/15' : result?.choiceId === card.id ? 'border-amber-400/60 bg-amber-500/10' : 'border-white/15 hover:border-fuchsia-400/60'}`}>
              {card.text}{result && card.id === entry.lieId && <span className="block text-fuchsia-300 text-sm mt-1">The lie</span>}
            </button>)}</div>
            <p role="status" className="mt-3 text-sm text-white/70">{result ? result.correct ? '🎉 You spotted it! +1 point' : '😅 That was a truth. Better luck next round!' : 'Click the statement you think is the lie.'}</p>
          </> : <p className="text-sm text-white/45">Writing their truths and lie…</p>}
        </article>;
      })}
    </div>{players.length <= 1 && <p className="text-sm text-white/50">Waiting for other guests to join the game.</p>}</div>
  </section>;
}
