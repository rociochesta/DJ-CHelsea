import { useRef, useState } from 'react';
import { Heart, MessageCircle, Send } from 'lucide-react';
import { database, ref, push, runTransaction } from '../utils/firebase';
import { insertWallEmoji } from '../utils/wallDraft';
import WallEmojiPicker from './WallEmojiPicker';

export default function WallPostInteractions({ roomCode, post, currentUser }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [heartBusy, setHeartBusy] = useState(false);
  const [error, setError] = useState('');
  const input = useRef(null);
  const selection = useRef({ index: 0, start: 0, end: 0 });
  const hearts = Object.values(post.hearts || {});
  const hearted = hearts.some(heart => heart.userId === currentUser?.id);
  const comments = Object.entries(post.comments || {}).map(([id, comment]) => ({ ...comment, id })).sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
  const locked = !currentUser?.id || busy;
  const toggleHeart = async () => {
    if (!currentUser?.id || heartBusy) return;
    setHeartBusy(true); setError('');
    try {
      await runTransaction(ref(database, `room-chat/${roomCode}/${post.id}`), value => {
        if (!value) return value;
        const next = { ...(value.hearts || {}) };
        const key = encodeURIComponent(currentUser.id).replace(/\./g, '%2E');
        if (next[key]) delete next[key];
        else next[key] = { userId: currentUser.id };
        return { ...value, hearts: next };
      });
    } catch { setError('Could not update your heart. Try again.'); }
    finally { setHeartBusy(false); }
  };
  const submit = async event => {
    event.preventDefault();
    if (locked || !text.trim()) return;
    setBusy(true); setError('');
    const id = push(ref(database, `room-chat/${roomCode}/${post.id}/comments`)).key;
    const comment = { text: text.trim(), userId: currentUser.id, userName: currentUser.name || 'Someone', timestamp: Date.now() };
    try {
      const result = await runTransaction(ref(database, `room-chat/${roomCode}/${post.id}`), value => value ? { ...value, comments: { ...(value.comments || {}), [id]: comment } } : value);
      if (!result.snapshot.exists()) throw new Error('Post deleted');
      setText(''); selection.current = { index: 0, start: 0, end: 0 }; setEmojiOpen(false);
    } catch { setError('Could not comment. Your draft is still here. Try again.'); }
    finally { setBusy(false); }
  };
  const addEmoji = emoji => {
    const next = insertWallEmoji([{ type: 'text', text }], selection.current, emoji);
    setText(next.blocks[0].text); selection.current = next.selection; setEmojiOpen(false);
    requestAnimationFrame(() => { input.current?.focus(); input.current?.setSelectionRange(next.selection.start, next.selection.end); });
  };
  return <div className="border-t border-white/10 pt-3 space-y-3">
    <div className="flex items-center gap-4 text-xs text-white/60">
      <button type="button" aria-label={hearted ? 'Remove heart' : 'Heart this post'} aria-pressed={hearted} disabled={!currentUser?.id || heartBusy} onClick={toggleHeart} className={`flex items-center gap-1.5 rounded-lg p-1 hover:text-pink-300 disabled:opacity-40 ${hearted ? 'text-pink-400' : ''}`}><Heart className="h-4 w-4" fill={hearted ? 'currentColor' : 'none'} /><span>{hearts.length}</span></button>
      <button type="button" aria-expanded={open} onClick={() => setOpen(value => !value)} className="flex items-center gap-1.5 rounded-lg p-1 hover:text-white"><MessageCircle className="h-4 w-4" />{comments.length} {comments.length === 1 ? 'comment' : 'comments'}</button>
    </div>
    {open && <div className="space-y-3">
      {comments.map(comment => <div key={comment.id} className="rounded-xl bg-white/5 p-2.5"><p className="text-xs font-medium text-white/65">{comment.userName || 'Someone'}</p><p className="mt-1 whitespace-pre-wrap break-words text-sm text-white/90">{comment.text}</p></div>)}
      <form onSubmit={submit} className="rounded-xl border border-white/15 bg-black/20 p-2">
        <textarea ref={input} aria-label="Write a comment" placeholder="Leave a comment…" value={text} disabled={locked} rows={2} onChange={event => setText(event.target.value)} onSelect={event => { selection.current = { index: 0, start: event.target.selectionStart, end: event.target.selectionEnd }; }} onKeyDown={event => { if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') submit(event); }} className="block w-full resize-none bg-transparent p-1 text-sm outline-none placeholder:text-white/40" />
        <div className="flex items-center justify-between"><div className="relative"><button type="button" aria-label="Add emoji to comment" aria-expanded={emojiOpen} disabled={locked} onClick={() => setEmojiOpen(value => !value)} className="rounded-full p-2 hover:bg-white/10">😊</button>{emojiOpen && <WallEmojiPicker disabled={locked} onSelect={addEmoji} onClose={() => setEmojiOpen(false)} />}</div><button type="submit" aria-label="Post comment" disabled={locked || !text.trim()} className="wall-send rounded-full p-2 text-white disabled:opacity-30"><Send className="h-4 w-4" /></button></div>
      </form>
    </div>}
    {error && <p role="alert" className="text-xs text-red-300">{error}</p>}
  </div>;
}
