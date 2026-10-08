import { useRef, useState } from 'react';
import { Plus, ImagePlus, Link, Send, X, Pencil, Images, Youtube, Video } from 'lucide-react';
import GiphyPicker from './GiphyPicker';
import WallImage from './WallImage';
import DrawingPad from './DrawingPad';
import WallYouTube from './WallYouTube';
import WallVideo from './WallVideo';
import { validateWallVideoFile } from '../utils/wallVideo';
import { youtubeVideoId } from '../utils/wallYouTube';
import { insertWallMedia, cleanWallDraft, insertWallEmoji } from '../utils/wallDraft';

export default function WallComposer({ onPost, disabled, placeholder = 'Leave something on the wall…', submitLabel = 'Post to wall', wallStyle = false, allowYouTube = false, allowVideoUpload = false }) {
  const [blocks, setBlocks] = useState([{ type: 'text', text: '' }]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [giphyOpen, setGiphyOpen] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [link, setLink] = useState('');
  const [videoLink,setVideoLink]=useState('');
  const [videoLinkOpen,setVideoLinkOpen]=useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [reading, setReading] = useState(false);
  const [drawingOpen, setDrawingOpen] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const selection = useRef({ index: 0, start: 0, end: 0 });
  const inputs = useRef({});
  const fileInput = useRef(null);
  const videoInput = useRef(null);
  const locked = busy || reading || disabled;
  const addEmoji = emoji => {
    const next = insertWallEmoji(blocks, selection.current, emoji);
    setBlocks(next.blocks);
    selection.current = next.selection;
    const { index, start: caret } = next.selection;
    requestAnimationFrame(() => { inputs.current[index]?.focus(); inputs.current[index]?.setSelectionRange(caret, caret); });
    setEmojiOpen(false);
  };

  const addMedia = media => {
    const { index, start, end } = selection.current;
    const next = insertWallMedia(blocks, index, start, end, media);
    const nextIndex = index + media.length + 1;
    setBlocks(next); setMenuOpen(false);
    selection.current = { index: nextIndex, start: 0, end: 0 };
    requestAnimationFrame(() => { inputs.current[nextIndex]?.focus(); inputs.current[nextIndex]?.setSelectionRange(0, 0); });
  };

  const readFiles = async files => {
    if (locked) return;
    setError(''); setReading(true);
    try {
      const images = [...files];
      if (images.some(file => !['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type) || file.size > 2 * 1024 * 1024)) throw new Error('Choose JPG, PNG, WebP, or GIF files up to 2 MB each.');
      const media = await Promise.all(images.map(file => new Promise((resolve, reject) => {
        const reader = new FileReader(); reader.onerror = () => reject(new Error('Could not read the image.'));
        reader.onload = () => resolve({ type: 'image', url: reader.result }); reader.readAsDataURL(file);
      })));
      const bytes = [...blocks, ...media].reduce((sum, block) => sum + (block.url?.startsWith('data:') ? block.url.length : 0), 0);
      if (bytes > 8 * 1024 * 1024) throw new Error('This post has too many large pictures. Split it into two posts.');
      addMedia(media);
    } catch (cause) { setError(cause.message); }
    finally { setReading(false); if (fileInput.current) fileInput.current.value = ''; }
  };

  const paste = event => {
    const images = [...event.clipboardData.items].filter(item => item.kind === 'file' && item.type.startsWith('image/')).map(item => item.getAsFile()).filter(Boolean);
    if (!images.length) return;
    event.preventDefault(); readFiles(images);
  };
  const readVideo = async event => {
    const file=event.target.files?.[0];if(!file||locked)return;
    setReading(true);setError('');
    try{
      validateWallVideoFile(file);
      const url=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onerror=()=>reject(new Error('Could not read this video.'));reader.onload=()=>resolve(reader.result);reader.readAsDataURL(file);});
      const total=blocks.reduce((sum,block)=>sum+(block.url?.startsWith('data:')?block.url.length:0),url.length);
      if(total>8*1024*1024)throw new Error('This post has too much media. Split it into two posts.');
      addMedia([{type:'video',url}]);
    }catch(cause){setError(cause.message);}finally{setReading(false);event.target.value='';}
  };

  const addLink = () => {
    try {
      const url = new URL(link.trim()); if (url.protocol !== 'https:') throw new Error();
      addMedia([{ type: 'image', url: url.href }]); setLink(''); setLinkOpen(false); setError('');
    } catch { setError('Paste a full HTTPS link to a picture or GIF.'); }
  };
  const addVideo = () => {
    const videoId=youtubeVideoId(videoLink);
    if(!videoId){setError('Paste a valid YouTube video link.');return;}
    addMedia([{type:'youtube',videoId}]);setVideoLink('');setVideoLinkOpen(false);setError('');
  };

  const submit = async event => {
    event?.preventDefault(); if (locked) return;
    const content = cleanWallDraft(blocks); if (!content.length) return;
    setBusy(true); setError('');
    try { await onPost(content); setBlocks([{ type: 'text', text: '' }]); selection.current = { index: 0, start: 0, end: 0 }; setLinkOpen(false); setLink(''); setVideoLinkOpen(false); setVideoLink(''); }
    catch { setError('Could not post. Your draft is still here. Try again.'); }
    finally { setBusy(false); }
  };

  return <>
    <form onSubmit={submit} className={`lounge-composer ${wallStyle ? 'wall-composer' : ''} rounded-2xl border border-white/15 bg-black/20 focus-within:border-fuchsia-400/50 transition`}>
      <div className="p-3 space-y-2 max-h-[30rem] overflow-y-auto" onPaste={paste}>
        {blocks.map((block, index) => block.type === 'text' ? <textarea key={index} ref={element => { inputs.current[index] = element; }} aria-label={index === 0 ? placeholder : 'Text below image'} value={block.text} disabled={locked} rows={block.text ? Math.min(8, block.text.split('\n').length + 1) : 2}
          onSelect={event => { selection.current = { index, start: event.target.selectionStart, end: event.target.selectionEnd }; }}
          onChange={event => { const text = event.target.value; setBlocks(existing => existing.map((item, i) => i === index ? { ...item, text } : item)); }}
          onKeyDown={event => { if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') { event.preventDefault(); submit(); } }}
          placeholder={index === 0 ? placeholder : 'Add a note below…'} className="block w-full resize-none bg-transparent px-1 py-2 text-sm text-white outline-none placeholder:text-white/40 disabled:opacity-50" />
          : <div key={index} className="relative">{block.type==='youtube'?<WallYouTube videoId={block.videoId}/>:block.type==='video'?<WallVideo url={block.url}/>:<WallImage src={block.url} />}<button type="button" disabled={locked} aria-label={['youtube','video'].includes(block.type)?'Remove video':'Remove image'} onClick={() => { setBlocks(existing => existing.filter((_, i) => i !== index)); selection.current = { index: 0, start: 0, end: 0 }; }} className="absolute top-2 right-2 rounded-full bg-black/70 p-2 text-white"><X className="h-4 w-4" /></button>{block.giphyId && <p className="mt-1 text-xs text-white/50">Powered By GIPHY</p>}</div>)}
      </div>
      {linkOpen && <div className="flex gap-2 px-3 pb-3"><input aria-label="Picture or GIF link" className="wall-link-input min-w-0 flex-1 rounded-xl border px-3 py-2 text-sm" type="url" value={link} disabled={locked} onChange={event => setLink(event.target.value)} placeholder="https://…" /><button type="button" disabled={locked} onClick={addLink} className="wall-send rounded-full px-3 py-2 text-sm">Add</button><button type="button" onClick={() => setLinkOpen(false)} aria-label="Close image link"><X className="h-4 w-4" /></button></div>}
      {allowYouTube&&videoLinkOpen&&<div className="flex gap-2 px-3 pb-3"><input type="url" aria-label="YouTube video link" value={videoLink} disabled={locked} onChange={event=>setVideoLink(event.target.value)} onKeyDown={event=>{if(event.key==='Enter'){event.preventDefault();addVideo();}}} placeholder="Paste a YouTube link…" className="wall-link-input min-w-0 flex-1 rounded-xl border px-3 py-2 text-sm"/><button type="button" disabled={locked} onClick={addVideo} className="fortune-start rounded-full px-3 py-2 text-sm">Add</button><button type="button" onClick={()=>setVideoLinkOpen(false)} aria-label="Close video link"><X className="h-4 w-4"/></button></div>}
      <div className="flex flex-wrap items-center justify-between gap-1 border-t border-white/10 p-2">
        {wallStyle && <div className="flex flex-wrap gap-1.5"><button type="button" disabled={locked} onClick={()=>fileInput.current?.click()} className="wall-attach"><Plus className="h-3 w-3"/>Photo</button><button type="button" disabled={locked} onClick={()=>setGiphyOpen(true)} className="wall-attach"><Images className="h-3 w-3"/>GIF</button><button type="button" disabled={locked} onClick={()=>setDrawingOpen(true)} className="wall-attach"><Pencil className="h-3 w-3"/>Doodle</button>{allowVideoUpload&&<button type="button" disabled={locked} onClick={()=>videoInput.current?.click()} className="wall-attach"><Video className="h-3 w-3"/>Video</button>}{allowYouTube&&<button type="button" disabled={locked} onClick={()=>setVideoLinkOpen(value=>!value)} aria-expanded={videoLinkOpen} className="wall-attach"><Youtube className="h-3 w-3"/>YouTube</button>}</div>}
        <div className="relative"><button type="button" disabled={locked} aria-label="Add to post" aria-expanded={menuOpen} onClick={() => setMenuOpen(value => !value)} className="rounded-full p-2 text-white/70 hover:bg-white/10 disabled:opacity-40"><Plus className="h-5 w-5" /></button>
          {menuOpen && <div className="absolute bottom-full left-0 z-10 mb-2 w-44 rounded-2xl border border-white/15 bg-[#171020] p-1 shadow-xl" onKeyDown={event => { if (event.key === 'Escape') setMenuOpen(false); }}>
            <button type="button" onClick={() => { setMenuOpen(false); fileInput.current?.click(); }} className="flex w-full items-center gap-2 rounded-xl p-3 text-left text-sm hover:bg-white/10"><ImagePlus className="h-4 w-4" />Pictures</button>
            <button type="button" onClick={() => { setMenuOpen(false); setGiphyOpen(true); }} className="w-full rounded-xl p-3 text-left text-sm hover:bg-white/10">GIF from Giphy</button>
            <button type="button" onClick={() => { setMenuOpen(false); setDrawingOpen(true); }} className="w-full rounded-xl p-3 text-left text-sm hover:bg-white/10">Draw something</button>
            <button type="button" onClick={() => { setMenuOpen(false); setLinkOpen(true); }} className="flex w-full items-center gap-2 rounded-xl p-3 text-left text-sm hover:bg-white/10"><Link className="h-4 w-4" />Image link</button>
          </div>}
        </div>
        <div className="relative mr-auto"><button type="button" disabled={locked} aria-label="Add emoji" aria-expanded={emojiOpen} onClick={() => { setMenuOpen(false); setEmojiOpen(value => !value); }} className="rounded-full p-2 hover:bg-white/10">😊</button>{emojiOpen && <div aria-label="Choose an emoji" className="absolute bottom-full -left-8 z-20 mb-2 grid w-[272px] grid-cols-6 gap-1 rounded-2xl border border-white/15 bg-[#171020] p-2 shadow-xl" onKeyDown={event => { if (event.key === 'Escape') setEmojiOpen(false); }}>{['😏','🔥','👀','😈','😂','😘','🙈','💋','😎','🤔','✨','🌙','🎶','🎉','🍸','🎲','🫣','🤭','😜','🫠','🥂','💅','🤫','🍓'].map(emoji => <button key={emoji} type="button" disabled={locked} aria-label={`Insert ${emoji}`} onPointerDown={event => event.preventDefault()} onClick={() => addEmoji(emoji)} className="flex h-10 w-10 items-center justify-center rounded-lg text-xl hover:bg-white/10">{emoji}</button>)}</div>}</div>
        {reading && <span role="status" className="text-xs text-white/40">Adding pictures…</span>}
        <div className="text-center"><button type="submit" aria-label={submitLabel} title={submitLabel} disabled={locked || !cleanWallDraft(blocks).length} className={`${wallStyle ? 'wall-send' : 'bg-fuchsia-600 hover:bg-fuchsia-500'} rounded-full p-2.5 text-white disabled:opacity-30`}><Send className="h-4 w-4" /></button>{wallStyle&&<p className="mt-1 text-[10px] text-white/40">{blocks.reduce((sum,block)=>sum+(block.type==='text'?block.text.length:0),0)} chars</p>}</div>
      </div>
      <input type="file" multiple ref={fileInput} accept="image/jpeg,image/png,image/webp,image/gif" disabled={locked} onChange={event => readFiles(event.target.files || [])} className="sr-only" />
      {allowVideoUpload&&<input ref={videoInput} type="file" accept="video/mp4,video/webm" disabled={locked} onChange={readVideo} className="sr-only" aria-label="Upload wall video"/>}
    </form>
    {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
    {drawingOpen && <DrawingPad onClose={() => setDrawingOpen(false)} onAdd={url => { addMedia([{ type: 'image', url, mediaKind: 'doodle' }]); setDrawingOpen(false); }} />}
    {giphyOpen && <GiphyPicker onClose={() => setGiphyOpen(false)} onSelect={gif => { addMedia([{ type: 'image', url: gif.imageUrl, giphyId: gif.id, sourceUrl: gif.sourceUrl }]); setGiphyOpen(false); }} />}
  </>;
}
