import { useEffect,useRef,useState } from 'react';
import { X,Gift,LockKeyhole } from 'lucide-react';
import { database,ref,onValue,update,push,set,runTransaction } from '../utils/firebase';
import { createReveal,revealSummary,updateRevealGame,canReceiveReveal,revealProgress,revealCells,REVEAL_SYMBOLS,validateRevealReply } from '../utils/revealGame';
import RevealCreator from './RevealCreator';
import RevealContent from './RevealContent';
import RevealVoiceReply from './RevealVoiceReply';
import WallComposer from './WallComposer';
import WallImage from './WallImage';

const button='rounded-xl border border-white/15 px-4 py-2 text-sm hover:bg-white/5 disabled:opacity-40';
export const visibleReveals=(inbox,userId)=>Object.values(inbox || {}).filter(item=>item.senderId===userId || canReceiveReveal(item,userId)).sort((a,b)=>b.createdAt-a.createdAt);
export function RevealMenu({inbox,currentUser,onOpen}) {
  const items=visibleReveals(inbox,currentUser?.id);
  const waiting=items.filter(item=>item.senderId!==currentUser?.id && item.status!=='complete');
  return <details className="rounded-2xl border border-white/10 p-4"><summary className="cursor-pointer font-semibold">Reveal{waiting.length>0&&<span className="ml-2 rounded-full bg-violet-300/15 px-2 py-1 text-xs text-violet-300">{waiting.length} for you</span>}</summary><div className="mt-3 space-y-3"><button type="button" onClick={onOpen} className={`${button} text-violet-200 border-violet-300/30`}>Open Reveal</button>{waiting.slice(0,3).map(item=><p key={item.id} className="text-sm text-violet-300">{item.senderName} left you a Reveal</p>)}<p className="text-xs text-white/45">Leave a picture or a note behind matching cards.</p></div></details>;
}

export default function RevealGame({roomCode,currentUser,roomState,onClose}) {
  const inbox=roomState?.revealInbox;
  const items=visibleReveals(inbox,currentUser?.id);
  const [selectedId,setSelectedId]=useState(()=>sessionStorage.getItem(`reveal-selected:${roomCode}`)||'');
  const [creating,setCreating]=useState(false),[replyTo,setReplyTo]=useState(null);
  const [game,setGame]=useState(null),[asset,setAsset]=useState(null),[replies,setReplies]=useState([]);
  const [loading,setLoading]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
  const lock=useRef(false),alive=useRef(true);
  const selected=items.find(item=>item.id===selectedId);
  const receiving=canReceiveReveal(game,currentUser?.id),sender=game?.senderId===currentUser?.id;
  const complete=game?.status==='complete';
  const people=new Map();
  const collect=person=>{if(person?.id&&person.id!==currentUser?.id)people.set(person.id,{id:person.id,name:person.name || 'Your person'});};
  Object.values(roomState?.participants||{}).forEach(collect);
  Object.values(roomState?.wordGame?.players||{}).forEach(collect);
  Object.values(roomState?.wheelGame?.players||{}).forEach(collect);
  Object.entries(roomState?.questionForUs?.current?.answers||{}).forEach(([id,person])=>collect({...person,id}));
  items.forEach(item=>{collect({id:item.senderId,name:item.senderName});collect({id:item.recipientId,name:item.recipientName});});
  const recipients=[...people.values()];
  const open=id=>{setSelectedId(id);sessionStorage.setItem(`reveal-selected:${roomCode}`,id);setCreating(false);setNotice('');setError('');};
  const create=(recipient=null)=>{setReplyTo(recipient);setCreating(true);setNotice('');setError('');};
  useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
  useEffect(()=>{
    setGame(null);setAsset(null);setReplies([]);setError('');
    if(!selectedId||!selected)return;
    setLoading(true);
    return onValue(ref(database,`reveal-games/${roomCode}/${selectedId}`),snapshot=>{setGame(snapshot.val());setLoading(false);},()=>{setError('Could not open this Reveal. Try again.');setLoading(false);});
  },[roomCode,selectedId,!!selected]);
  useEffect(()=>{
    if(!game || (!receiving&&!sender))return;
    return onValue(ref(database,`reveal-assets/${roomCode}/${selectedId}`),snapshot=>setAsset(snapshot.val()),()=>setError('Could not load the hidden picture. Reopen this Reveal.'));
  },[roomCode,selectedId,game?.id,receiving,sender]);
  useEffect(()=>{
    setReplies([]);if(!complete||(!receiving&&!sender))return;
    return onValue(ref(database,`reveal-replies/${roomCode}/${selectedId}`),snapshot=>setReplies(Object.entries(snapshot.val()||{}).map(([id,value])=>({...value,id})).sort((a,b)=>a.at-b.at)),()=>setError('Could not load the replies.'));
  },[roomCode,selectedId,complete,receiving,sender]);

  const act=async(type,index)=>{
    if(lock.current||!game)return;lock.current=true;setBusy(true);setError('');
    const id=game.id, action={type,index,id:crypto.randomUUID(),user:currentUser,now:Date.now(),expectedRevision:game.revision};
    try{
      const result=await runTransaction(ref(database,`reveal-games/${roomCode}/${id}`),existing=>updateRevealGame(existing,action),{applyLocally:false});
      if(!result.committed)throw Error('Could not save this flip. Try again.');
      // The small inbox index keeps photos out of the room's main subscription.
      const committed=result.snapshot.val();
      if(alive.current)setGame(committed);
      await runTransaction(ref(database,`karaoke-rooms/${roomCode}/revealInbox/${id}`),existing=>existing?.revision>committed.revision?existing:revealSummary(committed),{applyLocally:false});
    }catch(cause){if(alive.current)setError(cause.message || 'Could not save the board. Try again.');}
    finally{lock.current=false;if(alive.current)setBusy(false);}
  };
  useEffect(()=>{
    if(creating||!receiving||!game?.resolveAt||busy||error)return;
    const timer=setTimeout(()=>act('settle'),Math.max(0,game.resolveAt-Date.now())+40);
    return()=>clearTimeout(timer);
  },[creating,receiving,game?.id,game?.revision,game?.resolveAt,busy,error]);

  const send=async({asset:content,difficulty,recipient})=>{
    const id=crypto.randomUUID();
    const created=createReveal({id,user:currentUser,recipient,difficulty,seed:crypto.getRandomValues(new Uint32Array(1))[0],now:Date.now()});
    await update(ref(database),{[`reveal-games/${roomCode}/${id}`]:created,[`reveal-assets/${roomCode}/${id}`]:content,[`karaoke-rooms/${roomCode}/revealInbox/${id}`]:revealSummary(created)});
    setCreating(false);setSelectedId('');sessionStorage.removeItem(`reveal-selected:${roomCode}`);setNotice(`Your Reveal is waiting for ${recipient?.name||'your person'}.`);
  };
  const reply=async blocks=>{
    if(!complete||(!receiving&&!sender))throw Error('Finish uncovering the Reveal first.');
    const cleaned=validateRevealReply(blocks);
    await set(push(ref(database,`reveal-replies/${roomCode}/${game.id}`)),{userId:currentUser.id,name:currentUser.name||'Someone',blocks:cleaned,at:Date.now()});
  };
  const deck=revealCells(game),flipped=Object.values(game?.flipped||{});
  const rows=game?.difficulty==='full'?4:3;

  return <section className="lounge-reveal-panel rounded-2xl border p-4 sm:p-6 space-y-5">
    <div className="flex items-center justify-between gap-3"><div><p className="text-xs uppercase tracking-widest text-white/50">A little mystery. A little mischief.</p><h2 className="mt-1 text-2xl font-semibold">Reveal</h2></div><button type="button" onClick={onClose} aria-label="Close Reveal" className="fortune-start shrink-0 rounded-full p-2"><X className="h-4 w-4"/></button></div>
    {creating?<RevealCreator key={replyTo?.id||'new'} recipients={recipients} initialRecipient={replyTo} onSend={send} onCancel={()=>setCreating(false)}/>:<>
      <div className="flex flex-wrap gap-2"><button type="button" onClick={()=>create()} className={`${button} inline-flex items-center gap-2 text-violet-200 border-violet-300/30`}><Gift className="h-4 w-4"/>Leave a Reveal{recipients.length===1?` for ${recipients[0].name}`:''}</button>{selectedId&&<button type="button" onClick={()=>open('')} className={button}>All Reveals</button>}</div>
      {notice&&<p role="status" className="text-sm text-violet-300">{notice}</p>}
      {selected&&loading&&<p role="status" className="text-sm text-white/50">Opening your Reveal…</p>}
      {selected&&game&&<>
        <div className="space-y-2"><h3 className="text-xl font-semibold text-violet-300">{sender?`You left a Reveal for ${game.recipientName}`:`${game.senderName} left you a Reveal`}</h3><p className="text-sm text-white/50">{sender?complete?'They uncovered it! You can reply below.':'Your person gets to uncover this. This is your preview.':complete?'Uncovered. Got something to say?':'Flip two cards. Find a match to uncover the picture.'}</p></div>
        <div className="relative isolate overflow-hidden rounded-2xl border border-white/10" style={{aspectRatio:`4 / ${rows}`}}>
          <div className="absolute inset-0"><RevealContent asset={asset}/></div>
          {!sender&&receiving&&<div className="absolute inset-0 grid grid-cols-4" style={{gridTemplateRows:`repeat(${rows},minmax(0,1fr))`}} aria-label="Reveal memory board">
            {deck.map((pair,index)=>{
              const matched=!!game.matched?.[index],up=flipped.includes(index);
              return <button key={index} type="button" disabled={matched||up||busy||!!game.resolveAt||complete||!asset} onClick={()=>act('flip',index)} aria-label={matched?`Card ${index+1}, uncovered`:up?`Card ${index+1}, ${REVEAL_SYMBOLS[pair]}`:`Flip card ${index+1}`} aria-pressed={up} className={`reveal-memory-card flex items-center justify-center border border-[#0B0A0F] text-3xl sm:text-5xl transition duration-500 motion-reduce:transition-none ${matched?'pointer-events-none opacity-0 scale-95':up?'bg-[#1C1728] text-violet-200':'bg-[#13111C] text-violet-300/60 hover:bg-[#251a2b]'} disabled:cursor-default`}>{matched?'':up?REVEAL_SYMBOLS[pair]:<LockKeyhole className="h-5 w-5 sm:h-8 sm:w-8"/>}</button>;
            })}
          </div>}
        </div>
        {!sender&&<div className="flex justify-between gap-3 text-xs text-white/45"><span role="status">{Math.floor(Object.keys(game.matched||{}).length/2)} / {deck.length/2} pairs uncovered</span><span>{game.attempts} tries</span></div>}
        {complete&&<div className="space-y-4 reveal-complete"><div className="flex flex-wrap gap-2"><button type="button" onClick={()=>create({id:sender?game.recipientId:game.senderId,name:sender?game.recipientName:game.senderName})} className={`${button} text-violet-200 border-violet-300/30`}>Send a Reveal Back</button>{['🔥','😏','👀','😈','💋'].map(emoji=><button key={emoji} type="button" disabled={busy} aria-label={`React ${emoji}`} onClick={async()=>{setBusy(true);setError('');try{await reply([{type:'text',text:emoji}]);}catch(cause){setError(cause.message);}finally{setBusy(false);}}} className="rounded-xl border border-white/15 px-3 py-2 text-xl disabled:opacity-40">{emoji}</button>)}</div><WallComposer key={game.id} onPost={reply} disabled={busy} placeholder="Leave a reaction to this Reveal…" submitLabel="Send Reveal reply"/><RevealVoiceReply key={`voice-${game.id}`} onSend={reply}/><div className="space-y-3">{replies.map(item=><article key={item.id} className="rounded-2xl border border-white/10 bg-black/20 p-4 space-y-2"><p className="text-xs font-semibold text-violet-200/70">{item.name}</p>{Object.values(item.blocks||{}).map((block,i)=>block.type==='text'?<p key={i} className="whitespace-pre-wrap break-words text-sm text-white/85">{block.text}</p>:block.type==='audio'?<audio key={i} controls src={block.url} className="w-full"/>:<div key={i}><WallImage src={block.url}/>{block.giphyId&&<a href={block.sourceUrl||'https://giphy.com/'} target="_blank" rel="noopener noreferrer" className="text-xs text-white/40">Powered By GIPHY</a>}</div>)}</article>)}</div></div>}
      </>}
      {(!selected||!selectedId)&&<div className="space-y-3">{!items.length&&<p className="py-5 text-center text-sm text-white/45">Hide something worth finding.</p>}{items.map(item=><button key={item.id} type="button" onClick={()=>open(item.id)} className="w-full rounded-2xl border border-white/10 bg-black/15 p-4 text-left hover:border-violet-300/30"><p className="font-semibold text-violet-300">{item.senderId===currentUser?.id?`You left a Reveal for ${item.recipientName}`:`${item.senderName} left you a Reveal`}</p><p className="mt-1 text-xs text-white/45">{item.difficulty==='full'?'Full Experience · 8 pairs':'Quick Tease · 6 pairs'} · {item.status==='complete'?'Uncovered':item.senderId===currentUser?.id?'Waiting for them':item.status==='playing'?`${Math.round(item.progress*100)}% uncovered · Continue`:'Open your Reveal'}</p></button>)}</div>}
    </>}
    {error&&<div role="alert" className="space-y-2 text-sm text-red-300"><p>{error}</p>{game?.resolveAt&&<button type="button" disabled={busy} onClick={()=>act('settle')} className={button}>Continue flipping</button>}</div>}
  </section>;
}
