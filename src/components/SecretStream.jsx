import { useEffect, useRef, useState } from 'react';
import { database, ref, onValue, set, runTransaction } from '../utils/firebase';
import { streamPosition, streamUrl } from '../utils/secretStream';

export default function SecretStream({ roomCode, stream, onClose }) {
  const video = useRef(null);
  const latest = useRef(stream);
  latest.current = stream;
  const offset = useRef(0);
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [error, setError] = useState('');
  const [blocked, setBlocked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const now = () => Date.now() + offset.current;

  useEffect(() => onValue(ref(database, '.info/serverTimeOffset'), snapshot => {
    offset.current = snapshot.val() || 0;
  }), []);

  const synchronize = () => {
    const element = video.current;
    const state = latest.current;
    if (!element || !state?.url || element.readyState < 1) return;
    const target = Math.min(streamPosition(state, now()), Number.isFinite(element.duration) ? element.duration : Infinity);
    if (Math.abs(element.currentTime - target) > 0.75) element.currentTime = target;
    if (state.playing && element.paused && !element.ended) {
      element.play().then(() => setBlocked(false)).catch(() => setBlocked(true));
    } else if (!state.playing && !element.paused) element.pause();
  };

  useEffect(() => {
    synchronize();
    const timer = setInterval(synchronize, 1500);
    return () => clearInterval(timer);
  }, [stream]);

  const control = async (action, value) => {
    setError('');
    const expectedUrl = latest.current?.url;
    try {
      await runTransaction(ref(database, `karaoke-rooms/${roomCode}/secretStream`), state => {
        if (!state?.url || state.url !== expectedUrl) return;
        const timestamp = now();
        const position = streamPosition(state, timestamp);
        let next = action === 'seek' ? value : action === 'skip' ? position + value : position;
        next = Math.max(0, Math.min(next, duration || Infinity));
        return { ...state, position: next, updatedAt: timestamp, playing: action === 'toggle' ? !state.playing : state.playing };
      });
    } catch { setError('Could not update playback. Please try again.'); }
  };

  const load = async event => {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      const nextUrl = streamUrl(url);
      await set(ref(database, `karaoke-rooms/${roomCode}/secretStream`), {
        url: nextUrl, title: title.trim() || 'Watch together', position: 0, playing: false, updatedAt: now(),
      });
      setBlocked(false);
      setDuration(0);
      setTime(0);
    } catch (problem) { setError(problem instanceof TypeError ? 'Enter a valid direct HTTPS video URL.' : problem.message || 'Could not load the video.'); }
    finally { setBusy(false); }
  };

  return <section className="rounded-2xl border border-white/10 bg-black/30 p-4 space-y-4">
    <header className="flex items-center justify-between gap-3"><div><h2 className="text-xl font-medium">Stream</h2><p className="text-xs text-white/60 mt-1">Watch together. Everyone can play, pause and seek.</p></div><button type="button" onClick={onClose} className="rounded-lg border border-white/20 px-3 py-2">Back</button></header>
    <form onSubmit={load} className="space-y-3">
      <label className="block text-sm">Video URL<input required type="url" value={url} onChange={event => setUrl(event.target.value)} placeholder="https://…/video.mp4" className="mt-1 w-full rounded-lg border border-white/20 bg-black/40 p-3" /></label>
      <label className="block text-sm">Title (optional)<input value={title} onChange={event => setTitle(event.target.value)} className="mt-1 w-full rounded-lg border border-white/20 bg-black/40 p-3" /></label>
      <p className="text-xs text-white/50">Use a direct video link, preferably MP4 (H.264 + AAC). Load it once for the whole room.</p>
      <button disabled={busy} className="rounded-lg border border-white/20 px-4 py-2 disabled:opacity-50">{busy ? 'Loading…' : 'Load for everyone'}</button>
    </form>
    {error && <p role="alert" className="text-sm text-rose-300">{error}</p>}
    {stream?.url ? <div className="space-y-3">
      <h3 className="font-medium">{stream.title}</h3>
      <video key={stream.url} ref={video} src={stream.url} playsInline preload="metadata" className="w-full rounded-xl bg-black max-h-[65vh]" onLoadedMetadata={() => { setDuration(Number.isFinite(video.current.duration) ? video.current.duration : 0); synchronize(); }} onTimeUpdate={() => setTime(video.current?.currentTime || 0)} onError={() => setError('This video could not be loaded. Check the direct link, sharing permissions and video format.')} />
      {blocked && <button type="button" onClick={() => { video.current?.play().then(() => setBlocked(false)).catch(() => setError('Your browser could not start this video.')); }} className="rounded-lg border border-white/20 px-4 py-2">Enable playback on this device</button>}
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={() => control('skip', -10)} className="rounded-lg border border-white/20 p-2">−10 s</button>
        <button type="button" onClick={() => control('toggle')} className="rounded-lg border border-white/20 px-4 py-2">{stream.playing ? 'Pause for everyone' : 'Play for everyone'}</button>
        <button type="button" onClick={() => control('skip', 10)} className="rounded-lg border border-white/20 p-2">+10 s</button>
        <button type="button" onClick={() => video.current?.requestFullscreen?.()} className="rounded-lg border border-white/20 p-2">Fullscreen</button>
      </div>
      <label className="block text-xs text-white/70">Position: {Math.floor(time / 60)}:{String(Math.floor(time % 60)).padStart(2, '0')}<input aria-label="Seek for everyone" type="range" min="0" max={duration || 0} step="1" value={Math.min(time, duration || 0)} disabled={!duration} onChange={event => control('seek', Number(event.target.value))} className="mt-2 w-full" /></label>
      <label className="block text-xs text-white/70">Volume on this device<input aria-label="Volume on this device" type="range" min="0" max="1" step="0.05" defaultValue="1" onChange={event => { if (video.current) video.current.volume = Number(event.target.value); }} className="ml-3 align-middle" /></label>
    </div> : <p className="py-8 text-center text-white/50">Add a video link to start watching together.</p>}
  </section>;
}
