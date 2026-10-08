import { useRef,useState } from 'react';
import { Camera,ImagePlus } from 'lucide-react';
import RevealContent from './RevealContent';
import { REVEAL_STYLES,REVEAL_FONTS,validateRevealAsset } from '../utils/revealGame';
import { readRevealPhoto } from '../utils/revealPhoto';

const button = 'rounded-xl border border-white/15 px-4 py-2 text-sm hover:bg-white/5 disabled:opacity-40';
export default function RevealCreator({ recipients,initialRecipient,onSend,onCancel }) {
  const [type,setType] = useState('photo');
  const [photo,setPhoto] = useState('');
  const [text,setText] = useState('');
  const [style,setStyle] = useState('rose');
  const [font,setFont] = useState('simple');
  const [difficulty,setDifficulty] = useState('quick');
  const [recipientId,setRecipientId] = useState(initialRecipient?.id || recipients[0]?.id || '');
  const [busy,setBusy] = useState(false),[reading,setReading] = useState(false),[error,setError] = useState('');
  const gallery = useRef(null),camera = useRef(null),lock = useRef(false);
  const known = initialRecipient ? [initialRecipient,...recipients.filter(person => person.id !== initialRecipient.id)] : recipients;
  const recipient = known.find(person => person.id === recipientId);
  const asset = type === 'photo' ? {type,url:photo} : {type,text,style,font};
  const locked = busy || reading;
  const upload = async event => {
    const file = event.target.files?.[0]; if (!file) return;
    setReading(true);setError('');
    try { setPhoto(await readRevealPhoto(file)); } catch (cause) {setError(cause.message);} finally {setReading(false);event.target.value='';}
  };
  const send = async event => {
    event.preventDefault();if(lock.current || locked)return;lock.current=true;setBusy(true);setError('');
    try { await onSend({asset:validateRevealAsset(asset),difficulty,recipient}); }
    catch(cause){setError(cause.message || 'Could not send. Your Reveal is still here.');}
    finally{lock.current=false;setBusy(false);}
  };
  return <form onSubmit={send} className="space-y-5">
    <div className="flex flex-wrap justify-between items-center gap-3"><h3 className="text-xl font-semibold text-violet-300">Leave a Reveal{recipient ? ` for ${recipient.name}` : ' for your person'}</h3><button type="button" disabled={locked} onClick={onCancel} className={button}>Cancel</button></div>
    {known.length > 0 && <label className="block text-sm text-white/65">For<select value={recipientId} disabled={locked} onChange={event=>setRecipientId(event.target.value)} className="mt-2 block w-full rounded-xl border border-white/15 bg-[#11111b] px-3 py-2"><option value="">Your person</option>{known.map(person=><option key={person.id} value={person.id}>{person.name}</option>)}</select></label>}
    <div className="flex gap-2"><button type="button" disabled={locked} aria-pressed={type==='photo'} onClick={()=>setType('photo')} className={`${button} ${type==='photo'?'border-violet-300/40 bg-violet-300/10 text-violet-200':''}`}>Photo</button><button type="button" disabled={locked} aria-pressed={type==='text'} onClick={()=>setType('text')} className={`${button} ${type==='text'?'border-violet-300/40 bg-violet-300/10 text-violet-200':''}`}>Text graphic</button></div>
    {type==='photo'?<div className="space-y-3"><div className="flex flex-wrap gap-2"><button type="button" disabled={locked} onClick={()=>gallery.current?.click()} className={`${button} inline-flex items-center gap-2`}><ImagePlus className="h-4 w-4"/>Choose photo</button><button type="button" disabled={locked} onClick={()=>camera.current?.click()} className={`${button} inline-flex items-center gap-2`}><Camera className="h-4 w-4"/>Take a photo</button></div><input ref={gallery} type="file" accept="image/jpeg,image/png,image/webp" onChange={upload} className="sr-only" disabled={locked}/><input ref={camera} type="file" accept="image/jpeg,image/png,image/webp" capture="user" onChange={upload} className="sr-only" disabled={locked}/>{reading&&<p role="status" className="text-sm text-white/50">Preparing your photo…</p>}</div>:<div className="space-y-4"><label className="block text-sm text-white/65">Your hidden note<textarea value={text} maxLength={700} rows={4} disabled={locked} onChange={event=>setText(event.target.value)} placeholder="A confession, a question, a little something just for them…" className="mt-2 block w-full rounded-2xl border border-white/15 bg-black/20 p-3 text-white outline-none focus:border-violet-300/40"/></label><div className="flex flex-wrap gap-2">{REVEAL_STYLES.map(item=><button type="button" key={item.id} disabled={locked} aria-pressed={style===item.id} onClick={()=>setStyle(item.id)} className={`rounded-xl border px-4 py-2 text-sm ${style===item.id?'border-violet-300':'border-white/15'}`} style={{background:item.background,color:item.color}}>{item.name}</button>)}</div><label className="block text-sm text-white/65">Type<select value={font} disabled={locked} onChange={event=>setFont(event.target.value)} className="mt-2 block w-full rounded-xl border border-white/15 bg-[#11111b] px-3 py-2">{REVEAL_FONTS.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label></div>}
    {(type==='photo'?photo:text.trim())&&<div><p className="mb-2 text-xs text-white/40">Only you see this preview before sending.</p><div className="aspect-square max-h-[500px] overflow-hidden rounded-2xl border border-white/10"><RevealContent asset={asset}/></div></div>}
    <fieldset disabled={locked} className="space-y-3"><legend className="mb-2 text-sm text-white/65">Choose the grid</legend><div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{[{id:'quick',name:'Quick Tease',detail:'3 × 4 · 6 matching pairs'},{id:'full',name:'Full Experience',detail:'4 × 4 · 8 matching pairs'}].map(item=><label key={item.id} className={`cursor-pointer rounded-2xl border p-4 ${difficulty===item.id?'border-violet-300/40 bg-violet-300/5':'border-white/10'}`}><span className="flex items-center gap-2"><input type="radio" name="reveal-difficulty" checked={difficulty===item.id} onChange={()=>setDifficulty(item.id)} className="accent-violet-400"/><span className="font-semibold">{item.name}</span></span><span className="mt-1 block text-xs text-white/50">{item.detail}</span></label>)}</div></fieldset>
    {error&&<p role="alert" className="text-sm text-red-300">{error}</p>}
    <button type="submit" disabled={locked || !(type==='photo'?photo:text.trim())} className={`${button} border-violet-300/40 bg-violet-300/10 text-violet-200`}>{busy?'Leaving your Reveal…':`Leave a Reveal${recipient?` for ${recipient.name}`:''}`}</button>
  </form>;
}
