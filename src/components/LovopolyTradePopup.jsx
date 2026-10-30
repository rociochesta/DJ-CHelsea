import {useEffect,useRef} from 'react';
import {Gift, X} from 'lucide-react';
import {LOVOPOLY_TOKENS} from '../utils/lovopolyBoard';
import {describeTradeSide} from '../utils/lovopolyEconomy';
export function TradeOffer({trade,game,me,act,busy,onCounter}) {
 const incoming=trade.to===me.id;
 const gift=!(trade.receive.cash || trade.receive.cards || trade.receive.properties?.length);
 return <article className="lovo-trade-offer"><strong>{incoming?`${game.players[trade.from]?.name} sent you ${gift?'a gift':'an offer'}`:`Offer to ${game.players[trade.to]?.name}`}</strong><p>You receive: {describeTradeSide(incoming?trade.give:trade.receive,game)}<br/>You give: {describeTradeSide(incoming?trade.receive:trade.give,game)}</p><small>{trade.status}</small>{trade.status==='pending' && ['ready','playing'].includes(game.status) && <div className="lovo-property-actions">{incoming?<><button className="lovo-button" disabled={busy} onClick={()=>act('trade-accept',{tradeId:trade.id})}>Accept</button><button className="lovo-button" disabled={busy} onClick={()=>act('trade-decline',{tradeId:trade.id})}>Decline</button><button className="lovo-button" disabled={busy} onClick={()=>onCounter(trade)}>Counteroffer</button></>:<button className="lovo-button" disabled={busy} onClick={()=>act('trade-withdraw',{tradeId:trade.id})}>Withdraw</button>}</div>}</article>;
}
export default function LovopolyTradePopup({offers,game,onClose}) {
 const dialog=useRef(null);
 useEffect(()=>{const el=dialog.current;el.showModal();return()=>el.close();},[]);
 return <dialog ref={dialog} className="lovo-dialog lovo-trade-popup lovo-offer-announcement" aria-label="A surprise for you" onCancel={onClose}>
   <button type="button" className="lovo-announcement-close" aria-label="Close announcement" onClick={onClose}><X size={20}/></button>
   {offers.map(trade=>{
     const gift=!(trade.receive.cash || trade.receive.cards || trade.receive.properties?.length);
     const sender=game.players[trade.from];
     const token=LOVOPOLY_TOKENS.find(item=>item.id===sender?.token);
     return <div className="lovo-announcement-item" key={trade.id}><div className="lovo-notification-icon" aria-hidden="true">{gift?<Gift size={30} strokeWidth={1.6}/>:<img src="/lovopoly/trade-notification.png" alt=""/>}<span/></div><div className="lovo-notification-copy"><small>{gift?'A little surprise':'New trade request'}</small><h3>{sender?.name || 'Your person'} {token && <span className="lovo-notification-token" style={{color:token.color}} aria-label={`${token.name} token`}>{token.symbol}</span>} <span>{gift?'sent you a gift!':'wants to trade!'}</span></h3><p>Waiting for you in the Trade tab.</p></div></div>;
   })}
 </dialog>;
}
