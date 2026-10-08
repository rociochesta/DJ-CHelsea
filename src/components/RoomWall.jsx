import { useEffect, useRef, useState } from 'react';
import { ImagePlus, Trash2, X } from 'lucide-react';
import { database, ref, onValue, push, set, remove } from '../utils/firebase';
import GiphyPicker from './GiphyPicker';

const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

function WallImage({ src }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);
  return failed ? <p className="rounded-xl bg-black/20 p-3 text-sm text-white/50">This image could not load. Use a direct picture or GIF link.</p>
    : <img src={src} alt="Wall attachment" loading="lazy" onError={() => setFailed(true)} className="max-h-80 w-full rounded-2xl object-contain bg-black/20" />;
}

export default function RoomWall({ roomCode, currentUser }) {
  const [posts, setPosts] = useState([]);
  const [message, setMessage] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [attachment, setAttachment] = useState(null);
  const [giphyOpen, setGiphyOpen] = useState(false);
  const [selectedGif, setSelectedGif] = useState(null);
  const [busy, setBusy] = useState(false);
  const [readingFile, setReadingFile] = useState(false);
  const [error, setError] = useState('');
  const [deleteBusy, setDeleteBusy] = useState(null);
  const fileInput = useRef(null);
  const fileVersion = useRef(0);

  useEffect(() => {
    setPosts([]);
    return onValue(ref(database, `room-chat/${roomCode}`), snapshot => {
      setPosts(Object.entries(snapshot.val() || {}).map(([id, post]) => ({ ...post, id }))
        .filter(post => !post.isSystem)
        .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)));
    }, () => setError('Could not load the wall. Please try again.'));
  }, [roomCode]);

  const clearAttachment = () => {
    fileVersion.current += 1;
    setReadingFile(false);
    setAttachment(null);
    if (fileInput.current) fileInput.current.value = '';
  };

  const chooseFile = async event => {
    const file = event.target.files?.[0];
    if (!file) return;
    setError('');
    if (!IMAGE_TYPES.includes(file.type) || file.size > MAX_IMAGE_BYTES) {
      setError('Choose a JPG, PNG, WebP, or GIF up to 2 MB. Larger images can be added with a direct link.');
      event.target.value = '';
      return;
    }
    const version = ++fileVersion.current;
    setReadingFile(true);
    try {
      const data = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('Could not read this image.'));
        reader.readAsDataURL(file);
      });
      if (version !== fileVersion.current) return;
      setAttachment({ data, name: file.name });
      setSelectedGif(null);
      setImageUrl('');
    } catch { if (version === fileVersion.current) setError('Could not read this image. Please try again.'); }
    finally { if (version === fileVersion.current) setReadingFile(false); }
  };

  const submit = async event => {
    event.preventDefault();
    if (busy || readingFile || !currentUser?.id) return;
    setError('');
    let media = attachment?.data || '';
    if (imageUrl.trim()) {
      try {
        const url = new URL(imageUrl.trim());
        if (url.protocol !== 'https:') throw new Error();
        media = url.href;
      } catch { setError('Use a full HTTPS link to a picture or GIF.'); return; }
    }
    if (!message.trim() && !media) return;
    setBusy(true);
    try {
      await set(push(ref(database, `room-chat/${roomCode}`)), {
        kind: 'wall', userId: currentUser.id, userName: currentUser.name || 'Someone',
        message: message.trim(), imageUrl: media, timestamp: Date.now(),
        ...(selectedGif && media === selectedGif.imageUrl ? { giphyId: selectedGif.id, giphySourceUrl: selectedGif.sourceUrl } : {}),
      });
      setMessage(''); setImageUrl(''); setSelectedGif(null); clearAttachment();
    } catch { setError('Could not post to the wall. Your draft is still here. Try again.'); }
    finally { setBusy(false); }
  };

  const deletePost = async post => {
    if (deleteBusy || post.userId !== currentUser?.id) return;
    if (!window.confirm('Delete your wall post?')) return;
    setDeleteBusy(post.id);
    try { await remove(ref(database, `room-chat/${roomCode}/${post.id}`)); }
    catch { setError('Could not delete the post. Please try again.'); }
    finally { setDeleteBusy(null); }
  };

  return <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-5 space-y-5">
    <div><h2 className="text-xl font-bold">Wall</h2><p className="mt-1 text-sm text-white/55">Leave something for the next person who stops by.</p></div>
    <form onSubmit={submit} className="space-y-3">
      <label htmlFor="wall-message" className="sr-only">Wall message</label>
      <textarea id="wall-message" rows={3} value={message} disabled={busy} onChange={e => setMessage(e.target.value)} placeholder="Leave a message…" className="w-full rounded-2xl border border-white/15 bg-black/20 p-3 text-white focus:outline-none focus:border-fuchsia-400/60 disabled:opacity-50" />
      <label htmlFor="wall-image-link" className="block text-xs text-white/60">Picture or GIF link (optional)</label>
      <input id="wall-image-link" type="url" value={imageUrl} disabled={busy || readingFile} onChange={e => { setImageUrl(e.target.value); setSelectedGif(null); clearAttachment(); }} placeholder="https://… (direct image link)" className="w-full rounded-xl border border-white/15 bg-black/20 px-3 py-2 text-sm focus:outline-none focus:border-fuchsia-400/60" />
      {attachment && <div className="space-y-2"><WallImage src={attachment.data} /><div className="flex justify-between gap-2 text-xs text-white/60"><span className="break-all">{attachment.name}</span><button type="button" disabled={busy} onClick={clearAttachment} aria-label="Remove attachment"><X className="h-4 w-4" /></button></div></div>}
      {!attachment && /^https:\/\//i.test(imageUrl.trim()) && <WallImage src={imageUrl.trim()} />}
      {selectedGif && <div className="flex justify-between gap-2 text-xs text-white/60"><span>Powered By GIPHY</span><button type="button" disabled={busy} onClick={() => { setSelectedGif(null); setImageUrl(''); }}>Remove GIF</button></div>}
      <button type="button" disabled={busy || readingFile} onClick={() => setGiphyOpen(true)} className="rounded-xl border border-fuchsia-400/40 px-3 py-2 text-sm disabled:opacity-40">Search Giphy</button>
      <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={chooseFile} className="sr-only" disabled={busy || readingFile} />
      <div className="flex justify-between gap-3"><button type="button" disabled={busy || readingFile} onClick={() => fileInput.current?.click()} className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-3 py-2 text-sm disabled:opacity-40"><ImagePlus className="h-4 w-4" />{readingFile ? 'Loading…' : 'Picture / GIF'}</button><button type="submit" disabled={busy || readingFile || !currentUser?.id || (!message.trim() && !attachment && !imageUrl.trim())} className="rounded-xl border border-fuchsia-400/50 px-4 py-2 text-sm font-semibold disabled:opacity-40">{busy ? 'Posting…' : 'Post'}</button></div>
      <p className="text-xs text-white/40">JPG, PNG, WebP, or animated GIF. Uploads up to 2 MB.</p>
    </form>
    {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
    {!posts.length && <p className="py-5 text-center text-sm text-white/45">Nothing on the wall yet. Leave the first post.</p>}
    <div className="space-y-4 max-h-[42rem] overflow-y-auto">
      {posts.map(post => <article key={post.id} className="rounded-2xl border border-white/10 bg-black/20 p-4 space-y-3">
        <div className="flex items-start justify-between gap-3"><div><p className="font-semibold text-sm">{post.userName || 'Someone'}</p><time className="text-xs text-white/40" dateTime={new Date(post.timestamp || 0).toISOString()}>{new Date(post.timestamp || 0).toLocaleString()}</time></div>{post.userId === currentUser?.id && <button type="button" disabled={!!deleteBusy} onClick={() => deletePost(post)} aria-label="Delete your post" className="text-white/40 hover:text-red-300 disabled:opacity-40"><Trash2 className="h-4 w-4" /></button>}</div>
        {post.message && <p className="whitespace-pre-wrap break-words text-sm text-white/90">{post.message}</p>}
        {post.imageUrl && <WallImage src={post.imageUrl} />}
        {post.giphyId && <a href={post.giphySourceUrl || 'https://giphy.com/'} target="_blank" rel="noopener noreferrer" className="block text-xs font-semibold text-white/50">Powered By GIPHY</a>}
      </article>)}
    </div>
    {giphyOpen && <GiphyPicker onClose={() => setGiphyOpen(false)} onSelect={gif => { clearAttachment(); setImageUrl(gif.imageUrl); setSelectedGif(gif); setGiphyOpen(false); }} />}
  </section>;
}
