import {useState} from 'react';
import {escapeChallenge} from '../utils/lovopolyChallenges';

export default function LovopolyEscapeChoices({game,me,act,busy}) {
  const [selected,setSelected]=useState('');
  const blocked=game.turn===me.id && game.phase==='detention-release';
  const choices=(me.detentionChoices || []).map(escapeChallenge).filter(Boolean);
  const progress=game.escapeProgress?.[me.id];
  if(me.romanticReleaseId)return <p>Your gesture was confirmed. Your release is ready.</p>;
  if(me.detentionChallengeId){const item=game.romanticInbox?.[me.detentionChallengeId];return <p>{item?.status==='declined'?'Your person declined this invitation. Use $50, an escape card, or doubles to leave.':'Your escape invitation is in the Romantic Inbox. Submit your response there; your person confirms completion. Keep playing while you wait.'}</p>;}
  return <div className="lovo-escape-choices"><h4>Choose a romantic escape</h4><p>All optional. Pick one of three saved choices; one invitation per detention. Closing or reloading will not change them. Your partner confirms completion to release you immediately, including this turn.</p>
    {progress && <p>Cycle {progress.cycle} · {Object.keys(progress.completed || {}).length}/30 completed by you</p>}
    {!choices.length ? <button className="lovo-button" disabled={busy || blocked} onClick={()=>act('detention-options')}>Show my three challenges</button> : <>
      <fieldset disabled={busy || blocked}><legend>Choose one challenge</legend>{choices.map(c=><label className={`lovo-escape-option ${selected===c.id?'lovo-selected':''}`} key={c.id}><input type="radio" name="escape-challenge" checked={selected===c.id} onChange={()=>setSelected(c.id)}/><span><small>{c.tone==='B'?'Sweet, flirty & playful':'Romantic & spicy'}</small><strong>{c.title}</strong><span>{c.text}</span>{progress?.completed?.[c.id] && <small>Already completed this cycle</small>}</span></label>)}</fieldset>
      <button className="lovo-button lovo-primary" disabled={busy || blocked || !choices.some(c=>c.id===selected)} onClick={()=>act('detention-challenge',{challengeId:selected})}>Send chosen challenge</button>
    </>}
    {blocked && <p>Your third attempt is already complete. Use $50 or a card to move with your saved roll.</p>}
  </div>;
}
