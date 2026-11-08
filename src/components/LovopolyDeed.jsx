import LovopolyToken from './LovopolyToken';
import {getLovopolyTiles,getLovopolyGroups} from '../utils/lovopolyCatalog';
import {useEffect,useRef} from 'react';
import {X, Landmark, Hammer, Coins, Crown} from 'lucide-react';
import {LOVOPOLY_GROUPS, LOVOPOLY_TILES as tiles} from '../utils/lovopolyBoard';
import {propertyRent} from '../utils/lovopolyLanding';
import {economyAction} from '../utils/lovopolyEconomy';

function LoveNest({size}) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><ellipse cx="9" cy="10" rx="3" ry="4"/><ellipse cx="15" cy="10" rx="3" ry="4"/><path d="M3 12c0 6 4 9 9 9s9-3 9-9M4 15l15 3M5 19l15-5M3 12l18 3"/></svg>;
}

export default function LovopolyDeed({tile, game, userId, act, busy, onClose}) {
 const tiles=getLovopolyTiles(game);
 const LOVOPOLY_GROUPS=getLovopolyGroups(game);
  const dialog=useRef(null);
  useEffect(()=>{const element=dialog.current;element.showModal();return ()=>element.close();},[]);
  const ownerId=game?.owners?.[tile.id],owner=game?.players?.[ownerId];
  const level=game?.buildings?.[tile.id] || 0;
  const mortgaged=!!game?.mortgages?.[tile.id];
  const group=LOVOPOLY_GROUPS[tile.group];
  const ownedGroup=tiles.filter(t=>tile.group?t.group===tile.group:t.type===tile.type).filter(t=>game?.owners?.[t.id]===ownerId);
  const complete=!!ownerId && !!tile.group && tiles.filter(t=>t.group===tile.group).every(t=>game?.owners?.[t.id]===ownerId);
  const diceTotal=game?.lastDice?.reduce((a,b)=>a+b,0);
  const utilityMultiplier=ownedGroup.length===2?10:4;
  const rent=propertyRent(game || {},tile,diceTotal || 2);
  const canAct=!!act && !!game?.players?.[userId] && ownerId===userId && ['ready','playing'].includes(game.status);
  const actions=[{type:mortgaged?'unmortgage':'mortgage',label:mortgaged?'Unmortgage':'Mortgage',Icon:Landmark,amount:mortgaged?`−$${Math.ceil(tile.price*.55)}`:`+$${tile.price/2}`},{type:'build',label:'Build',Icon:Hammer,amount:tile.group?`−$${tile.buildingCost}`:''},{type:'sell-building',label:'Sell',Icon:Coins,amount:tile.group?`+$${tile.buildingCost/2}`:''}];
  const reason=type=>{if(!canAct)return ownerId===userId?'This match is not active.':'Only the owner can manage this property.';if(!tile.group && ['build','sell-building'].includes(type))return 'Stations and utilities cannot have buildings.';try{economyAction(structuredClone(game),{type,user:game.players[userId],tileId:tile.id});return '';}catch(error){return error.message;}};
  const rows=tile.group?tile.rents.map((value,index)=>({label:index===0?'Base rent':index===5?'Love Castle':`${index} Love Nest${index===1?'':'s'}`,value:`$${value}`,level:index,current:!!ownerId && level===index})):tile.type==='station'?[1,2,3,4].map(count=>({label:`${count} station${count===1?'':'s'}`,value:`$${25*2**(count-1)}`,current:!!ownerId && ownedGroup.length===count})):[{label:'1 utility',value:'4× dice',current:!!ownerId && ownedGroup.length===1},{label:'Both utilities',value:'10× dice',current:!!ownerId && ownedGroup.length===2}];
  return <dialog ref={dialog} className="lovo-dialog lovo-deed" aria-labelledby="lovo-deed-title" onCancel={onClose}>
    <header className="lovo-deed-header"><div><small style={{color:group?.color}}>{group?.name || (tile.type==='station'?'Stations':'Utilities')}</small><h3 id="lovo-deed-title">{tile.name}</h3></div><button type="button" aria-label="Close deed" onClick={onClose}><X size={19}/></button></header>
    <div className="lovo-deed-overview"><div className="lovo-deed-art"><img src={tile.image} alt={`${tile.name} title deed artwork`}/></div><dl><div><dt>Owner</dt><dd><LovopolyToken id={owner?.token} color={owner?.tokenColor} /> {owner?.name || 'Bank · unowned'}</dd></div><div><dt>Purchase price</dt><dd>${tile.price}</dd></div><div className="lovo-deed-current-rent"><dt>Current rent</dt><dd>{tile.type==='utility' && ownerId && !mortgaged && !diceTotal?`${utilityMultiplier}× dice`:`$${rent}`}</dd>{tile.type==='utility' && !!diceTotal && !!ownerId && !mortgaged && <small>{utilityMultiplier} × last roll ({diceTotal})</small>}</div></dl></div>
    {mortgaged && <p className="lovo-deed-note">Mortgaged · no rent is collected.</p>}
    {complete && !level && !mortgaged && <p className="lovo-deed-note">Complete color group · base rent is doubled.</p>}
    <section className="lovo-rent-ladder"><h4>Rent ladder</h4><ol>{rows.map((row,index)=><li key={row.label} className={row.current?'is-current':''} aria-current={row.current?'step':undefined}><span>{row.level===5?<Crown size={16} aria-hidden="true"/>:row.level>0?<span className="lovo-nest-icons" aria-hidden="true">{Array.from({length:row.level},(_,i)=><LoveNest key={i} size={13}/>)}</span>:null}{row.label}{row.current && <small> (Current{mortgaged?' · mortgaged':''})</small>}</span><strong>{row.value}</strong></li>)}</ol></section>
    {tile.group && <p className="lovo-deed-note">Love Nests cost ${tile.buildingCost} each. After four nests, upgrade to a Love Castle for ${tile.buildingCost}. Build and sell evenly.</p>}
    <footer className="lovo-deed-actions">{actions.map(({type,label,Icon,amount})=>{const why=reason(type);return <span key={type} title={why || `${label} ${amount}`}><button type="button" disabled={busy || !!why} aria-label={`${label}${amount?' '+amount:''}`} onClick={()=>act(type,{tileId:tile.id})}><Icon size={17}/><span>{label}<small>{amount}</small></span></button></span>;})}</footer>
    <p className="lovo-deed-note">{!canAct?'Property management is available to the owner during an active match.':!tile.group?'Stations and utilities cannot have buildings. Sell applies to Love Nests and Love Castles.':'Sell returns half the building cost. Mortgage requires no buildings in the color group.'}</p>
  </dialog>;
}

