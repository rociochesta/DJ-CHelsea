import React from 'react';
import { questions } from './literature';

export default function LiteratureChallenge({ challenge:c, userId, busy, onAction }) {
  const question=questions.find(q=>q.id===c.questionId);
  const mine=c.playerId===userId;
  const pending=['offered','accepted'].includes(c.status);
  const send=(type,extra={})=>onAction(type,{challengeId:c.id,...extra});
  const outcome=amount=>amount<0?`Receive $${-amount}`:c.kind==='purchase'?`Buy for $${amount}`:`Pay $${amount}`;
  return <article className="na-literature" aria-label="NA Literature Challenge">
    <h4>NA Literature Challenge</h4>
    <p>{c.kind==='own'?'Your own property · no normal payment':`${c.kind==='purchase'?'Purchase price':'Rent due'} before challenge: $${c.baseAmount}`}</p>
    <dl><div><dt>Correct</dt><dd>{outcome(c.correctAmount)}{c.kind!=='own'?` (${c.discount}% off)`:''}</dd></div><div><dt>Incorrect</dt><dd>{outcome(c.incorrectAmount)}{c.kind!=='own'?' (+10%)':''}</dd></div><div><dt>Skip</dt><dd>{c.kind==='own'?'No reward or payment':outcome(c.skipAmount)} · no penalty</dd></div></dl>
    {pending&&!mine?<p>Waiting for the landing player to answer or skip.</p>:c.status==='offered'?<div className="na-controls"><button className="na-landing-primary" disabled={busy} onClick={()=>send('literature-accept')}>Accept challenge</button><button disabled={busy} onClick={()=>send('literature-skip')}>Skip · normal price</button></div>:c.status==='accepted'?<div className="na-literature-question"><p><strong>{question.question}</strong></p>{question.options.map((option,index)=><button key={index} disabled={busy} onClick={()=>send('literature-answer',{answerIndex:index})}>{option}</button>)}<button disabled={busy} onClick={()=>send('literature-skip')}>Skip · no penalty</button></div>:<div role="status"><strong>{c.status==='correct'?'Correct!':c.status==='incorrect'?'Incorrect answer.':'Challenge skipped.'}</strong><p>{outcome(c.amount)}{c.kind==='purchase'?' if you choose to buy.':'.'}</p>{c.status!=='skipped'&&<><p>{question.explanation}</p>{question.source&&<a href={question.source} target="_blank" rel="noreferrer">Read the NA source</a>}</>}</div>}
    <small>Only answered questions count as used. Skipped questions return to your remaining deck.</small>
  </article>;
}
