import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { tiles } from './catalog';
import { purchasePrice } from './literature';
import LiteratureChallenge from './LiteratureChallenge';

function Artwork({ art, animation, name }) {
  // Optional pre-rendered SVG/GIF/WebP animations; the static artwork is the fallback.
  const [failed, setFailed] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  useEffect(() => { const media=window.matchMedia('(prefers-reduced-motion: reduce)'); const change=()=>setReduceMotion(media.matches); media.addEventListener('change',change); return ()=>media.removeEventListener('change',change); }, []);
  const src=!reduceMotion&&!failed&&animation?.src?animation.src:art;
  return src ? <img className="na-landing-art" src={src} alt={name} onError={()=>setFailed(true)} /> : null;
}

export default function TilePopup({ tileId, landing, game, userId, busy, error, onAction, onClose }) {
  const [step,setStep]=useState(0);
  const [mobile,setMobile]=useState(()=>window.matchMedia('(max-width:900px)').matches);
  useEffect(()=>{const media=window.matchMedia('(max-width:900px)');const change=()=>setMobile(media.matches);media.addEventListener('change',change);return()=>media.removeEventListener('change',change);},[]);
  const panel=useRef(null);
  const visits=landing?.visits||[];
  const visit=visits[step];
  const tile=tiles[visit?.tileId??tileId];
  const player=game?.players?.[landing?.playerId];
  const me=game?.players?.[userId];
  const ownTurn=game?.status==='playing'&&game.turn===userId&&!me?.eliminated;
  const lastStep=!landing||step===visits.length-1;
  const canBuy=ownTurn&&game.phase==='purchase'&&me.position===tile.id&&lastStep&&!game.debt;
  const price=purchasePrice(game,tile);
  const challenge=game?.literatureChallenge?.tileId===tile.id&&game.literatureChallenge.id===game.lastLanding?.id&&game.turn===game.literatureChallenge.playerId?game.literatureChallenge:null;
  const owner=game?.players?.[game?.owners?.[tile.id]];
  const cards=(landing?.cards||[]).filter(card=>card.visitIndex===step);
  useEffect(()=>{
    const previous=document.activeElement;
    panel.current?.focus({preventScroll:true});
    panel.current?.scrollIntoView({block:'center',inline:'center',behavior:'smooth'});
    return ()=>{if(previous?.isConnected)previous.focus({preventScroll:true});};
  },[]);
  async function action(type,extra={}) { if(await onAction(type,extra)) { if(['buy','pass','end-turn','bankrupt'].includes(type))onClose(); } }
  const content=<section className="na-landing" aria-modal={mobile||undefined} role="dialog" aria-label={landing?'Tile landing':'Tile details'} aria-labelledby="na-landing-title" tabIndex={-1} ref={panel} onKeyDown={event=>{if(event.key==='Escape'){event.stopPropagation();onClose();}if(mobile&&event.key==='Tab'){const controls=[...panel.current.querySelectorAll('button:not(:disabled),summary')].filter(el=>el.getClientRects().length);const first=controls[0],last=controls.at(-1);if(event.shiftKey&&(document.activeElement===first||document.activeElement===panel.current)){event.preventDefault();last?.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}}}}>
    <button type="button" className="na-landing-close" onClick={onClose} aria-label="Close tile">×</button>
    <div className="na-landing-picture"><Artwork key={tile.id} art={tile.art} animation={tile.animation} name={tile.name}/></div>
    <div className="na-landing-content">
      <small>{landing?`${player?.name||'Player'} landed`:'Explore the board'}{visits.length>1?` · ${step+1} / ${visits.length}`:''}</small>
      <h3 id="na-landing-title">{tile.name}</h3><p>{tile.text}</p>
      {visit&&<p className="na-landing-result">{visit.message}</p>}
      {cards.map(card=><article className="na-landing-card" key={`${card.deck}:${card.id}`}><small>{card.deck==='chance'?'Chance · Life on Life’s Terms':'Community · The Fellowship'}</small><h4>{card.title}</h4><Artwork art={card.art} animation={card.animation} name={card.title}/><p>{card.text}</p></article>)}
      {tile.price>0&&<dl className="na-landing-stats"><div><dt>Owner</dt><dd>{owner?.name||'Bank · available'}</dd></div><div><dt>Price</dt><dd>${tile.price}</dd></div><div><dt>Rent</dt><dd>{game?.mortgages?.[tile.id]?'Mortgaged · $0':tile.type==='station'?'$25–$200':tile.type==='utility'?'4× or 10× dice':`$${tile.rent} base`}</dd></div></dl>}
      {tile.price>0&&<details><summary>View deed</summary><p>Mortgage: ${tile.price/2}</p>{tile.rents.length>0&&<p>Rent schedule: {tile.rents.map(n=>`$${n}`).join(' / ')}. Build: ${tile.buildingCost} each.</p>}{ownTurn&&owner?.id===userId&&<div className="na-controls"><button disabled={busy} onClick={()=>action(game.mortgages?.[tile.id]?'unmortgage':'mortgage',{tileId:tile.id})}>{game.mortgages?.[tile.id]?'Unmortgage':'Mortgage'}</button>{tile.group&&<><button disabled={busy} onClick={()=>action('build',{tileId:tile.id})}>Build house / hotel</button><button disabled={busy} onClick={()=>action('sell-building',{tileId:tile.id})}>Sell building</button></>}</div>}</details>}
      {challenge&&<LiteratureChallenge challenge={challenge} userId={userId} busy={busy} onAction={onAction}/>}
      {error&&<p role="alert" className="na-error">{error}</p>}
      <div className="na-landing-actions">
        {step>0&&<button disabled={busy} onClick={()=>setStep(step-1)}>Previous</button>}
        {!lastStep?<button disabled={busy} onClick={()=>setStep(step+1)}>Next · {tiles[visits[step+1].tileId].name}</button>:<>
          {canBuy?<><button className="na-landing-primary" disabled={busy||me.cash<price} onClick={()=>action('buy')}>Buy property · ${price}</button><button disabled={busy} onClick={()=>action('pass')}>Pass</button>{me.cash<price&&<p>Not enough cash. Manage your properties or pass.</p>}</>:ownTurn&&game.debt?<><p>Debt: ${game.debt.amount}</p><button disabled={busy||me.cash<game.debt.amount} onClick={()=>action('settle-debt')}>Pay debt</button><button onClick={onClose}>Manage properties</button><button disabled={busy} onClick={()=>action('bankrupt')}>Declare bankruptcy</button></>:landing&&ownTurn&&game.phase==='end'?<button disabled={busy} className="na-landing-primary" onClick={()=>action('end-turn')}>{game.extraRoll?'Continue · roll again':'Continue · end turn'}</button>:<button onClick={onClose}>Continue</button>}
        </>}
      </div>
    </div>
  </section>;
  return mobile?createPortal(<div className="na-monopoly na-landing-portal"><div className="na-landing-backdrop" onClick={onClose}/>{content}</div>,document.body):content;
}
