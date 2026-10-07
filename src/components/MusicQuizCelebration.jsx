import React from 'react';
import { Trophy, Zap, TimerOff } from 'lucide-react';

export function QuizReveal({ quiz }) {
  const timeout = quiz.lastTimeout && (!quiz.lastWinner || quiz.lastTimeout.round > quiz.lastWinner.round);
  const reveal = timeout ? quiz.lastTimeout : quiz.lastWinner;
  if (!reveal) return null;
  const Icon = timeout ? TimerOff : Zap;
  return <div key={`${timeout ? 'timeout' : 'winner'}-${reveal.round}`} role="status" className={`quiz-celebrate relative overflow-hidden rounded-2xl border p-5 sm:p-6 ${timeout ? 'border-amber-300/25 bg-amber-400/10' : 'border-emerald-300/30 bg-gradient-to-br from-emerald-400/15 via-teal-500/5 to-indigo-500/10'}`}>
    <div className="flex flex-wrap items-center gap-4">
      <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border ${timeout ? 'border-amber-300/25 text-amber-200' : 'border-emerald-300/30 text-emerald-200'}`}><Icon size={30} aria-hidden="true" /></div>
      <div className="min-w-0 flex-1"><p className="text-xs font-bold uppercase tracking-widest text-white/60">Round {reveal.round + 1} · {timeout ? 'The one that got away' : 'First hit!'}</p><p className="mt-1 break-words text-2xl sm:text-3xl font-black">{timeout ? 'Nobody caught this one' : `${reveal.name} nailed it!`}</p></div>
      {!timeout && <span className="rounded-xl bg-emerald-300/15 px-4 py-2 text-xl sm:text-2xl font-black text-emerald-200">+{reveal.points} <span className="text-sm font-semibold">points</span></span>}
    </div>
    <div className="mt-5 border-t border-white/10 pt-4"><p className="text-xs font-bold uppercase tracking-widest text-white/50">That was</p><p className="mt-2 break-words text-2xl sm:text-4xl font-black leading-tight">{reveal.title}</p><p className="mt-2 break-words text-xl sm:text-2xl font-semibold text-white/80">{reveal.artist}</p></div>
  </div>;
}

export function QuizResults({ standings, scores }) {
  const topScore = Math.max(0, ...standings.map(player => scores[player.id] || 0));
  const winners = topScore > 0 ? standings.filter(player => scores[player.id] === topScore) : [];
  return <div role="status" className="quiz-celebrate space-y-5">
    <div className="relative overflow-hidden rounded-3xl border border-fuchsia-300/25 bg-gradient-to-br from-fuchsia-500/20 via-indigo-500/15 to-transparent px-5 py-8 text-center sm:p-10">
      <div aria-hidden="true" className="quiz-victory-halo absolute left-1/2 top-8 h-44 w-44 -translate-x-1/2 rounded-full border border-fuchsia-300/20" />
      <div className="relative"><div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl border border-amber-200/30 bg-amber-300/10 text-amber-200"><Trophy size={44} aria-hidden="true" /></div>
        <h3 className="mt-5 text-sm font-bold uppercase tracking-[0.2em] text-fuchsia-200">Final results</h3>
        <p className="mt-3 text-3xl sm:text-5xl font-black">{winners.length > 1 ? 'Sharing the spotlight' : winners.length ? 'Own the spotlight' : 'One more track?'}</p>
        <div className="mt-4 space-y-2">{winners.map(player => <p key={player.id} className="break-words text-2xl sm:text-4xl font-bold text-fuchsia-200">{player.name}</p>)}</div>
        <p className="mt-3 text-lg text-white/75">{winners.length ? `${topScore} points · ${winners.length > 1 ? 'Co-champions' : 'Room champion'}` : 'No points this time. The next beat is yours.'}</p>
      </div>
    </div>
    <ol aria-label="Final rankings" className="space-y-3">{standings.map(player => {
      const points = scores[player.id] || 0;
      const rank = 1 + standings.filter(other => (scores[other.id] || 0) > points).length;
      const champion = topScore > 0 && points === topScore;
      return <li key={player.id} className={`flex items-center gap-3 sm:gap-4 rounded-2xl border p-4 sm:p-5 ${champion ? 'border-fuchsia-300/30 bg-fuchsia-400/10' : 'border-white/10 bg-white/5'}`}>
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/10 text-xl font-black" aria-label={`Rank ${rank}`}>{rank}</span>
        <span className="min-w-0 flex-1 break-words text-xl sm:text-2xl font-bold">{player.name}</span>
        <span className="shrink-0 text-right"><strong className="block text-2xl sm:text-3xl">{points}</strong><span className="text-xs text-white/60">points</span></span>
      </li>;
    })}</ol>
    {!standings.length && <p className="text-center text-white/60">The room is waiting for its next champion.</p>}
  </div>;
}
