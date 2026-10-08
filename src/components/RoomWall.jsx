import { useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { database, ref, onValue, push, set, remove } from '../utils/firebase';
import WallComposer from './WallComposer';
import WallImage from './WallImage';
import WallYouTube from './WallYouTube';
import WallVideo from './WallVideo';
import { wallBlocks,wallMediaKind,filterWallPosts } from '../utils/wallPosts';

export default function RoomWall({ roomCode, currentUser }) {
  const [posts, setPosts] = useState([]);
  const [error, setError] = useState('');
  const [deleteBusy, setDeleteBusy] = useState(null);
  const [filter,setFilter] = useState('all');
  const [sort,setSort] = useState('latest');
  useEffect(() => {
    setPosts([]);
    return onValue(ref(database, `room-chat/${roomCode}`), snapshot => {
      setPosts(Object.entries(snapshot.val() || {}).map(([id, post]) => ({ ...post, id }))
        .filter(post => !post.isSystem).sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)));
    }, () => setError('Could not load the wall. Please try again.'));
  }, [roomCode]);

  const post = async blocks => {
    await set(push(ref(database, `room-chat/${roomCode}`)), {
      kind: 'wall', userId: currentUser.id, userName: currentUser.name || 'Someone', blocks, timestamp: Date.now(),
    });
  };
  const deletePost = async item => {
    if (deleteBusy || item.userId !== currentUser?.id || !window.confirm('Delete your wall post?')) return;
    setDeleteBusy(item.id);
    try { await remove(ref(database, `room-chat/${roomCode}/${item.id}`)); }
    catch { setError('Could not delete the post. Please try again.'); }
    finally { setDeleteBusy(null); }
  };

  const visiblePosts=filterWallPosts(posts,filter,sort);
  return <section className="room-wall lounge-wall-panel rounded-2xl border p-5 space-y-5">
    <header><h2 className="wall-title">The Wall</h2><p className="mt-2 text-xs text-white/55"><span className="uppercase">Off the record</span> · Snapshots. Thoughts. Trouble. Leave the evidence.</p></header>
    <WallComposer key={roomCode} onPost={post} disabled={!currentUser?.id} placeholder="Drop a thought, a tease, or some evidence…" wallStyle allowYouTube allowVideoUpload />
    <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter wall posts">{[['all','All'],['photo','Photos'],['gif','GIFs'],['doodle','Doodles'],['video','Videos']].map(([value,label])=><button type="button" key={value} aria-pressed={filter===value} onClick={()=>setFilter(value)} className={`wall-filter ${filter===value?'wall-filter-active':''}`}>{label}</button>)}</div><label className="text-xs"><span className="sr-only">Sort wall posts</span><select value={sort} onChange={event=>setSort(event.target.value)} className="px-2 py-1 text-xs"><option value="latest">Latest first</option><option value="oldest">Oldest first</option></select></label></div>
    {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
    {!posts.length && <p className="py-5 text-center text-sm text-white/45">An empty wall? Suspicious. Make the first move.</p>}
    {!!posts.length&&!visiblePosts.length&&<p className="py-5 text-center text-sm text-white/45">Nothing here yet. Leave some new evidence.</p>}
    <div className="grid gap-4 items-start" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))' }}>
      {visiblePosts.map(item => {
        const content = wallBlocks(item);
        const date = new Date(item.timestamp || 0);
        return <article key={item.id} className="wall-post min-w-0 rounded-2xl border border-white/10 bg-black/20 p-3 space-y-3">
          <div className="flex items-start justify-between gap-2"><div className="flex min-w-0 items-center gap-2"><span aria-hidden="true" className="wall-avatar wall-avatar-small shrink-0">{(item.userName||'?').slice(0,1).toUpperCase()}</span><div className="min-w-0"><p className="font-medium text-xs break-words">{item.userName || 'Someone'}</p><time className="mt-1 block text-[10px] text-white/50" dateTime={date.toISOString()}>{date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })} · {date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}</time></div></div>{item.userId === currentUser?.id && <button type="button" disabled={!!deleteBusy} onClick={() => deletePost(item)} aria-label="Delete your post" className="shrink-0 text-white/40 hover:text-red-300 disabled:opacity-40"><Trash2 className="h-4 w-4" /></button>}</div>
          {content.map((block, index) => block.type === 'text' ? <p key={index} className="whitespace-pre-wrap break-words text-sm text-white/90">{block.text}</p> : block.type==='video' ? <WallVideo key={index} url={block.url}/> : block.type==='youtube' ? <WallYouTube key={index} videoId={block.videoId}/> : <div key={index} className="space-y-1"><div className="relative"><span className="wall-media-badge">{wallMediaKind(block)==='doodle'?'✎ Doodle':wallMediaKind(block)==='gif'?'GIF':'Photo'}</span><WallImage src={block.url} /></div>{block.giphyId && <a href={block.sourceUrl || 'https://giphy.com/'} target="_blank" rel="noopener noreferrer" className="block text-xs font-semibold text-white/50">Powered By GIPHY</a>}</div>)}
        </article>;
      })}
    </div>
  </section>;
}
