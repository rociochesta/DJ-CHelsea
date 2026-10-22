import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { LOVOPOLY_TILES as tiles } from '../utils/lovopolyBoard';
import { propertyRent } from '../utils/lovopolyLanding';

export default function LovopolyLanding({ game, landing, onClose, onDeed, act, busy, userId, error }) {
  const dialog=useRef(null);
  useEffect(()=>{const el=dialog.current;el.showModal();return()=>el.close();},[]);
  const visit=landing.visits.at(-1), tile=tiles[visit.tileId];
  const owner=game.owners?.[tile.id];
  const rent=propertyRent(game,tile,(game.lastDice || [0,0]).reduce((a,b)=>a+b,0));
  const canBuy=game.turn===userId && landing.playerId===userId && game.phase==='purchase' && game.status==='playing' && !game.debt;
  return <dialog ref={dialog} className="lovo-dialog lovo-landing" aria-labelledby="lovo-landing-title" onCancel={onClose} onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
    <div className="lovo-detail-header"><div><small>{game.players[landing.playerId]?.name} landed</small><h3 id="lovo-landing-title">{tile.name}</h3></div><button autoFocus type="button" aria-label="Close landing" onClick={onClose}><X size={20}/></button></div>
    {landing.cards?.map((card,index)=><article className={`lovo-drawn-card lovo-card-${card.category}`} key={`${card.id}-${index}`}><small>{card.deck==='chance'?'Love or Disaster':'From Me to You'} · {card.category}</small><h4>{card.title}</h4><p>{card.text}</p>{card.effect==='romance' && <p className="lovo-card-note">Saved to the Romantic Inbox. Your person may accept or decline anytime. No rewards, penalties, or turn restrictions.</p>}</article>)}
    {!!tile.price && <div className="lovo-landing-property"><img src={tile.thumbnail} alt=""/><div><p><strong>Owner:</strong> {owner?game.players[owner]?.name:'Bank · available'}</p><p><strong>Price:</strong> ${tile.price}</p><p><strong>Rent:</strong> {owner?`$${rent}${tile.type==='utility'?' for this roll':''}`:tile.type==='utility'?'4× dice (10× with both utilities)':tile.type==='station'?'$25–$200 by stations owned':`$${tile.rent} base`}</p>{game.mortgages?.[tile.id] && <p>Mortgaged · no rent collected</p>}<button className="lovo-button" onClick={()=>onDeed(tile)}>View Deed</button></div></div>}
    <p className="lovo-landing-outcome">{landing.message}</p>
    {game.lastRent?.id===landing.id && <p>{game.lastRent.status==='paid'?'Rent paid automatically':'Rent awaiting payment'}: ${game.lastRent.amount}</p>}
    {error && <p role="alert" className="lovo-error">{error}</p>}
    {canBuy && <div className="lovo-landing-actions"><button className="lovo-button" disabled={busy || game.players[userId].cash<tile.price} onClick={()=>act('buy')}>Buy property · ${tile.price}</button><button className="lovo-button" disabled={busy} onClick={()=>act('pass')}>Pass</button></div>}
    <button className="lovo-button lovo-primary" onClick={onClose}>Continue</button>
  </dialog>;
}
