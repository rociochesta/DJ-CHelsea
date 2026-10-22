import {completedGroups} from '../utils/lovopolyVisuals';
import { useEffect, useState } from 'react';
import { LOVOPOLY_GROUPS, LOVOPOLY_TILES as tiles } from '../utils/lovopolyBoard';
import { netWorth, liquidationValue, describeTradeSide } from '../utils/lovopolyEconomy';

export function LovopolyNetWorth({ game }) {
  return <section className="lovo-net-worth" aria-label="Net worth">
    <h4>Net worth</h4>
    <dl>{Object.values(game.players).map(player => <div className="lovo-worth-row" key={player.id}>
      <dt>{player.name}</dt>
      <dd>${netWorth(game, player.id).toLocaleString('en-US')}</dd>
    </div>)}</dl>
  </section>;
}

export default function LovopolyEconomy({ game, me, act, busy }) {
  const monopolies=completedGroups(game.owners);
  const [filter,setFilter]=useState('All');
  const empty = () => ({ cash: 0, cards: 0, properties: [] });
  const [give, setGive] = useState(empty), [receive, setReceive] = useState(empty);
  useEffect(() => { setGive(empty()); setReceive(empty()); }, [me.id, game.id]);
  const other = Object.values(game.players).find(p => p.id !== me.id);
  const active = ['ready', 'playing'].includes(game.status);
  const side = (label, value, setter, owner) => <fieldset disabled={busy || !active} className="lovo-trade-side"><legend>{label}</legend>
    <label>Money $<input type="number" min="0" step="1" value={value.cash} onChange={e => setter({ ...value, cash: Number(e.target.value) })} /></label>
    <label>Detention cards<input type="number" min="0" max={game.players[owner].detentionCards || 0} step="1" value={value.cards} onChange={e => setter({ ...value, cards: Number(e.target.value) })} /></label>
    {tiles.filter(t => game.owners?.[t.id] === owner).map(t => <label key={t.id}><input type="checkbox" checked={value.properties.includes(t.id)} onChange={e => setter({ ...value, properties: e.target.checked ? [...value.properties, t.id] : value.properties.filter(id => id !== t.id) })} />{t.name}{game.mortgages?.[t.id] ? ' (mortgaged)' : ''}</label>)}
  </fieldset>;
  const describe = describeTradeSide;
  return <div className="lovo-economy">
    {active && game.debt && <div role="status" className="lovo-debt"><h4>Outstanding debt: ${game.debt.amount}</h4><p>Cash available after selling all buildings and mortgaging eligible properties: ${liquidationValue(game, game.debt.playerId)}. Bankruptcy is available only if this cannot cover the debt.</p><p>{game.players[game.debt.playerId].name} can sell buildings, mortgage properties, and trade before deciding whether to declare bankruptcy.</p>{game.debt.playerId === me.id && <><button className="lovo-button" disabled={busy || me.cash < game.debt.amount} onClick={() => act('settle-debt')}>Pay debt</button><details><summary>Declare bankruptcy</summary><p>This ends the match. Your person wins.</p><button className="lovo-button" disabled={busy || liquidationValue(game, me.id) >= game.debt.amount} onClick={() => act('bankrupt')}>Confirm bankruptcy</button></details></>}</div>}
    <details open><summary>Property portfolio</summary><select aria-label="Property filter" value={filter} onChange={e=>setFilter(e.target.value)}>{['All','Mine',"Partner's",'Unowned'].map(f=><option key={f}>{f}</option>)}</select>{[...Object.entries(LOVOPOLY_GROUPS),['station',{name:'Stations'}],['utility',{name:'Utilities'}]].map(([key,group])=><section key={key}><h4 style={{borderLeft:`6px solid ${group.color || '#ddd'}`,paddingLeft:8}}>{group.name}</h4>{Object.values(game.players).map(p=>{const groupTiles=tiles.filter(t=>(t.group || t.type)===key);const owned=groupTiles.filter(t=>game.owners?.[t.id]===p.id).length;return <p key={p.id}>{p.name}: {owned}/{groupTiles.length}{owned===groupTiles.length?LOVOPOLY_GROUPS[key]?' · 👑 MONOPOLY':' · Complete group':''}</p>;})}{tiles.filter(t => t.price && (t.group || t.type)===key && (filter==='All' || (filter==='Mine'?game.owners?.[t.id]===me.id:filter==='Unowned'?!game.owners?.[t.id]:game.owners?.[t.id] && game.owners[t.id]!==me.id))).map(t => <div className={`lovo-property ${monopolies[t.group]?"lovo-monopoly-property":""}`} style={{"--monopoly-color":LOVOPOLY_GROUPS[t.group]?.color}} key={t.id}><strong>{t.name}</strong><p>{game.players[game.owners?.[t.id]]?.name || 'Bank · unowned'} · {game.mortgages?.[t.id] ? 'Mortgaged · no rent' : 'Active'} · {(game.buildings?.[t.id] || 0) === 5 ? 'Love Castle' : `${game.buildings?.[t.id] || 0} Love Nests`}</p>
      {active && game.owners?.[t.id] === me.id && <div className="lovo-property-actions"><button className="lovo-button" disabled={busy} onClick={() => act(game.mortgages?.[t.id] ? 'unmortgage' : 'mortgage', { tileId: t.id })}>{game.mortgages?.[t.id] ? `Repay $${Math.ceil(t.price * 55 / 100)}` : `Mortgage +$${t.price / 2}`}</button>{t.group && <><button className="lovo-button" disabled={busy} onClick={() => act('build', { tileId: t.id })}>Build −${t.buildingCost}</button><button className="lovo-button" disabled={busy || !game.buildings?.[t.id]} onClick={() => act('sell-building', { tileId: t.id })}>Sell +${t.buildingCost / 2}</button></>}</div>}
    </div>)}</section>)}</details>
    {active && other && <details><summary>Trade or send a gift</summary><p>Both players approve the exact terms. For a gift, leave one side empty. Buildings in the color group must be sold first. Mortgages transfer with the property.</p>{side('You give', give, setGive, me.id)}{side('You receive', receive, setReceive, other.id)}<button className="lovo-button lovo-primary" disabled={busy} onClick={() => act('trade-offer', { give, receive })}>Send offer</button></details>}
    <details open><summary>Offers & history</summary>{Object.values(game.trades || {}).map(t => <div className={`lovo-property ${monopolies[t.group]?"lovo-monopoly-property":""}`} style={{"--monopoly-color":LOVOPOLY_GROUPS[t.group]?.color}} key={t.id}><strong>{game.players[t.from].name} → {game.players[t.to].name}</strong><p>Gives: {describe(t.give)}<br />Receives: {describe(t.receive)}<br />{t.status}</p>{active && t.status === 'pending' && (t.to === me.id ? <><button className="lovo-button" disabled={busy} onClick={() => act('trade-accept', { tradeId: t.id })}>Accept</button><button className="lovo-button" disabled={busy} onClick={() => act('trade-decline', { tradeId: t.id })}>Decline</button></> : <button className="lovo-button" disabled={busy} onClick={() => act('trade-withdraw', { tradeId: t.id })}>Withdraw</button>)}</div>)}</details>
  </div>;
}
