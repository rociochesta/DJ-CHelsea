import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, RotateCw, Trophy, Lightbulb, Flag, LockKeyhole } from 'lucide-react';
import { database, ref, runTransaction } from '../utils/firebase';
import { WHEEL_THEMES, wheelPuzzle, wheelTheme } from '../utils/wheelPhrases';
import { WHEEL_SEGMENTS, canTakeWheelTurn, normalizeSolution, updateWheelGame, wheelSpinResult } from '../utils/wheelGame';

const button = 'rounded-xl border border-white/15 px-4 py-2 text-sm hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed';
const landing = segment => (360-(segment+.5)*60)%360;
const point = angle => [160+Math.sin(angle*Math.PI/180)*150,160-Math.cos(angle*Math.PI/180)*150];

function FortuneWheel({ rotation, spinning }) {
  return <div className="fortune-wheel relative mx-auto w-full max-w-[340px] pt-3" aria-label="Wheel: reveal 1 or 2 vowels, reveal 1, 2 or 3 letters, or lose your turn">
    <div className="fortune-pointer absolute left-1/2 top-0 z-10 -translate-x-1/2 text-3xl leading-none" aria-hidden="true">▼</div>
    <svg viewBox="0 0 320 320" role="img" aria-label={spinning ? 'Wheel spinning' : 'Fortune wheel'} className="w-full rounded-full drop-shadow-lg motion-reduce:!transition-none" style={{ transform:`rotate(${rotation}deg)`,transition:spinning ? 'transform 2s cubic-bezier(.15,.65,.2,1)' : 'none' }}>
      <defs><radialGradient id="fortune-shade"><stop offset="0%" stopColor="#000" stopOpacity="0"/><stop offset="100%" stopColor="#000" stopOpacity=".4"/></radialGradient></defs>
      <circle cx="160" cy="160" r="157" fill="#21111d" stroke="#F59E0B" strokeWidth="3"/>
      {WHEEL_SEGMENTS.map((segment,index) => {
        const [x1,y1] = point(index*60), [x2,y2] = point((index+1)*60);
        return <g key={index}><path d={`M 160 160 L ${x1} ${y1} A 150 150 0 0 1 ${x2} ${y2} Z`} fill={['#9D174D','#6B21A8','#92400E','#5B21B6','#1C1728','#4C1D95'][index]} stroke="#F59E0B90" strokeWidth="1.5" /><g transform={`rotate(${index*60+30} 160 160)`}><text x="160" y="56" textAnchor="middle" fill="#F3F4F6" fontSize="12" fontWeight="600">{segment.type === 'lose' ? 'LOSE YOUR' : `REVEAL ${segment.count}`}</text><text x="160" y="73" textAnchor="middle" fill="#F3F4F6" fontSize="13" fontWeight="600">{segment.type === 'lose' ? 'TURN' : `${segment.type === 'vowel' ? 'VOWEL' : 'LETTER'}${segment.count > 1 ? 'S' : ''}`}</text></g></g>;
      })}
      <circle cx="160" cy="160" r="150" fill="url(#fortune-shade)" pointerEvents="none"/>
      <circle cx="160" cy="160" r="24" fill="#180d1b" stroke="#FBBF24" strokeWidth="2" />
      <foreignObject x="150" y="149" width="20" height="22"><LockKeyhole className="h-5 w-5 text-[#FBBF24]"/></foreignObject>
    </svg>
  </div>;
}

export default function WheelGame({ roomCode,currentUser,game,featured = false,onOpen,onClose }) {
  const [themeId,setThemeId] = useState('spicy');
  const [starter,setStarter] = useState('me');
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState('');
  const [solution,setSolution] = useState('');
  const [solveOpen,setSolveOpen] = useState(false);
  const [confirmFinish,setConfirmFinish] = useState(false);
  const [spinning,setSpinning] = useState(false);
  const [rotation,setRotation] = useState(() => Number.isInteger(game?.lastMove?.segment) ? landing(game.lastMove.segment) : 0);
  const lock = useRef(false), timer = useRef(null), animatedMove = useRef(null);
  const player = game?.players?.[currentUser?.id];
  const players = Object.values(game?.players || {});
  const myTurn = canTakeWheelTurn(game,currentUser?.id);
  const afterReveal = game?.turnPhase === 'after-reveal';
  const picking = game?.turnPhase === 'pick';
  const puzzle = wheelPuzzle(game);
  const finished = game?.status === 'finished';
  const last = game?.lastMove;
  const selectedTheme = wheelTheme(themeId);
  const locked = busy || spinning;

  useEffect(() => () => clearTimeout(timer.current),[]);
  useEffect(() => { setSolution(''); setSolveOpen(false); setConfirmFinish(false); setError(''); },[game?.id,game?.revision]);
  useEffect(() => {
    if (last?.type === 'spin' && last.id !== animatedMove.current) setRotation(landing(last.segment));
  },[last?.id]);

  const act = async (type,extra = {}) => {
    if (lock.current || spinning) return;
    lock.current = true; setBusy(true); setError('');
    const action = { type,id:crypto.randomUUID(),user:currentUser,now:Date.now(),seed:crypto.getRandomValues(new Uint32Array(1))[0],expectedGameId:game?.id || null,expectedRevision:game?.revision,...extra };
    try {
      const result = await runTransaction(ref(database,`karaoke-rooms/${roomCode}/wheelGame`),existing => updateWheelGame(existing,action),{ applyLocally:false });
      if (!result.committed) throw new Error('Could not save your turn. Please try again.');
      if (type === 'spin') {
        const outcome = wheelSpinResult(game,action.seed);
        animatedMove.current = action.id;
        setSpinning(true);
        setRotation(current => current+1800+((landing(outcome.segment)-current%360+360)%360));
        clearTimeout(timer.current);
        timer.current = setTimeout(() => setSpinning(false),2050);
      }
      setSolution(''); setSolveOpen(false); setConfirmFinish(false);
      if (type === 'start' || type === 'join') onOpen?.();
    } catch (cause) { setError(cause.message || 'Could not save this game. Try again.'); }
    finally { lock.current = false; setBusy(false); }
  };
  const turnText = finished ? game.winnerId ? `${game.winnerName} solved it!` : 'Game finished' : myTurn ? picking ? 'Your turn · Choose your letters' : afterReveal ? 'Your turn · Solve or pass' : 'Your turn · Solve or spin' : game?.status === 'waiting' ? player ? 'Your person can join and take their turn later' : `${players[0]?.name || 'Your person'} left a puzzle for you` : `${game?.players?.[game.turn]?.name || 'Your person'}’s turn · Come back later`;
  const resultText = move => {
    if (move.type === 'solve') return move.correct ? `${move.name} solved the puzzle!` : `${move.name} tried to solve. The turn passes.`;
    if (move.type === 'pass') return `${move.name} passed the turn.`;
    if (move.type === 'pick') return `${move.name} picked ${move.letter}: ${move.hit ? 'revealed!' : 'not in the puzzle.'}`;
    if (move.outcome === 'lose') return `${move.name} lost their turn.`;
    if (move.count && !move.letters && !move.letter) return `${move.name} landed on Reveal ${move.count} ${move.outcome === 'vowel' ? 'vowel' : 'letter'}${move.count > 1 ? 's' : ''}.`;
    const hits = Object.values(move.hits || (move.letter ? [move.letter] : [])), misses = Object.values(move.misses || {});
    return `${move.name}: ${hits.length ? `revealed ${hits.join(', ')}` : 'no new letters revealed'}${misses.length ? ` · ${misses.join(', ')} not in the puzzle` : ''}. ${move.keepsTurn ? 'Solve or pass to finish the turn.' : 'The turn passes.'}`;
  };

  const setup = <div className="space-y-3">
    {!game || finished ? <>
      <label className="block text-sm text-white/70">Theme<select value={themeId} disabled={locked} onChange={event => setThemeId(event.target.value)} className="mt-2 block w-full rounded-xl border border-white/15 bg-[#11111b] px-3 py-2">{WHEEL_THEMES.map(theme => <option key={theme.id} value={theme.id}>{theme.name}</option>)}</select></label>
      <p className="text-xs text-white/45">{selectedTheme?.description} · {selectedTheme?.phrases.length} puzzles</p>
      <label className="block text-sm text-white/70">Who starts?<select value={starter} disabled={locked} onChange={event => setStarter(event.target.value)} className="mt-2 block w-full rounded-xl border border-white/15 bg-[#11111b] px-3 py-2"><option value="me">Me</option><option value="other">My person</option></select></label>
      <button type="button" disabled={locked || !currentUser?.id} onClick={() => act('start',{ themeId,starter })} className="fortune-start rounded-xl px-5 py-2.5 text-sm disabled:opacity-40">{busy ? 'Starting…' : game ? 'Start another puzzle' : 'Start game'}</button>
      {game && !featured && <button type="button" onClick={onOpen} className={`${button} ml-2`}>View result</button>}
    </> : <>
      <p className="text-xs text-white/45">{wheelTheme(game.themeId)?.name}</p><p className="text-sm text-violet-300">{turnText}</p>
      {!player && game.status === 'waiting' ? <button type="button" disabled={locked || !currentUser?.id} onClick={() => act('join')} className={`${button} border-violet-300/30 text-violet-200`}>Join game</button> : <button type="button" onClick={onOpen} className={`${button} border-violet-300/30 text-violet-200`}>Open game</button>}
    </>}
  </div>;
  if (!featured) return <details className="rounded-2xl border border-white/10 p-4"><summary className="cursor-pointer font-semibold">Wheel of Fortune</summary><div className="mt-3">{setup}</div>{error && <p role="alert" className="mt-3 text-sm text-red-300">{error}</p>}</details>;

  return <section className="fortune-game lounge-wheel-panel rounded-2xl border p-5 sm:p-6 space-y-5">
    <header className="flex flex-wrap justify-between items-center gap-3"><button type="button" onClick={onClose} className={`${button} inline-flex gap-2 items-center text-white/60`}><ArrowLeft className="h-3 w-3" />Back to music</button><p role="status" className="fortune-status rounded-full px-4 py-2 text-xs">{game ? turnText : 'Feeling lucky? Pick a theme.'}</p>{player && !finished && <button type="button" disabled={locked} onClick={() => setConfirmFinish(true)} className={`${button} inline-flex items-center gap-2 text-white/55`}><Flag className="h-3 w-3 text-violet-400"/>Finish game</button>}</header>
    <div className="text-center"><h2 className="text-2xl font-medium">Wheel of Fortune</h2><p className="mt-2 text-[10px] uppercase tracking-[.25em] text-white/40">Good luck. Bad intentions.</p></div>
    {confirmFinish && <div className="rounded-2xl border border-violet-300/30 p-4 space-y-3"><p className="text-sm">Finish this puzzle without a winner? The answer will be revealed.</p><div className="flex gap-2"><button type="button" disabled={locked} onClick={() => act('finish')} className={button}>Yes, finish game</button><button type="button" disabled={locked} onClick={() => setConfirmFinish(false)} className={button}>Keep playing</button></div></div>}
    {!game ? setup : <>
      <div className="flex flex-wrap gap-2">{players.map(p => <span key={p.id} className={`rounded-xl border px-3 py-2 text-sm ${game.turn === p.id ? 'border-violet-300/40 bg-violet-300/10 text-violet-200' : 'border-white/10 text-white/55'}`}>{p.name}{p.id === currentUser?.id ? ' · You' : ''}{game.winnerId === p.id ? ' · Winner' : ''}</span>)}</div>
      {puzzle ? <div className="fortune-puzzle rounded-2xl p-4 sm:p-6 space-y-5">
        <div className="text-center"><p className="text-[10px] uppercase tracking-widest text-white/40">{wheelTheme(game.themeId)?.name}</p><p className="mt-2 inline-block rounded-xl border border-purple-300/15 bg-purple-300/5 px-4 py-2 text-xs text-[#FBBF24]"><span className="text-white/40">Category: </span>{puzzle.category}</p></div>
        <div aria-label="Puzzle board" className="flex flex-wrap justify-center gap-x-5 gap-y-3">{puzzle.answer.split(' ').map((word,index) => <div key={index} className="inline-flex gap-1">{word.split('').map((letter,i) => {
          const alphabetic = /^[A-Z]$/.test(letter), shown = !alphabetic || finished || game.revealed?.[letter];
          return <span key={i} aria-label={shown ? letter : 'Hidden letter'} className={`flex h-9 w-6 sm:h-11 sm:w-8 items-center justify-center rounded-md text-base sm:text-xl font-semibold ${alphabetic ? 'fortune-tile' : 'text-[#FBBF24]'}`}>{shown ? letter : <span aria-hidden="true" className="h-px w-3 bg-purple-300/15" />}</span>;
        })}</div>)}</div>
        {finished && <div className="space-y-2 text-center">{game.winnerId && <Trophy className="mx-auto h-6 w-6 text-violet-300" />}<p className="text-sm text-white/70">{puzzle.answer}</p>{puzzle.artist && <p className="text-xs text-white/45">{puzzle.artist} · {puzzle.year}</p>}</div>}
      </div> : <p role="alert" className="text-red-300">This puzzle is unavailable. Finish it and start another.</p>}
      {game.status === 'waiting' && !player && <button type="button" disabled={locked} onClick={() => act('join')} className={button}>Join game</button>}
      {!finished && <div className="grid grid-cols-1 md:grid-cols-2 items-center gap-5">
        <FortuneWheel rotation={rotation} spinning={spinning} />
        <div className="space-y-4">
          {myTurn && picking && <div className="space-y-3"><p className="fortune-pick-label text-sm">Choose {game.revealOffer?.remaining} {game.revealOffer?.type === 'vowel' ? 'vowel' : 'letter'}{game.revealOffer?.remaining > 1 ? 's' : ''}</p><div className="flex flex-wrap gap-2">{Object.values(game.revealOffer?.options || {}).map(letter => <button key={letter} type="button" disabled={locked} aria-label={`Pick ${letter}`} onClick={() => act('pick',{letter})} className="fortune-letter h-11 w-11 rounded-xl border font-semibold disabled:opacity-40">{letter}</button>)}</div></div>}
          {myTurn && !picking && <><div className="space-y-3">{afterReveal ? <button type="button" disabled={locked} onClick={() => act('pass')} className="fortune-start w-full rounded-xl px-4 py-2.5 text-sm disabled:opacity-40">Pass turn</button> : <button type="button" disabled={locked || !puzzle} onClick={() => act('spin')} className="fortune-action fortune-spin flex w-full items-center gap-3 rounded-2xl p-4 text-left disabled:opacity-40"><RotateCw className="h-6 w-6"/><span><span className="block text-sm font-semibold">{spinning ? 'Spinning…' : 'Spin the wheel'}</span><span className="mt-1 block text-xs text-white/45">Let fate do the flirting.</span></span></button>}<button type="button" disabled={locked || !puzzle} onClick={() => setSolveOpen(value => !value)} className="fortune-action fortune-solve flex w-full items-center gap-3 rounded-2xl p-4 text-left disabled:opacity-40"><Lightbulb className="h-6 w-6"/><span><span className="block text-sm font-semibold">Solve the puzzle</span><span className="mt-1 block text-xs text-white/45">Know it? Show off.</span></span></button></div>
            {solveOpen && <form onSubmit={event => { event.preventDefault(); act('solve',{ solution }); }} className="fortune-solution lounge-composer wall-composer rounded-2xl border p-3 space-y-3"><label className="block text-sm text-white/70">Your solution<input autoFocus type="text" maxLength={200} disabled={locked} value={solution} onChange={event => setSolution(event.target.value)} placeholder="Type the full phrase…" className="wall-link-input mt-2 w-full rounded-xl border px-3 py-3" /></label><p className="text-xs text-white/40">Capitalization and punctuation don’t matter. A wrong answer passes your turn.</p><button disabled={locked || !normalizeSolution(solution)} className="fortune-start rounded-xl px-4 py-2.5 text-sm disabled:opacity-40">Submit solution</button></form>}
          </>}
        </div>
      </div>}
      {!!Object.keys(game.revealed || {}).length && <p className="text-xs text-white/45">Revealed: {Object.keys(game.revealed).sort().join(' · ')}</p>}
      {!!Object.keys(game.guessed || {}).filter(letter => !game.revealed?.[letter]).length && <p className="text-xs text-white/45">Not in the puzzle: {Object.keys(game.guessed).filter(letter => !game.revealed?.[letter]).sort().join(' · ')}</p>}
      {last && !spinning && <p role="status" className="rounded-xl border border-white/10 bg-black/15 p-3 text-sm text-violet-200/80">{resultText(last)}</p>}
      {finished && <div className="border-t border-white/10 pt-4 space-y-3">{setup}</div>}
      {!!Object.keys(game.moves || {}).length && <details className="border-t border-white/10 pt-3"><summary className="cursor-pointer text-sm text-white/55">Turn history</summary><div className="mt-3 max-h-64 overflow-y-auto space-y-2 text-sm text-white/60">{Object.values(game.moves).sort((a,b) => b.at-a.at).map(move => <p key={move.id}>{resultText(move)}</p>)}</div></details>}
      {!!Object.keys(game.history || {}).length && <details className="border-t border-white/10 pt-3"><summary className="cursor-pointer text-sm text-white/55">Past puzzles</summary><div className="mt-3 max-h-64 overflow-y-auto space-y-3 text-sm">{Object.values(game.history).sort((a,b) => b.finishedAt-a.finishedAt).map(item => <div key={item.id}><p className="text-violet-200/80">{wheelPuzzle(item)?.answer}</p><p className="text-xs text-white/45">{wheelTheme(item.themeId)?.name} · {item.winnerName ? `${item.winnerName} won` : 'Finished without a winner'}</p></div>)}</div></details>}
    </>}
    {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
  </section>;
}
