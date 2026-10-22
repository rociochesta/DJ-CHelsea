import {Plus, ChevronDown} from 'lucide-react';
import {LOVOPOLY_GROUPS, LOVOPOLY_TILES as tiles} from '../utils/lovopolyBoard';

const meanings={chile:'Places close to home',oklahoma:'Life on the other side',together:'Moments we share',distance:'Love across the miles',games:'Our playful side',chemistry:'The spark between us',you:'What makes you special',us:'The life we build',station:'Transit network',utility:'Service monopolies'};

export default function LovopolyProperties({game, me, filter, onFilter, onDeed}) {
  const players=Object.values(game.players);
  const matches=tile=>filter==='All' || (filter==='Mine'?game.owners?.[tile.id]===me.id:filter==='Unowned'?!game.owners?.[tile.id]:game.owners?.[tile.id] && game.owners[tile.id]!==me.id);
  const groups=[...Object.entries(LOVOPOLY_GROUPS),['station',{name:'Stations',color:'#e6d8e2'}],['utility',{name:'Utilities',color:'#e6d8e2'}]];
  return <div className="lovo-portfolio">
    <select aria-label="Property filter" value={filter} onChange={e=>onFilter(e.target.value)}>{['All','Mine',"Partner's",'Unowned'].map(value=><option key={value}>{value}</option>)}</select>
    {!tiles.some(tile=>tile.price && matches(tile)) && <p>No properties match this filter.</p>}
    {groups.map(([key,group])=>{
      const all=tiles.filter(tile=>(tile.group || tile.type)===key);
      const visible=all.filter(matches);
      if(!visible.length)return null;
      return <details className="lovo-property-group" key={key} style={{'--group-color':group.color}}>
        <summary><span className="lovo-group-description"><strong>{group.name}</strong><small>{meanings[key]} ({all.length} total)</small></span><span className="lovo-group-counts">{players.map(player=><span key={player.id}>{player.name}: <b>{all.filter(tile=>game.owners?.[tile.id]===player.id).length}/{all.length}</b></span>)}</span><ChevronDown size={14} aria-hidden="true" /></summary>
        <div className="lovo-property-tiles">{visible.map(tile=>{
          const owner=game.players[game.owners?.[tile.id]];
          return <article key={tile.id} className="lovo-property-mini"><div><strong><i aria-hidden="true" />{tile.name}</strong><span>${tile.price} · {owner?.name || 'Unowned'}</span>{game.mortgages?.[tile.id] && <small>Mortgaged</small>}</div><button type="button" aria-label={`Open deed: ${tile.name}`} onClick={()=>onDeed(tile)}><Plus size={16} /></button></article>;
        })}</div>
      </details>;
    })}
  </div>;
}
