import { useEffect, useRef, useState } from 'react';
import { X, Disc3 } from 'lucide-react';
import { database, ref, onValue, runTransaction } from '../utils/firebase';
import { createMusicQuiz, loadMusicQuizCatalog, musicQuizCategories, musicQuizPoints, ROUND_MS } from '../utils/musicQuiz';
import { updateSecretMusicQuiz, secretMusicQuizResult } from '../utils/secretMusicQuiz';
import MusicWaveRing from './MusicWaveRing';
import MusicQuizReports from './MusicQuizReports';

const button = 'rounded-xl border border-white/15 px-4 py-2 text-sm hover:bg-white/5 disabled:opacity-40';

export default function SecretMusicQuiz({ roomCode, currentUser, games, onClose }) {
  const [catalog, setCatalog] = useState(null);
  const [categories, setCategories] = useState([]);
  const [count, setCount] = useState(20);
  const [retry, setRetry] = useState(0);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [selected, setSelected] = useState(null);
  const [setup, setSetup] = useState(false);
  const [offset, setOffset] = useState(0);
  const [now, setNow] = useState(Date.now());
  const [audioError, setAudioError] = useState('');
  const audio = useRef(null);
  const audioContext = useRef(null);
  const analyser = useRef(null);
  const [playing, setPlaying] = useState(false);
  const challenges = Object.values(games || {}).sort((a, b) => b.createdAt - a.createdAt);
  const game = selected ? games?.[selected] : challenges[0];
  const player = game?.players?.[currentUser?.id];
  const song = !player?.finished && game?.rounds?.[player?.round];
  const result = secretMusicQuizResult(game);
  const seconds = player?.startedAt ? Math.max(0, Math.ceil((player.startedAt + ROUND_MS - now) / 1000)) : 30;
  const betweenSongs = !!song && !player?.startedAt;
  const fraction = player?.startedAt ? Math.min(1, Math.max(0, (player.startedAt + ROUND_MS - now) / ROUND_MS)) : 1;

  useEffect(() => {
    let active = true;
    setError('');
    loadMusicQuizCatalog().then(songs => { if (active) { setCatalog(songs); setCategories(musicQuizCategories(songs)); } }).catch(cause => { if (active) setError(cause.message); });
    return () => { active = false; };
  }, [retry]);
  useEffect(() => onValue(ref(database, '.info/serverTimeOffset'), snapshot => setOffset(snapshot.val() || 0)), []);
  useEffect(() => { const timer = setInterval(() => setNow(Date.now() + offset), 200); return () => clearInterval(timer); }, [offset]);
  const act = async action => {
    if (lock.current || !currentUser?.id) return;
    lock.current = true; setBusy(true); setError('');
    try {
      const saved = await runTransaction(ref(database, `karaoke-rooms/${roomCode}/secretMusicQuizzes/${game.id}`), value => updateSecretMusicQuiz(value, { ...action, gameId: game.id, round: player?.round ?? 0, user: currentUser, now: Date.now() + offset }), { applyLocally: false });
      if (!saved.committed) throw new Error('This turn changed. Please try again.');
    } catch (cause) { setError(cause.message || 'Could not save your answer. Try again.'); }
    finally { lock.current = false; setBusy(false); }
  };
  useEffect(() => {
    if (!song || player?.startedAt || setup) return;
    const timer = setInterval(() => { if (Date.now() + offset >= (player.nextAt || 0)) act({ type: 'start' }); }, 250);
    return () => clearInterval(timer);
  }, [game?.id, player?.round, player?.startedAt, player?.nextAt, setup, offset]);
  useEffect(() => {
    if (!song || !player?.startedAt || setup) return;
    let active = true;
    const timer = setInterval(() => { if (active && Date.now() + offset >= player.startedAt + ROUND_MS) act({ type: 'timeout' }); }, 500);
    return () => { active = false; clearInterval(timer); };
  }, [game?.id, player?.round, player?.startedAt, setup, offset]);
  const play = async () => {
    if (!audio.current || !player?.startedAt || seconds <= 0) return;
    audio.current.currentTime = Math.min(29.9, Math.max(0, (Date.now() + offset - player.startedAt) / 1000));
    try {
      if (!audioContext.current && audio.current.crossOrigin === 'anonymous') {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (AudioContext) {
          const context = new AudioContext();
          audioContext.current = context;
          const source = context.createMediaElementSource(audio.current);
          const node = context.createAnalyser(); node.fftSize = 256; node.smoothingTimeConstant = 0.8;
          source.connect(node); node.connect(context.destination); analyser.current = node;
        }
      }
      if (audioContext.current?.state === 'suspended') await audioContext.current.resume();
    } catch { /* Keep audio playback available when analysis is unsupported. */ }
    try { await audio.current.play(); setAudioError(''); } catch { setAudioError('Tap the countdown to enable audio.'); }
  };
  useEffect(() => {
    setAudioError('');
    setPlaying(false);
    if (player?.startedAt && song && !setup) play();
    return () => audio.current?.pause();
  }, [game?.id, player?.round, player?.startedAt, setup]);
  useEffect(() => { if (!seconds) audio.current?.pause(); }, [seconds]);
  useEffect(() => () => { audioContext.current?.close().catch(() => {}); }, []);
  const deleteChallenge = async () => {
    if (lock.current || !game || !currentUser?.id || !window.confirm('Delete this challenge and its saved scores for both players?')) return;
    lock.current = true; setBusy(true); setError('');
    try {
      const saved = await runTransaction(ref(database, `karaoke-rooms/${roomCode}/secretMusicQuizzes/${game.id}`), value => {
        if (!value || value.id !== game.id) return;
        if (value.creatorId !== currentUser.id && !value.players?.[currentUser.id]) return;
        return null;
      }, { applyLocally: false });
      if (!saved.committed) throw new Error('Could not delete this challenge. Try again.');
      audio.current?.pause(); setSelected(null); setSetup(false);
    } catch (cause) { setError(cause.message || 'Could not delete this challenge. Try again.'); }
    finally { lock.current = false; setBusy(false); }
  };
  const create = async () => {
    if (lock.current || !currentUser?.id) return;
    lock.current = true; setBusy(true); setError('');
    try {
      const quiz = createMusicQuiz(catalog, Math.random, categories, count);
      const id = crypto.randomUUID();
      const challenge = { id, creatorId: currentUser.id, createdAt: Date.now() + offset, rounds: quiz.rounds, categories: quiz.categories, questionCount: count,
        players: { [currentUser.id]: { id: currentUser.id, name: currentUser.name || 'Someone', round: 0, score: 0, startedAt: Date.now() + offset } } };
      await runTransaction(ref(database, `karaoke-rooms/${roomCode}/secretMusicQuizzes/${id}`), value => value || challenge, { applyLocally: false });
      setSelected(id); setSetup(false);
    } catch (cause) { setError(cause.message || 'Could not start the quiz. Try again.'); }
    finally { lock.current = false; setBusy(false); }
  };
  return <section className="secret-music-quiz lounge-words-panel rounded-2xl border p-4 sm:p-6 space-y-5">
    <header className="flex items-center justify-between gap-3"><div><p className="quiz-accent text-xs uppercase tracking-widest">A little music rivalry</p><div className="mt-1 flex items-center gap-2"><Disc3 className="quiz-accent h-5 w-5" /><h2 className="text-2xl font-semibold">Music Quiz</h2></div></div><button className="fortune-start shrink-0 rounded-full p-2" onClick={onClose} aria-label="Close music quiz"><X className="h-4 w-4" /></button></header>
    <p className="text-sm text-white/60">Play now, challenge your person later. Same songs, same questions. Highest score wins.</p>
    {challenges.length > 0 && <div className="flex flex-wrap gap-3"><label className="min-w-0 flex-1 text-sm">Saved challenges<select className="mt-1 block w-full rounded-xl bg-gray-900 p-2" value={game?.id || ''} onChange={event => { setSelected(event.target.value); setSetup(false); }}>{challenges.map(item => <option key={item.id} value={item.id}>{item.players[item.creatorId]?.name} · {item.questionCount} questions · {new Date(item.createdAt).toLocaleDateString()}</option>)}</select></label><button className={button} disabled={busy} onClick={() => setSetup(value => !value)}>{setup ? 'Back to challenge' : 'New challenge'}</button>{(game?.creatorId === currentUser?.id || player) && <button className={button} disabled={busy} onClick={deleteChallenge}>Delete challenge</button>}</div>}
    {(!game || setup) ? <div className="space-y-4">
      <fieldset disabled={busy}><legend className="mb-2 text-sm">Choose categories</legend><div className="flex flex-wrap gap-2">{musicQuizCategories(catalog).map(category => <label key={category} className={`${button} quiz-category flex items-center gap-2 ${categories.includes(category) ? 'quiz-category-selected' : ''}`}><input type="checkbox" checked={categories.includes(category)} onChange={event => setCategories(values => event.target.checked ? [...values, category] : values.filter(value => value !== category))} />{category}</label>)}</div></fieldset>
      <label className="block text-sm">Number of questions<select className="mt-2 block w-full rounded-xl border border-white/10 p-3" value={count} disabled={busy} onChange={event => setCount(Number(event.target.value))}><option value={20}>20 questions</option><option value={50}>50 questions</option></select></label>
      <p className="text-xs text-white/50">30 seconds per song. Correct answers earn 5, 3, or 1 point depending on speed. One answer per question.</p>
      {!catalog && <p role="status">Loading song categories… <button className={button} onClick={() => setRetry(value => value + 1)}>Retry</button></p>}
      <button className={`${button} fortune-start`} disabled={busy || !catalog || !categories.length || !currentUser?.id} onClick={create}>Start challenge</button>
    </div> : <>
      <p className="quiz-accent text-sm">{game.categories.join(' · ')} · {game.questionCount} questions</p>
      {player?.finished || result ? <div className="space-y-3" role="status"><h3 className="text-xl font-semibold">{result ? result.tie ? 'It’s a tie!' : `${result.winner.name} wins!` : 'Your score is saved'}</h3>{Object.values(game.players).map(item => <p key={item.id}>{item.name}: {item.finished ? `${item.score} points` : 'Playing…'}</p>)}{!result && <p className="text-sm text-white/60">{Object.keys(game.players).length === 1 ? 'Your person can now play the same playlist.' : 'Waiting for your person to finish the same playlist.'}</p>}</div> : player && song ? <div className="space-y-4">
        <div className="flex justify-between"><p>Question {player.round + 1} / {game.questionCount}</p><p>{player.score} points</p></div>
        <div className="flex flex-wrap items-center gap-5 rounded-2xl border border-white/10 bg-black/10 p-4">
          <div role="timer" aria-label={betweenSongs ? 'Next song in two seconds' : `${seconds} seconds remaining`} className="relative mx-auto h-48 w-48 shrink-0 sm:mx-0 sm:h-56 sm:w-56">
            <MusicWaveRing playing={playing && !!player.startedAt && seconds > 0} analyserRef={analyser} color="#d8a56f" />
            <svg viewBox="0 0 120 120" className="absolute inset-[20%] h-[60%] w-[60%] -rotate-90" aria-hidden="true"><circle cx="60" cy="60" r="52" fill="none" stroke="rgba(216,165,111,.12)" strokeWidth="6" /><circle cx="60" cy="60" r="52" fill="none" stroke="#d8a56f" strokeWidth="6" strokeLinecap="round" strokeDasharray={2 * Math.PI * 52} strokeDashoffset={2 * Math.PI * 52 * (1 - fraction)} style={{ transition: 'stroke-dashoffset 200ms linear', filter: 'drop-shadow(0 0 5px #d8a56f55)' }} /></svg>
            <button type="button" onClick={play} aria-label="Enable quiz audio" className="absolute inset-0 flex flex-col items-center justify-center rounded-full"><span className="quiz-accent text-5xl font-bold tabular-nums">{betweenSongs ? Math.max(0, Math.ceil(((player.nextAt || now) - now) / 1000)) : seconds}</span><span className="mt-2 text-[10px] uppercase tracking-widest text-white/45">{betweenSongs ? 'next song' : 'seconds left'}</span></button>
          </div>
          <div className="space-y-3"><p role="status" className="quiz-accent">{betweenSongs ? 'Next beat incoming…' : playing ? 'On the air' : 'Listen, guess, win'}</p><div className="flex flex-wrap gap-2">{[[5,'30–20s'],[3,'19–10s'],[1,'9–1s']].map(([points, range]) => <span key={points} className={`rounded-lg border px-2 py-1.5 text-xs ${!betweenSongs && musicQuizPoints(seconds * 1000) === points ? 'border-white/25 bg-white/10 quiz-accent' : 'border-white/5 text-white/40'}`}>{points} pts · {range}</span>)}</div>{player.round > 0 && <p className="text-sm text-white/60">Last answer: +{player.results?.[player.round - 1]?.points || 0} points</p>}</div>
        </div>
        <audio ref={audio} src={song.audioUrl} crossOrigin={song.audioUrl.includes('.supabase.co/') ? 'anonymous' : undefined} preload="auto" onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)} onLoadedMetadata={() => { if (player.startedAt) play(); }} onError={() => setAudioError('This clip could not load. You can skip or report it.')} />
        {audioError && <p role="status" className="text-sm text-amber-200">{audioError}</p>}
        <h3 className="text-xl">{song.mode === 'artist' ? 'Who is the artist?' : 'What is the song called?'}</h3>
        <p className="text-sm text-white/50">Correct answer: +{musicQuizPoints(seconds * 1000)} points</p>
        <div className="grid gap-2 sm:grid-cols-2">{song.choices.map((choice, index) => <button key={index} className={`${button} text-left`} disabled={busy || !player.startedAt || !seconds} onClick={() => act({ type: 'answer', choice: index })}>{choice}</button>)}</div>
        <button className={button} disabled={busy || !player.startedAt || !seconds} onClick={() => act({ type: 'skip' })}>Skip song</button>
        {player.round > 0 && <p role="status" className="text-sm text-white/60">Last answer: +{player.results?.[player.round - 1]?.points || 0} points</p>}
      </div> : <div className="space-y-3"><p>{game.players[game.creatorId]?.finished ? 'Your person’s score is saved. Your turn to play the same playlist.' : `${game.players[game.creatorId]?.name} is playing first. Your turn opens when they finish.`}</p><button className={`${button} fortune-start`} disabled={busy || !currentUser?.id || !game.players[game.creatorId]?.finished || Object.keys(game.players).length >= 2} onClick={() => act({ type: 'join' })}>Play this challenge</button></div>}
    </>}
    <MusicQuizReports song={!setup ? song : null} currentUser={currentUser} roomCode={roomCode} challengeId={game?.id} round={player?.round} />
    {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
  </section>;
}
