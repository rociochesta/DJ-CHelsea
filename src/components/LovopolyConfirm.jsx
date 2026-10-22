import {useEffect,useRef} from 'react';
import {updateLovopoly} from '../utils/lovopoly';
import {LOVOPOLY_TILES as tiles} from '../utils/lovopolyBoard';
import {propertyRent} from '../utils/lovopolyLanding';
import {describeTradeSide} from '../utils/lovopolyEconomy';
export default function LovopolyConfirm({game,user,request,onConfirm,onClose,busy,error}){
 const dialog=useRef();useEffect(()=>{dialog.current.showModal();},[]);
 let next,invalid='';try{next=updateLovopoly(game,{...request.extra,type:request.type,user,id:'preview-action',now:Date.now(),expectedGameId:game.id,expectedRevision:game.revision});if(request.type==='trade-offer'){const partner=Object.values(game.players).find(p=>p.id!==user.id);next=updateLovopoly(next,{type:'trade-accept',tradeId:'preview-action',user:partner,id:'preview-accept',now:Date.now(),expectedGameId:next.id,expectedRevision:next.revision});}}catch(e){invalid=e.message;}
 const trade=request.type==='trade-offer'?request.extra:game.trades?.[request.extra.tradeId];
 const total=(game.lastDice||[1,1]).reduce((a,b)=>a+b,0);
 return <dialog ref={dialog} className="lovo-dialog" onCancel={onClose}><h3>Confirm {request.type.replaceAll('-',' ')}</h3><p>Once confirmed, this action cannot be undone.</p>
 {invalid?<p role="alert">{invalid}</p>:<><p>Current balance: ${game.players[user.id].cash}<br/>Balance after completion: ${next.players[user.id].cash}<br/>Change: ${next.players[user.id].cash-game.players[user.id].cash}</p>
 {trade && <><p>Offer gives: {describeTradeSide(trade.give)}<br/>Offer receives: {describeTradeSide(trade.receive)}</p>{request.type==='trade-offer'&&<p>Sending does not transfer anything yet. After acceptance: ${game.players[user.id].cash-trade.give.cash+trade.receive.cash}</p>}</>}
 {tiles.filter(t=>t.price && (propertyRent(game,t,total)!==propertyRent(next,t,total) || t.id===request.extra.tileId || (request.type==='buy'&&t.id===game.players[user.id].position))).map(t=><p key={t.id}>{t.name}: rent ${propertyRent(game,t,total)} → ${propertyRent(next,t,total)}{t.type==='utility'?' (using current dice total)':''}</p>)}</>}
 {error&&<p role="alert">{error}</p>}<button className="lovo-button" disabled={busy||!!invalid} onClick={onConfirm}>Confirm action</button><button className="lovo-button" disabled={busy} onClick={onClose}>Cancel</button></dialog>;
}
