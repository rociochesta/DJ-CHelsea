import WallComposer from './WallComposer';
import WallImage from './WallImage';
import { useState, useEffect, useRef } from 'react';
import { romancePending } from '../utils/lovopolyRomance';
import { REACTIONS, unreadActivity } from '../utils/lovopolyInbox';

function Message({message:m,item,userId,act,busy,name}) {
  const [editing,setEditing]=useState(false),[text,setText]=useState(m.text || '');
  const run=(type,extra={})=>act(type,{invitationId:item.id,messageId:m.id,...extra});
  return <div className={`lovo-message ${m.userId===userId?'lovo-message-own':''}`}>
    <small>{name || 'Your person'} · {new Date(m.at).toLocaleString()} {m.editedAt && '· Edited'} {m.userId===userId && item.activity?.[m.id]?.seq<= (item.readBy?.[item.to===userId?item.from:item.to] || 0) && '· Seen'}</small>
    {m.deletedAt?<p><i>Message deleted</i></p>:<>
      {editing?<div><textarea aria-label="Edit message" value={text} maxLength={2000} onChange={e=>setText(e.target.value)}/><button disabled={busy} onClick={async()=>{if(await run('romance-edit',{text}))setEditing(false);}}>Save edit</button><button onClick={()=>setEditing(false)}>Cancel edit</button></div>:<p>{m.text}</p>}
      {m.blocks?.filter(b=>b.type==='image').map((b,i)=><div key={i}><WallImage src={b.url}/>{b.giphyId && <small>Powered By GIPHY</small>}</div>)}
      {m.media && <img className="lovo-chat-media" src={m.media.url} alt={m.media.type==='gif'?'Shared GIF':'Shared photo'} loading="lazy"/>}
      <div className="lovo-reactions">{REACTIONS.map(emoji=><button key={emoji} disabled={busy} aria-label={`React ${emoji}`} aria-pressed={m.reactions?.[userId]===emoji} onClick={()=>run('romance-react',{emoji})}>{emoji} {Object.values(m.reactions || {}).filter(r=>r===emoji).length || ''}</button>)}</div>
      {m.userId===userId && <div><button disabled={busy} onClick={()=>{setText(m.text || '');setEditing(true);}}>Edit</button><button disabled={busy} onClick={()=>run('romance-delete')}>Delete</button></div>}
    </>}
  </div>;
}
function Conversation({item,game,userId,act,busy,onClose}) {
  const readLock=useRef(false);
  useEffect(()=>{if(busy || readLock.current || !unreadActivity(item,userId))return;readLock.current=true;Promise.resolve(act('romance-read',{invitationId:item.id,seenSeq:item.activitySeq || 1})).finally(()=>{readLock.current=false;});},[item.activitySeq,item.id,userId,busy]);
  const [submitGesture,setSubmitGesture]=useState(false);
  const performer=item.from===userId;
  const canSubmit=performer && ['pending','accepted'].includes(item.status);
  async function post(blocks){
    const saved=await act(canSubmit && submitGesture?'romance-submit':'romance-message',{invitationId:item.id,blocks});
    if(!saved)throw new Error('Message could not be saved.');
  }  return <article className="lovo-drawn-card lovo-card-romantic lovo-chat" aria-label="Romantic conversation">
    <button className="lovo-button" onClick={onClose}>Back to cards</button>
    <div><button disabled={busy} onClick={async()=>{if(await act(item.hiddenBy?.[userId]?'romance-restore':'romance-hide',{invitationId:item.id}))onClose();}}>{item.hiddenBy?.[userId]?'Restore conversation':'Hide for me'}</button>
    {!item.deletionRequest?<details><summary>Delete conversation permanently</summary><p>Both players must agree. All messages and attachments will be removed for both of you.</p><button disabled={busy} onClick={()=>act('romance-delete-request',{invitationId:item.id})}>Request permanent deletion</button></details>:<div><p>Permanent deletion requested. Accepting removes all messages and attachments for both players.</p>{item.deletionRequest.by===userId?<button disabled={busy} onClick={()=>act('romance-delete-withdraw',{invitationId:item.id})}>Withdraw deletion request</button>:<><button disabled={busy} onClick={()=>act('romance-delete-accept',{invitationId:item.id})}>Agree to permanently delete</button><button disabled={busy} onClick={()=>act('romance-delete-decline',{invitationId:item.id})}>Keep conversation</button></>}</div>}</div>
    <header><h4>{item.title}</h4><p>{item.text}</p><strong>{item.status==='submitted'?'Waiting for partner confirmation':item.status==='accepted'?'Accepted · gesture not completed yet':item.status}</strong></header>
    {!!unreadActivity(item,userId) && <button disabled={busy} onClick={()=>act('romance-read',{invitationId:item.id,seenSeq:item.activitySeq || 1})}>Mark new activity as read</button>}
    <div className="lovo-conversation">{Object.values(item.messages||{}).sort((a,b)=>a.at-b.at).map(m=><Message key={m.id} message={m} item={item} userId={userId} act={act} busy={busy} name={game.players[m.userId]?.name}/>)}</div>
    {!performer && item.status==='pending' && <button className="lovo-button" disabled={busy} onClick={()=>act('romance-respond',{invitationId:item.id,response:'accepted'})}>Accept invitation</button>}
    {!performer && item.status==='submitted' && <button className="lovo-button" disabled={busy} onClick={()=>act('romance-confirm',{invitationId:item.id})}>Confirm completion</button>}
    {!performer && romancePending(item) && <button className="lovo-button" disabled={busy} onClick={()=>act('romance-respond',{invitationId:item.id,response:'declined'})}>Decline invitation</button>}
    {canSubmit && <label className="lovo-submit-choice"><input type="checkbox" checked={submitGesture} onChange={e=>setSubmitGesture(e.target.checked)} disabled={busy}/> Submit gesture for partner confirmation</label>}
    <WallComposer onPost={post} disabled={busy} placeholder="Your message or response" submitLabel={canSubmit && submitGesture?'Submit gesture for confirmation':'Send message'} wallStyle />    {canSubmit && <p>Sending a message does not complete the gesture. Submit it when ready; your person confirms.</p>}
  </article>;
}
export default function LovopolyInbox({game,userId,act,busy}) {
  const [tab,setTab]=useState('pending'),[selected,setSelected]=useState(null),[dismissed,setDismissed]=useState(null);
  const all=Object.values(game?.romanticInbox || {}).filter(i=>[i.from,i.to].includes(userId)).sort((a,b)=>b.at-a.at);
  const active=all.filter(i=>!i.hiddenBy?.[userId]);
  const pending=active.filter(romancePending),unread=active.reduce((n,i)=>n+unreadActivity(i,userId),0);
  const visible=tab==='hidden'?all.filter(i=>i.hiddenBy?.[userId]):tab==='pending'?pending:active.filter(i=>!romancePending(i));
  const item=all.find(i=>i.id===selected);
  const turnKey=`${game?.id}:${game?.completedTurns}:${game?.turn}`;
  const needsReply=pending.filter(i=>i.to===userId && ['pending','submitted'].includes(i.status));
  if(!game?.players?.[userId])return null;
  async function open(i){setSelected(i.id);if(unreadActivity(i,userId))await act('romance-read',{invitationId:i.id,seenSeq:i.activitySeq || 1});}
  return <section className="lovo-inbox" aria-label="Romantic Inbox"><h3>Romantic Inbox <span aria-label="Unread romantic activity">{unread} unread</span></h3>
    <p>Optional gestures. No deadlines or penalties. Your conversations stay with you across matches.</p>
    {game.turn===userId && ['ready','playing'].includes(game.status) && needsReply.length>0 && dismissed!==turnKey && <div className="lovo-romance-reminder" role="status">A little love is waiting: {needsReply.length} invitation(s) to answer or confirm. You can keep playing.<button onClick={()=>setDismissed(turnKey)}>Dismiss reminder</button></div>}
    <div className="lovo-inbox-tabs"><button className="lovo-button" aria-pressed={tab==='pending'} onClick={()=>{setTab('pending');setSelected(null);}}>Pending ({pending.length})</button><button className="lovo-button" aria-pressed={tab==='history'} onClick={()=>{setTab('history');setSelected(null);}}>History</button><button className="lovo-button" onClick={()=>{setTab('hidden');setSelected(null);}}>Hidden</button></div>
    {item?<Conversation key={`${userId}:${item.id}`} item={item} game={game} userId={userId} act={act} busy={busy} onClose={()=>setSelected(null)}/>:<div className="lovo-romance-grid">{visible.map(i=><button className="lovo-romance-preview" key={i.id} disabled={busy} onClick={()=>open(i)}><svg viewBox="0 0 120 70" aria-hidden="true"><rect x="14" y="15" width="92" height="48" rx="8" fill="#ffe1ec"/><path d="M15 18 L60 48 L105 18" fill="none" stroke="#c72b6a" strokeWidth="3"/><path d="M60 34 C35 18 46 4 60 16 C74 4 85 18 60 34" fill="#e63277"/></svg><strong>{i.title}</strong><span>{i.status} · {new Date(i.at).toLocaleDateString()}</span>{unreadActivity(i,userId)>0 && <b>{unreadActivity(i,userId)} unread</b>}</button>)}</div>}
    {!item && !visible.length && <p>{tab==='pending'?'No pending invitations.':'No completed or declined gestures yet.'}</p>}
  </section>;
}


