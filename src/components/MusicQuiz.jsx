import React, { useEffect, useRef, useState } from 'react';
import { database, ref, onValue, runTransaction } from '../utils/firebase';
import { ROUND_MS, updateMusicQuiz, musicQuizPoints, musicQuizSong } from '../utils/musicQuiz';
import MusicWaveRing from './MusicWaveRing';

export default function MusicQuiz({ roomCode, currentUser, invitation, players }) {
  const audio = useRef(null);
  const audioContext = useRef(null);
  const analyser = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [offset, setOffset] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [audioStatus, setAudioStatus] = useState('');
  const quiz = invitation.quiz;
  const scorePlayers = [...new Map([...Object.keys(quiz.scores || {}).map(id => ({ id, name: Object.values(quiz.results || {}).find(winner => winner.id === id)?.name || (quiz.lastWinner?.id === id ? quiz.lastWinner.name : 'Player') })), ...(quiz.finalPlayers || players)].map(player => [player.id, player])).values()];
  const standings = scorePlayers.sort((a, b) => (quiz.scores?.[b.id] || 0) - (quiz.scores?.[a.id] || 0));
  const song = musicQuizSong(quiz);
  const result = quiz.results?.[quiz.round];
  const seconds = quiz.startedAt ? Math.max(0, Math.ceil((quiz.startedAt + ROUND_MS - now) / 1000)) : 30;
  const ended = !song || !!result || seconds === 0;
  const isInviter = invitation.inviterId === currentUser.id;
  const attempt = quiz.attempts?.[quiz.round]?.[currentUser.id];
  const pointsNow = musicQuizPoints(seconds * 1000);
  const timerColor = seconds >= 20 ? '#e879f9' : seconds >= 10 ? '#fbbf24' : '#fb7185';
  const remainingFraction = quiz.startedAt ? Math.min(1, Math.max(0, (quiz.startedAt + ROUND_MS - now) / ROUND_MS)) : 1;

  useEffect(() => onValue(ref(database, '.info/serverTimeOffset'), snapshot => setOffset(snapshot.val() || 0)), []);
  useEffect(() => {
    setNow(Date.now() + offset);
    const timer = setInterval(() => setNow(Date.now() + offset), 200);
    return () => clearInterval(timer);
  }, [offset]);

  const play = async () => {
    const element = audio.current;
    if (!element || !song || !quiz.startedAt || ended) return;
    element.currentTime = Math.min(29.9, Math.max(0, (Date.now() + offset - quiz.startedAt) / 1000));
    try {
      if (!audioContext.current && element.crossOrigin === 'anonymous') {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (AudioContext) {
          const context = new AudioContext();
          audioContext.current = context;
          const source = context.createMediaElementSource(element);
          const node = context.createAnalyser();
          node.fftSize = 256;
          node.smoothingTimeConstant = 0.8;
          source.connect(node);
          node.connect(context.destination);
          analyser.current = node;
        }
      }
      if (audioContext.current?.state === 'suspended') await audioContext.current.resume();
    } catch { /* The wave ring can animate without audio analysis. */ }
    try { await element.play(); setAudioStatus(''); }
    catch { setAudioStatus('Tap Play clip to enable audio.'); }
  };
  useEffect(() => {
    setPlaying(false);
    setAudioStatus('');
    if (song && quiz.startedAt) play();
    return () => audio.current?.pause();
  }, [quiz.round, quiz.startedAt, quiz.finished, offset]);
  useEffect(() => { if (ended) audio.current?.pause(); }, [ended]);
  useEffect(() => () => {
    audioContext.current?.close().catch(() => {});
    audioContext.current = null;
    analyser.current = null;
  }, []);

  useEffect(() => {
    if (!song || !quiz.startedAt || invitation.responses?.[currentUser.id] !== 'joined') return;
    let active = true;
    let timer;
    const advance = async () => {
      try {
        const result = await runTransaction(ref(database, `karaoke-rooms/${roomCode}/gameInvitation`), current =>
          updateMusicQuiz(current, invitation.id, quiz.round, { type: 'timeout' }, currentUser, Date.now() + offset));
        if (active && !result.committed) timer = setTimeout(advance, 1000);
      } catch {
        if (active) timer = setTimeout(advance, 1500);
      }
    };
    timer = setTimeout(advance, Math.max(0, quiz.startedAt + ROUND_MS - (Date.now() + offset)));
    return () => { active = false; clearTimeout(timer); };
  }, [quiz.round, quiz.startedAt, quiz.finished, offset, roomCode, invitation.id, invitation.responses?.[currentUser.id], currentUser.id, !!song]);

  const act = async action => {
    setBusy(true); setError('');
    try {
      await runTransaction(ref(database, `karaoke-rooms/${roomCode}/gameInvitation`), current =>
        updateMusicQuiz(current, invitation.id, quiz.round, action, currentUser, Date.now() + offset));
    } catch { setError('Could not update the quiz. Please try again.'); }
    finally { setBusy(false); }
  };

  return <section className="rounded-2xl border border-fuchsia-400/20 bg-gradient-to-br from-fuchsia-950/40 via-black/30 to-indigo-950/40 p-4 sm:p-6 space-y-5">
    <h2 className="text-2xl font-bold">Music Quiz</h2>
    {quiz.categories?.length > 0 && <p className="text-sm text-fuchsia-200">Categories: {quiz.categories.join(', ')}</p>}
    <p className="text-sm text-white/60">Listen to 30 seconds. Each round randomly asks for the artist or song title. One answer per round; the first correct answer earns points and starts the next clip for everyone.</p>
    {quiz.lastTimeout && (!quiz.lastWinner || quiz.lastTimeout.round > quiz.lastWinner.round)
      ? <p role="status" className="rounded-xl bg-amber-500/10 p-3 text-sm text-amber-200">Time’s up on question {quiz.lastTimeout.round + 1}! No points awarded · {quiz.lastTimeout.artist} — {quiz.lastTimeout.title}</p>
      : quiz.lastWinner && <p role="status" className="rounded-xl bg-emerald-500/10 p-3 text-sm text-emerald-200">🎉 {quiz.lastWinner.name} got question {quiz.lastWinner.round + 1} first! +{quiz.lastWinner.points} points · {quiz.lastWinner.artist} — {quiz.lastWinner.title}</p>}
    {song && <div className="flex flex-wrap gap-2">{standings.map(player => <span key={player.id} className="rounded-full border border-white/15 px-3 py-2 text-sm">{player.name}: {quiz.scores?.[player.id] || 0} points</span>)}</div>}
    {!song ? <div role="status" className="space-y-3">
      <h3 className="text-xl font-bold">🏆 Final results</h3>
      <ol className="space-y-2">{standings.map(player => <li key={player.id} className="flex items-center justify-between rounded-xl border border-white/15 bg-white/5 p-3">
        <span>{1 + standings.filter(other => (quiz.scores?.[other.id] || 0) > (quiz.scores?.[player.id] || 0)).length}. {player.name}</span>
        <strong>{quiz.scores?.[player.id] || 0} points</strong>
      </li>)}</ol>
      {!standings.length && <p>No scores yet.</p>}
    </div> : <>
      <div className="flex flex-wrap items-center gap-5 rounded-2xl border border-white/10 bg-gradient-to-br from-fuchsia-500/10 to-transparent p-4 sm:p-5">
        <div role="timer" aria-label={`${seconds} seconds remaining`} className="relative mx-auto h-48 w-48 shrink-0 sm:mx-0 sm:h-56 sm:w-56">
          <MusicWaveRing playing={playing && !ended} analyserRef={analyser} color={timerColor} />
          <svg viewBox="0 0 120 120" className="absolute inset-[20%] h-[60%] w-[60%] -rotate-90" aria-hidden="true">
            <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="6" />
            <circle cx="60" cy="60" r="52" fill="none" stroke={timerColor} strokeWidth="6" strokeLinecap="round" strokeDasharray={2 * Math.PI * 52} strokeDashoffset={2 * Math.PI * 52 * (1 - remainingFraction)} style={{ transition: 'stroke-dashoffset 200ms linear, stroke 300ms', filter: `drop-shadow(0 0 5px ${timerColor}55)` }} />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center"><span className="text-5xl font-bold tabular-nums leading-none" style={{ color: timerColor }}>{seconds}</span><span className="mt-2 text-[10px] uppercase tracking-widest text-white/45">seconds left</span></div>
        </div>
        <div className="min-w-0 flex-1 space-y-3">
          <p className="text-xs uppercase tracking-widest text-white/50">Question {quiz.round + 1}{quiz.questionCount === 'unlimited' ? ' · Continuous play' : ` / ${quiz.rounds.length}`}</p>
          <p className="text-sm text-white/60">{ended ? 'Clip finished' : playing ? '♫ Now playing · Listen closely' : quiz.startedAt ? 'Press Play clip to listen' : 'Your next music challenge'}</p>
          <p className="text-xl font-semibold" style={{ color: timerColor }}>{ended ? (result ? 'Round won' : 'Time’s up') : quiz.startedAt ? `+${pointsNow} points to win` : 'Ready when you are'}</p>
          <div className="flex flex-wrap gap-2" aria-label="Points by seconds remaining">{[[5,'30–20s'],[3,'19–10s'],[1,'9–1s']].map(([points, range]) => <span key={points} className={`rounded-lg border px-2 py-1.5 text-xs ${!ended && pointsNow === points ? 'border-white/25 bg-white/10 text-white' : 'border-white/5 text-white/40'}`}><strong>{points} pts</strong><span className="ml-2">{range}</span></span>)}</div>
        </div>
      </div>
      <audio ref={audio} src={song.audioUrl} crossOrigin={song.audioUrl.includes('.supabase.co/') ? 'anonymous' : undefined} preload="auto" onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)} onLoadedMetadata={() => { if (quiz.startedAt && !ended) play(); }} onError={() => { setPlaying(false); setAudioStatus('This clip could not load. Try the next song.'); }} />
      {!quiz.startedAt ? (isInviter ? <button disabled={busy} onClick={() => act({ type: 'start' })} className="rounded-xl bg-fuchsia-600 px-4 py-3">Start quiz</button> : <p>Waiting for {invitation.inviterName} to start…</p>) : !ended && <button onClick={play} className="rounded-xl border border-white/20 px-4 py-2">Play clip</button>}
      {audioStatus && <p role="status" className="text-amber-200 text-sm">{audioStatus}</p>}
      <h3 className="text-2xl sm:text-3xl font-semibold">{(song.mode || quiz.mode) === 'artist' ? 'Who is the artist?' : 'What is the song called?'}</h3>
      <div className="grid gap-2 sm:grid-cols-2">{song.choices.map((choice, index) => <button key={`${quiz.round}-${index}`} disabled={busy || !quiz.startedAt || ended || attempt !== undefined} onClick={() => act({ type: 'answer', choice: index })} className={`rounded-xl border p-3 text-left disabled:opacity-60 ${ended && index === song.answer ? 'border-emerald-400 bg-emerald-500/10' : attempt === index ? 'border-amber-400' : 'border-white/15 hover:border-fuchsia-400'}`}>{choice}</button>)}</div>
      {attempt !== undefined && !ended && <p role="status" className="text-sm text-white/60">Answer submitted. Waiting for the round to finish.</p>}
      {ended && <p role="status" className="text-sm text-white/60">Time’s up! Moving to the next song…</p>}
    </>}
    {error && <p role="alert" className="text-red-300">{error}</p>}
  </section>;
}
