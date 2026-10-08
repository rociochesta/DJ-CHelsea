import { useEffect, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';
import { loadGiphy } from '../utils/giphy';

export default function GiphyPicker({ onSelect, onClose }) {
  const apiKey = import.meta.env.VITE_GIPHY_API_KEY;
  const [input, setInput] = useState('');
  const [query, setQuery] = useState('');
  const [gifs, setGifs] = useState([]);
  const [page, setPage] = useState({ nextOffset: 0, hasMore: false });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const controller = useRef(null);
  const searchInput = useRef(null);
  const closeButton = useRef(null);
  const panel = useRef(null);

  const search = async (term, offset = 0) => {
    controller.current?.abort();
    const request = new AbortController();
    controller.current = request;
    setBusy(true); setError('');
    if (!offset) setGifs([]);
    try {
      const result = await loadGiphy({ apiKey, query: term, offset, signal: request.signal });
      if (request.signal.aborted) return;
      setGifs(existing => offset ? [...existing, ...result.gifs.filter(gif => !existing.some(item => item.id === gif.id))] : result.gifs);
      setPage(result);
    } catch (cause) { if (!request.signal.aborted) setError(cause.message || 'Could not load GIFs.'); }
    finally { if (!request.signal.aborted) setBusy(false); }
  };

  useEffect(() => {
    const previousFocus = document.activeElement;
    (apiKey ? searchInput.current : closeButton.current)?.focus();
    if (apiKey) search('');
    return () => { controller.current?.abort(); previousFocus?.focus?.(); };
  }, []);

  const onKeyDown = event => {
    if (event.key === 'Escape') { event.preventDefault(); onClose(); }
    if (event.key === 'Tab') {
      const elements = [...panel.current.querySelectorAll('button:not(:disabled), input:not(:disabled), a[href]')];
      const first = elements[0]; const last = elements[elements.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }
  };

  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm" onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
    <section ref={panel} role="dialog" aria-modal="true" aria-labelledby="giphy-picker-title" onKeyDown={onKeyDown} className="w-full max-w-xl max-h-[85vh] overflow-y-auto rounded-3xl border border-white/15 bg-[#100c1c] p-5 space-y-4 text-white">
      <div className="flex items-center justify-between"><h2 id="giphy-picker-title" className="text-xl font-bold">Choose a GIF</h2><button ref={closeButton} type="button" onClick={onClose} aria-label="Close GIF picker" className="p-2"><X className="h-5 w-5" /></button></div>
      {apiKey ? <>
        <form onSubmit={event => { event.preventDefault(); setQuery(input); search(input); }} className="flex gap-2">
          <input ref={searchInput} aria-label="Search Giphy" value={input} maxLength={50} onChange={event => setInput(event.target.value)} placeholder="Search Giphy…" className="min-w-0 flex-1 rounded-xl border border-white/15 bg-white/5 px-3 py-2 focus:outline-none focus:border-fuchsia-400/60" />
          <button type="submit" className="rounded-xl border border-fuchsia-400/50 px-4 py-2" aria-label="Search GIFs"><Search className="h-5 w-5" /></button>
        </form>
        <p className="text-sm text-white/55">{query ? `Results for “${query}”` : 'Trending GIFs'}</p>
        {error && <p role="alert" className="text-sm text-red-300">{error} <button type="button" onClick={() => search(query)} className="underline">Retry</button></p>}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2" aria-busy={busy}>{gifs.map(gif => <button key={gif.id} type="button" onClick={() => onSelect(gif)} aria-label={`Select ${gif.title}`} className="overflow-hidden rounded-xl border border-white/10 hover:border-fuchsia-400 focus-visible:outline-fuchsia-400"><img src={gif.previewUrl} alt={gif.title} loading="lazy" className="h-32 w-full object-contain bg-black/20" /></button>)}</div>
        {busy && <p role="status" className="text-center text-sm text-white/60">Loading GIFs…</p>}
        {!busy && !error && !gifs.length && <p className="text-center text-sm text-white/55">No GIFs found. Try another search.</p>}
        {!error && page.hasMore && <button type="button" disabled={busy} onClick={() => search(query, page.nextOffset)} className="w-full rounded-xl border border-white/20 py-2 disabled:opacity-40">Load more</button>}
      </> : <p className="text-sm text-white/70">Giphy search is not available yet. You can still upload a GIF or paste a direct GIF link on the wall.</p>}
      <a href="https://giphy.com/" target="_blank" rel="noopener noreferrer" className="block text-right font-bold text-sm text-white">Powered By GIPHY</a>
    </section>
  </div>;
}
