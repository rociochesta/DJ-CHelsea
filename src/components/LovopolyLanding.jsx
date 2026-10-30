import {useEffect,useRef} from 'react';
import {X} from 'lucide-react';
import {getLovopolyTiles} from '../utils/lovopolyCatalog';
import {propertyRent} from '../utils/lovopolyLanding';
import LovopolyArtwork from './LovopolyArtwork';
export default function LovopolyLanding({game,landing,exploreTile,onClose,onDeed,act,busy,userId,error}){
 const dialog=useRef(null);useEffect(()=>{
  const el=dialog.current;el.showModal();
  const board=document.querySelector('.lovo-board-center');
  const position=()=>{
   if(!board || window.innerWidth<700){el.removeAttribute('style');return;}
   const rect=board.getBoundingClientRect();
   const width=Math.min(rect.width,window.innerWidth-24);
   const height=Math.min(rect.height,window.innerHeight-24);
   Object.assign(el.style,{margin:'0',left:`${Math.max(12,Math.min(rect.left,window.innerWidth-width-12))}px`,top:`${Math.max(12,Math.min(rect.top,window.innerHeight-height-12))}px`,width:`${width}px`,height:`${height}px`,maxHeight:`${height}px`});
  };
  position();window.addEventListener('resize',position);window.addEventListener('scroll',position,true);
  return()=>{el.close();window.removeEventListener('resize',position);window.removeEventListener('scroll',position,true);};
 },[]);
 const tile=exploreTile || getLovopolyTiles(game)[landing.visits.at(-1).tileId];
 const owner=game.owners?.[tile.id];
 const total=(landing?.dice || game.lastDice || [0,0]).reduce((a,b)=>a+b,0);
 const rent=propertyRent(game,tile,total);
 const canBuy=!exploreTile && game.turn===userId && landing.playerId===userId && game.lastLanding?.id===landing.id && game.phase==='purchase' && game.status==='playing' && !game.debt;
 return <dialog ref={dialog} className="lovo-dialog lovo-landing lovo-landing-showcase" aria-labelledby="lovo-landing-title" onCancel={onClose}>
 <button className="lovo-showcase-close" type="button" aria-label="Close landing" onClick={onClose}><X size={20}/></button>
 <div className="lovo-showcase-layout"><LovopolyArtwork key={`${landing?.id || 'explore'}:${tile.placeId}`} tile={tile} animate/>
 <div className="lovo-showcase-info"><small>{exploreTile?'Explore the board':`${game.players[landing.playerId]?.name} landed`}</small><h3 id="lovo-landing-title">{tile.name}</h3><p className="lovo-place-description">{tile.description}</p>
 {landing?.cards?.map((card,index)=><article className={`lovo-drawn-card lovo-card-${card.category}`} key={`${card.id}-${index}`}><h4>{card.title}</h4><p>{card.text}</p></article>)}
 {!!tile.price && <><dl className="lovo-place-facts"><div><dt>Owner</dt><dd>{owner?game.players[owner]?.name:'Bank · available'}</dd></div><div><dt>Price</dt><dd>${tile.price}</dd></div><div><dt>Rent</dt><dd>{owner?`$${rent}`:tile.type==='utility'?'4× dice':tile.type==='station'?'$25 base':`$${tile.rent} base`}{game.mortgages?.[tile.id]?' · mortgaged':''}</dd></div></dl><button className="lovo-text-button" onClick={()=>onDeed(tile)}>View Deed</button></>}
 {!tile.price && landing && <p>{landing.message}</p>}{error && <p className="lovo-error" role="alert">{error}</p>}
 <div className="lovo-showcase-actions">{!exploreTile && game.reroll?.playerId===userId && game.reroll.revision===game.revision && <button className="lovo-button" disabled={busy || (game.players[userId].hearts || 0)<2} onClick={()=>act('heart-reroll')}>Reroll · 2 ❤️</button>}{canBuy?<><button className="lovo-button lovo-primary" disabled={busy || game.players[userId].cash<tile.price} onClick={()=>act('buy')}>Buy property · ${tile.price}</button><button className="lovo-button" disabled={busy} onClick={async()=>{if(await act('pass'))onClose();}}>Pass</button></>:<button className="lovo-button" onClick={onClose}>Continue</button>}</div>
 </div></div></dialog>;
}
