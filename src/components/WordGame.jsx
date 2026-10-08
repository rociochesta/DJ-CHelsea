import { useEffect, useMemo, useRef, useState } from 'react';
import { X, RotateCcw, Shuffle, Star } from 'lucide-react';
import { database, ref, runTransaction } from '../utils/firebase';
import { BOARD_SIZE, cellKey, premiumAt, TILE_VALUES, canPlayWordTurn, evaluateWordMove, loadWordDictionary, updateWordGame } from '../utils/wordGame';

const tiles = value => Object.values(value || {});
const button = 'rounded-xl border border-white/15 px-4 py-2 text-sm hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed';
const bonusClasses = { TW:'word-bonus-tw', DW:'word-bonus-dw', TL:'word-bonus-tl', DL:'word-bonus-dl' };
const seed = () => crypto.getRandomValues(new Uint32Array(1))[0];

export default function WordGame({ roomCode, currentUser, game, featured = false, onOpen, onClose }) {
  const [busy, setBusy] = useState(false);
  const commandLock = useRef(false);
  const [error, setError] = useState('');
  const [starter, setStarter] = useState('me');
  const [dictionary, setDictionary] = useState(null);
  const [dictionaryError, setDictionaryError] = useState('');
  const [retry, setRetry] = useState(0);
  const [placements, setPlacements] = useState([]);
  const [selected, setSelected] = useState(null);
  const [blankChoice, setBlankChoice] = useState(null);
  const [swapMode, setSwapMode] = useState(false);
  const [swapIds, setSwapIds] = useState([]);
  const [confirmTurn, setConfirmTurn] = useState(null);
  const [confirmFinish, setConfirmFinish] = useState(false);
  const player = game?.players?.[currentUser?.id];
  const players = Object.values(game?.players || {});
  const myTurn = canPlayWordTurn(game,currentUser?.id);
  const rack = tiles(player?.rack);
  const unused = rack.filter(tile => !placements.some(move => move.tileId === tile.id));
  const currentPlayer = game?.players?.[game?.turn];

  useEffect(() => {
    if (!featured) return;
    let active = true;
    setDictionaryError('');
    loadWordDictionary().then(value => { if (active) setDictionary(value); }).catch(cause => { if (active) setDictionaryError(cause.message); });
    return () => { active = false; };
  }, [featured,retry]);
  useEffect(() => { setPlacements([]); setSelected(null); setBlankChoice(null); setSwapMode(false); setSwapIds([]); setConfirmTurn(null); setConfirmFinish(false); setError(''); }, [game?.id,game?.revision]);

  const act = async (type, extra = {}) => {
    if (commandLock.current) return false;
    commandLock.current = true; setBusy(true); setError('');
    const action = { type, id:crypto.randomUUID(), user:currentUser, now:Date.now(), seed:seed(), expectedGameId:game?.id || null, expectedRevision:game?.revision, ...extra };
    try {
      const result = await runTransaction(ref(database, `karaoke-rooms/${roomCode}/wordGame`), existing => updateWordGame(existing,action,dictionary), { applyLocally:false });
      if (!result.committed) throw new Error('Could not save this turn. Try again.');
      setPlacements([]); setSelected(null); setSwapMode(false); setSwapIds([]); setConfirmTurn(null); setConfirmFinish(false);
      if (type === 'start' || type === 'join') onOpen?.();
      return true;
    } catch (cause) { setError(cause.message || 'Could not save the game. Your letters are still here.'); return false; }
    finally { commandLock.current = false; setBusy(false); }
  };

  const preview = useMemo(() => {
    if (!placements.length) return null;
    if (!dictionary) return { error:'Loading the dictionary…' };
    try { return evaluateWordMove(game,currentUser?.id,placements,dictionary); }
    catch (cause) { return { error:cause.message }; }
  }, [game,currentUser?.id,placements,dictionary]);

  const place = (row,col) => {
    if (!myTurn || busy || swapMode) return;
    const existing = placements.find(move => move.row === row && move.col === col);
    if (existing) { setPlacements(moves => moves.filter(move => move !== existing)); setSelected(existing.tileId); return; }
    if (game?.board?.[cellKey(row,col)] || !selected) return;
    const tile = unused.find(item => item.id === selected);
    if (!tile) return;
    if (tile.letter === '?') { setBlankChoice({ row,col,tileId:tile.id }); return; }
    setPlacements(moves => [...moves,{ row,col,tileId:tile.id,letter:tile.letter }]); setSelected(null); setError('');
  };

  const setup = <div className="space-y-3">
    <p className="text-sm text-white/55">English · Two players · No timer. Take a turn whenever you’re here.</p>
    {!game || game.status === 'finished' ? <>
      {game?.status === 'finished' && <p className="text-sm text-violet-300">Your last game is complete.</p>}
      <label className="block text-sm text-white/70">Who starts?<select value={starter} disabled={busy} onChange={event => setStarter(event.target.value)} className="mt-2 w-full rounded-xl border border-white/15 bg-[#11111b] px-3 py-2"><option value="me">Me</option><option value="other">My person</option></select></label>
      <button type="button" disabled={busy || !currentUser?.id} onClick={() => act('start',{ starter })} className={`${button} border-violet-300/30 text-violet-200`}>{busy ? 'Starting…' : game ? 'Start a new game' : 'Start game'}</button>
      {game && <button type="button" onClick={onOpen} className={`${button} ml-2`}>View results</button>}
    </> : <>
      <p className="text-sm text-violet-300">{myTurn ? 'Your turn' : game.status === 'waiting' ? player ? 'Your person can join and take their turn later.' : `${players[0]?.name} left a game for you.` : `${currentPlayer?.name || 'Your person'}’s turn`}</p>
      {!player && game.status === 'waiting' ? <button type="button" disabled={busy || !currentUser?.id} onClick={() => act('join')} className={`${button} border-violet-300/30 text-violet-200`}>Join game</button> : <button type="button" onClick={onOpen} className={`${button} border-violet-300/30 text-violet-200`}>Open game</button>}
    </>}
    {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
  </div>;

  if (!featured) return <details className="rounded-2xl border border-white/10 p-4"><summary className="cursor-pointer font-semibold">Words for us</summary><div className="mt-3">{setup}</div></details>;

  const scores = players.map(p => p.score);
  const winner = Math.max(...scores);
  return <section className="word-game lounge-words-panel rounded-2xl border p-4 sm:p-6 space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs uppercase tracking-widest text-violet-300/60">A little word rivalry</p><h2 className="mt-1 text-2xl font-semibold">Words for us</h2></div><div className="flex flex-wrap gap-2">{player && game?.status !== 'finished' && <button type="button" disabled={busy} onClick={() => setConfirmFinish(true)} className={`${button} border-violet-300/30 text-violet-300`}>Finish game</button>}<button type="button" onClick={onClose} aria-label="Close Words for us" className="fortune-start rounded-full p-2"><X className="h-4 w-4" /></button></div></div>
    {confirmFinish && <div className="rounded-2xl border border-violet-300/30 bg-violet-300/5 p-4 space-y-3"><p className="text-sm">Finish this game and save the current scores? Letters you haven’t submitted won’t count.</p><div className="flex gap-2"><button type="button" disabled={busy} onClick={() => act('finish')} className={button}>Yes, finish game</button><button type="button" disabled={busy} onClick={() => setConfirmFinish(false)} className={button}>Keep playing</button></div></div>}
    {!game ? setup : <>
      <div className="flex flex-wrap gap-3">{players.map(p => <div key={p.id} className={`flex-1 min-w-[120px] rounded-2xl border px-4 py-3 ${game.turn === p.id ? 'border-violet-300/40 bg-violet-300/5' : 'border-white/10'}`}><p className="truncate text-sm text-white/65">{p.name}{p.id === currentUser?.id ? ' · You' : ''}</p><p className="mt-1 text-2xl font-semibold">{p.score}<span className="ml-2 text-xs font-normal text-white/40">points</span></p></div>)}</div>
      <div role="status" className="flex flex-wrap items-center justify-between gap-2 text-sm"><p className="text-violet-300">{game.status === 'finished' ? players.length < 2 ? 'Game finished · Your score is saved' : scores.every(score => score === winner) ? 'A tie! Well played, both of you.' : `${players.find(p => p.score === winner)?.name} wins!` : myTurn ? 'Your turn · Take your time' : game.status === 'waiting' ? 'Your person can join and take their turn later' : `${currentPlayer?.name || 'Your person'}’s turn · Come back later`}</p><span className="text-white/45">{tiles(game.bag).length} letters in the bag</span></div>
      {game.status === 'waiting' && !player && <button type="button" disabled={busy} onClick={() => act('join')} className={button}>Join game</button>}
      <div className="overflow-x-auto pb-1"><div role="group" aria-label="Word game board, 15 rows and 15 columns" className="mx-auto grid w-full min-w-[450px] max-w-[660px] grid-cols-[repeat(15,minmax(0,1fr))] gap-[3px] rounded-2xl border border-white/10 bg-black/20 p-2">
        {Array.from({ length:BOARD_SIZE*BOARD_SIZE }, (_,index) => {
          const row = Math.floor(index/BOARD_SIZE), col = index%BOARD_SIZE, key = cellKey(row,col);
          const pending = placements.find(move => move.row === row && move.col === col);
          const permanent = game.board?.[key];
          const tile = pending ? { letter:pending.letter, blank:rack.find(t => t.id === pending.tileId)?.letter === '?' } : permanent;
          const bonus = premiumAt(row,col);
          const last = tiles(game.lastMove?.placedCells).includes(key);
          return <button key={key} type="button" disabled={!myTurn || busy || swapMode || !!permanent} onClick={() => place(row,col)} aria-label={`Row ${row+1}, column ${col+1}${tile ? `, ${tile.letter}${pending ? ', tap to remove' : ''}` : bonus ? `, ${bonus}` : ', empty'}`} className={`relative flex aspect-square min-w-0 items-center justify-center rounded-[4px] border text-[9px] sm:text-xs transition ${tile ? pending ? 'border-violet-300 bg-violet-200 text-[#231019] shadow-sm' : `border-white/20 bg-[#ded2c1] text-[#241d23] ${last ? 'ring-1 ring-violet-400' : ''}` : `border-white/[0.04] ${bonusClasses[bonus] || 'bg-white/[0.04] text-white/20'} ${selected && myTurn && !swapMode ? 'hover:ring-2 hover:ring-violet-300' : ''}`}`}>
            {tile ? <><span className="text-base sm:text-lg font-bold leading-none">{tile.letter}</span><span className="absolute bottom-[1px] right-[2px] text-[7px] sm:text-[9px]">{tile.blank ? 0 : TILE_VALUES[tile.letter]}</span></> : key === '7_7' ? <Star className="h-3 w-3 sm:h-4 sm:w-4" /> : bonus}
          </button>;
        })}
      </div></div>
      <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-[11px] text-white/45"><span className="text-sky-200/70">DL · Double letter</span><span className="text-violet-200/70">TL · Triple letter</span><span className="text-violet-200/70">DW · Double word</span><span className="text-violet-300">TW · Triple word</span></div>
      {player && game.status !== 'finished' && <div className="rounded-2xl border border-white/10 bg-black/15 p-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-semibold">Your letters</p><span className="text-xs text-white/45">{swapMode ? 'Select letters to swap' : myTurn ? 'Tap a letter, then a square' : 'Your letters are ready for your next turn'}</span></div>
        <div className="flex justify-center gap-2 flex-wrap">{unused.map(tile => <button key={tile.id} type="button" disabled={!myTurn || busy} aria-label={`${tile.letter === '?' ? 'Blank' : tile.letter}, ${TILE_VALUES[tile.letter]} points`} aria-pressed={swapMode ? swapIds.includes(tile.id) : selected === tile.id} onClick={() => { if (swapMode) setSwapIds(ids => ids.includes(tile.id) ? ids.filter(id => id !== tile.id) : [...ids,tile.id]); else setSelected(value => value === tile.id ? null : tile.id); }} className={`relative h-11 w-10 sm:h-14 sm:w-12 rounded-lg border-2 bg-[#ded2c1] text-[#241d23] shadow-md disabled:opacity-60 ${selected === tile.id || swapIds.includes(tile.id) ? 'border-violet-400 -translate-y-1' : 'border-transparent'}`}><span className="text-xl sm:text-2xl font-bold">{tile.letter === '?' ? '◇' : tile.letter}</span><span className="absolute bottom-1 right-1 text-[10px]">{TILE_VALUES[tile.letter]}</span></button>)}</div>
        {blankChoice && <div className="rounded-xl border border-violet-300/30 p-3"><p className="mb-2 text-sm">Choose your blank’s letter</p><div className="flex flex-wrap gap-1">{'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map(letter => <button key={letter} type="button" disabled={busy} onClick={() => { setPlacements(moves => [...moves,{ ...blankChoice,letter }]); setBlankChoice(null); setSelected(null); }} className="rounded-lg border border-white/15 px-2.5 py-2 text-sm hover:bg-violet-300/10">{letter}</button>)}<button type="button" onClick={() => setBlankChoice(null)} className={button}>Cancel</button></div></div>}
        {myTurn && <>
          {preview && <p role="status" className={`text-sm ${preview.error ? 'text-white/55' : 'text-violet-300'}`}>{preview.error || `${preview.words.map(item => item.word).join(' + ')} · ${preview.score} points${preview.bonus ? ' · +50 for all seven letters' : ''}`}</p>}
          <div className="flex flex-wrap gap-2">{swapMode ? <><button type="button" disabled={busy || !swapIds.length} onClick={() => setConfirmTurn('swap')} className={button}>Swap {swapIds.length || ''} letters</button><button type="button" disabled={busy} onClick={() => { setSwapMode(false); setSwapIds([]); }} className={button}>Cancel swap</button></> : <>
            <button type="button" disabled={busy || !preview || !!preview.error || !dictionary} onClick={() => act('play',{ placements })} className={`${button} border-violet-300/40 bg-violet-300/10 text-violet-200`}>{busy ? 'Saving…' : 'Submit word'}</button>
            <button type="button" disabled={busy || !placements.length} onClick={() => { setPlacements([]); setSelected(null); setBlankChoice(null); }} className={`${button} inline-flex items-center gap-2`}><RotateCcw className="h-4 w-4" />Undo</button>
            <button type="button" disabled={busy || !!placements.length || tiles(game.bag).length < 7} onClick={() => { setSwapMode(true); setSelected(null); }} className={`${button} inline-flex items-center gap-2`}><Shuffle className="h-4 w-4" />Swap</button>
            <button type="button" disabled={busy || !!placements.length} onClick={() => setConfirmTurn('pass')} className={button}>Pass</button>
          </>}</div>
          {confirmTurn && <div className="rounded-xl border border-violet-300/25 p-3 space-y-3"><p className="text-sm">{confirmTurn === 'pass' ? 'Pass this turn to your person?' : 'Swapping letters uses your turn. Continue?'}</p><div className="flex gap-2"><button type="button" disabled={busy} onClick={() => act(confirmTurn,confirmTurn === 'swap' ? { tileIds:swapIds } : {})} className={button}>Yes, {confirmTurn}</button><button type="button" disabled={busy} onClick={() => setConfirmTurn(null)} className={button}>Keep playing</button></div></div>}
        </>}
      </div>}
      {game.lastMove && <p className="text-sm text-white/60">Last turn: {game.lastMove.name} {game.lastMove.type === 'play' ? `played ${tiles(game.lastMove.words).map(item => item.word).join(', ')} for ${game.lastMove.score} points` : game.lastMove.type === 'swap' ? 'swapped letters' : 'passed'}.</p>}
      {game.status === 'finished' && <div className="space-y-3"><p className="text-sm text-white/55">{game.endReason}. {game.finishedBy ? 'Current scores saved.' : 'Unplayed letters have been deducted from the final scores.'}</p>{setup}</div>}
      {!!Object.keys(game.moves || {}).length && <details className="border-t border-white/10 pt-3"><summary className="cursor-pointer text-sm text-white/55">Turn history</summary><ol className="mt-3 space-y-2 max-h-64 overflow-y-auto text-sm text-white/65">{Object.values(game.moves).sort((a,b) => b.at-a.at).map(move => <li key={move.id}>{move.name} · {move.type === 'play' ? `${tiles(move.words).map(item => item.word).join(', ')} · ${move.score} points` : move.type === 'swap' ? 'Swapped letters' : 'Passed'}</li>)}</ol></details>}
      {!!Object.keys(game.history || {}).length && <details className="border-t border-white/10 pt-3"><summary className="cursor-pointer text-sm text-white/55">Past games</summary><div className="mt-3 space-y-2 text-sm text-white/65">{Object.values(game.history).sort((a,b) => b.finishedAt-a.finishedAt).map(item => <p key={item.id}>{Object.values(item.players).map(p => `${p.name}: ${p.score}`).join(' · ')}</p>)}</div></details>}
    </>}
    {dictionaryError && <p role="alert" className="text-sm text-red-300">{dictionaryError} <button type="button" onClick={() => setRetry(value => value+1)} className="underline">Retry dictionary</button></p>}
    {featured && !dictionary && !dictionaryError && <p role="status" className="text-xs text-white/45">Loading the English dictionary…</p>}
    {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
    <details className="border-t border-white/10 pt-3"><summary className="cursor-pointer text-sm text-white/55">How to play</summary><p className="mt-3 text-sm leading-relaxed text-white/55">Build a word across or down. The first word crosses the center star; later words connect to existing letters. Every word you create must be in the English dictionary. Bonus squares apply only to newly placed tiles. Blank tiles can be any letter and score zero. Play all seven letters for 50 extra points. Swap letters or pass if you’re stuck. The game ends when someone empties their rack with an empty bag, or after six turns without a word. There’s no timer: everything saves after each submitted turn.</p></details>
  </section>;
}
