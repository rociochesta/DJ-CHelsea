import {useEffect,useRef} from 'react';
import {updateLovopoly} from '../utils/lovopoly';
import {LOVOPOLY_TILES as tiles, LOVOPOLY_GROUPS} from '../utils/lovopolyBoard';
import {propertyRent} from '../utils/lovopolyLanding';
const money=value=>`${value<0?'−':''}$${Math.abs(value).toLocaleString('en-US')}`;
function TradeSide({title,side}) {
 return <section className="lovo-confirm-side"><h4>{title}</h4><p>Cash: <strong>{money(side.cash)}</strong></p><p>Cards: <strong>{side.cards} {side.cards===1?'card':'cards'}</strong></p><div className="lovo-confirm-deeds">{(side.properties || []).map(id=><span key={id}><i style={{background:LOVOPOLY_GROUPS[tiles[id]?.group]?.color || '#bda9b8'}}/>{tiles[id]?.name || 'Property'}</span>)}</div></section>;
}
export default function LovopolyConfirm({game,user,request,onConfirm,onClose,busy,error}){
 const dialog=useRef();useEffect(()=>{const el=dialog.current;el.showModal();return()=>el.close();},[]);
 let next,invalid='';try{next=updateLovopoly(game,{...request.extra,type:request.type,user,id:'preview-action',now:Date.now(),expectedGameId:game.id,expectedRevision:game.revision});if(request.type==='trade-offer'){const partner=Object.values(game.players).find(p=>p.id!==user.id);next=updateLovopoly(next,{type:'trade-accept',tradeId:'preview-action',user:partner,id:'preview-accept',now:Date.now(),expectedGameId:next.id,expectedRevision:next.revision});}}catch(e){invalid=e.message;}
 const sending=request.type==='trade-offer';
 const trade=sending?request.extra:game.trades?.[request.extra.tradeId];
 const total=(game.lastDice||[1,1]).reduce((a,b)=>a+b,0);
 if(trade && ['trade-offer','trade-accept'].includes(request.type)){
   const give=sending?trade.give:trade.receive,receive=sending?trade.receive:trade.give;
   const before=game.players[user.id].cash,after=next?.players[user.id]?.cash ?? before,change=after-before;
   const income=(state,tile)=>state.owners?.[tile.id]===user.id?propertyRent(state,tile,total):0;
   const affected=invalid?[]:tiles.filter(tile=>tile.price && ((give.properties || []).includes(tile.id) || (receive.properties || []).includes(tile.id) || income(game,tile)!==income(next,tile)));
   return <dialog ref={dialog} className="lovo-dialog lovo-trade-confirm" aria-labelledby="lovo-confirm-title" onCancel={onClose}>
     <header className="lovo-confirm-heading"><div><h3 id="lovo-confirm-title">{sending?request.extra.counterTradeId?'Confirm counteroffer':'Confirm trade offer':'Accept trade'}</h3><p>{sending?'Nothing transfers until your partner accepts.':'This transfers the agreed items immediately.'}</p></div><span>{sending?'Partner acceptance required':'Ready to accept'}</span></header>
     {invalid?<p className="lovo-error" role="alert">{invalid}</p>:<>
       <dl className="lovo-confirm-balances"><div><dt>Your cash now</dt><dd>{money(before)}</dd></div><div><dt>{sending?'After acceptance':'After trade'}</dt><dd>{money(after)}</dd></div><div><dt>Change</dt><dd className={change>0?'lovo-confirm-gain':''}>{change>0?'+':''}{money(change)}</dd></div></dl>
       <div className="lovo-confirm-sides"><TradeSide title="You give" side={give}/><TradeSide title="You receive" side={receive}/></div>
       {affected.length>0 && <div className="lovo-confirm-table"><table><caption>Your rental income per landing</caption><thead><tr><th scope="col">Property</th><th scope="col">Before</th><th scope="col">After</th></tr></thead><tbody>{affected.map(tile=><tr key={tile.id}><th scope="row">{tile.name}</th><td>{money(income(game,tile))}</td><td className={income(next,tile)>income(game,tile)?'lovo-confirm-gain':''}>{money(income(next,tile))}</td></tr>)}</tbody></table>{affected.some(tile=>tile.type==='utility') && <p>Utility estimates use a dice total of {total}{game.lastDice?' (last roll)':' (before the first roll)'}.</p>}</div>}
     </>}
     {error && <p role="alert" className="lovo-error">{error}</p>}
     <footer className="lovo-confirm-footer"><button className="lovo-button" disabled={busy} onClick={onClose}>Cancel</button><button className="lovo-button lovo-primary" disabled={busy||!!invalid} onClick={onConfirm}>{sending?request.extra.counterTradeId?'Send counteroffer':'Send offer':'Accept trade'}</button></footer>
   </dialog>;
 }
 if(request.type==='buy') {
   const tile=tiles[game.players[user.id].position];
   const before=game.players[user.id].cash,after=next?.players[user.id]?.cash ?? before;
   const affected=invalid?[]:tiles.filter(t=>t.price && (t.id===tile.id || propertyRent(game,t,total)!==propertyRent(next,t,total)));
   return <dialog ref={dialog} className="lovo-dialog lovo-trade-confirm" aria-labelledby="lovo-buy-title" onCancel={onClose}>
     <header className="lovo-confirm-heading"><div><h3 id="lovo-buy-title">Buy property</h3><p className="lovo-buy-name"><i style={{background:LOVOPOLY_GROUPS[tile.group]?.color || '#c7a7ba'}}/>{tile.name}</p></div><span className="lovo-buy-price">{money(tile.price)}</span></header>
     {invalid?<p role="alert" className="lovo-error">{invalid}</p>:<>
       <dl className="lovo-confirm-balances"><div><dt>Cash now</dt><dd>{money(before)}</dd></div><div><dt>After purchase</dt><dd>{money(after)}</dd></div><div><dt>Cost</dt><dd>−{money(tile.price)}</dd></div></dl>
       <div className="lovo-confirm-table"><table><caption>Rent per landing</caption><thead><tr><th scope="col">Property</th><th scope="col">Before</th><th scope="col">After</th></tr></thead><tbody>{affected.map(t=><tr key={t.id}><th scope="row">{t.name}</th><td>{money(propertyRent(game,t,total))}</td><td className="lovo-confirm-gain">{money(propertyRent(next,t,total))}</td></tr>)}</tbody></table>{affected.some(t=>t.type==='utility') && <p>Utility estimate · dice total {total}.</p>}</div>
     </>}
     {error && <p role="alert" className="lovo-error">{error}</p>}
     <footer className="lovo-confirm-footer"><button className="lovo-button" disabled={busy} onClick={onClose}>Cancel</button><button className="lovo-button lovo-primary" disabled={busy||!!invalid} onClick={onConfirm}>Buy · {money(tile.price)}</button></footer>
   </dialog>;
 }
 const tile=tiles[request.extra.tileId];
 const before=game.players[user.id].cash,after=next?.players[user.id]?.cash ?? before,change=after-before;
 const label=({'build':'Build','sell-building':'Sell building','mortgage':'Mortgage','unmortgage':'Unmortgage'})[request.type] || 'Confirm';
 const levelName=level=>level===5?'Love Castle':level===0?'No buildings':`${level} Love Nest${level===1?'':'s'}`;
 const affected=invalid?[]:tiles.filter(t=>t.price && (t.id===tile?.id || propertyRent(game,t,total)!==propertyRent(next,t,total)));
 return <dialog ref={dialog} className="lovo-dialog lovo-trade-confirm" aria-labelledby="lovo-property-confirm-title" onCancel={onClose}>
   <header className="lovo-confirm-heading"><div><h3 id="lovo-property-confirm-title">{label==='Build'?(next?.buildings?.[tile?.id]===5?'Build Love Castle':'Build Love Nest'):label}</h3><p className="lovo-buy-name"><i style={{background:LOVOPOLY_GROUPS[tile?.group]?.color || '#c7a7ba'}}/>{tile?.name}</p></div>{!invalid && <span className="lovo-buy-price">{change>0?'+':''}{money(change)}</span>}</header>
   {invalid?<p className="lovo-error" role="alert">{invalid}</p>:<>
     <dl className="lovo-confirm-balances"><div><dt>Cash now</dt><dd>{money(before)}</dd></div><div><dt>After {request.type==='build'?'building':'action'}</dt><dd>{money(after)}</dd></div><div><dt>{change>0?'You receive':'Cost'}</dt><dd className={change>0?'lovo-confirm-gain':''}>{change>0?'+':''}{money(change)}</dd></div></dl>
     {['build','sell-building'].includes(request.type) && <div className="lovo-building-change"><span>{levelName(game.buildings?.[tile.id] || 0)}</span><span aria-hidden="true">→</span><strong>{levelName(next.buildings?.[tile.id] || 0)}</strong></div>}
     <div className="lovo-confirm-table"><table><caption>Rent per landing</caption><thead><tr><th scope="col">Property</th><th scope="col">Before</th><th scope="col">After</th></tr></thead><tbody>{affected.map(t=><tr key={t.id}><th scope="row">{t.name}</th><td>{money(propertyRent(game,t,total))}</td><td className={propertyRent(next,t,total)>propertyRent(game,t,total)?'lovo-confirm-gain':''}>{money(propertyRent(next,t,total))}</td></tr>)}</tbody></table>{affected.some(t=>t.type==='utility') && <p>Utility estimate · dice total {total}.</p>}</div>
   </>}
   {error && <p role="alert" className="lovo-error">{error}</p>}
   <footer className="lovo-confirm-footer"><button className="lovo-button" disabled={busy} onClick={onClose}>Cancel</button><button className="lovo-button lovo-primary" disabled={busy||!!invalid} onClick={onConfirm}>{label}{!invalid?` · ${money(Math.abs(change))}`:''}</button></footer>
 </dialog>;
}
