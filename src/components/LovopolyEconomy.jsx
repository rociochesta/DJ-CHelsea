import LovopolyProperties from './LovopolyProperties';
import LovopolyTradePopup, {TradeOffer} from './LovopolyTradePopup';
import { useEffect, useState, useRef } from 'react';
import { LOVOPOLY_TOKENS, LOVOPOLY_GROUPS, LOVOPOLY_TILES as tiles } from '../utils/lovopolyBoard';
import { netWorth, liquidationValue, describeTradeSide } from '../utils/lovopolyEconomy';

export function LovopolyNetWorth({ game, userId }) {
  return <div className="lovo-match-players" aria-label="Players and net worth">
    {Object.values(game.players).map(player => {
      const token = LOVOPOLY_TOKENS.find(item => item.id === player.token);
      const active = ['ready', 'playing'].includes(game.status) && game.turn === player.id;
      return <article key={player.id} className={`lovo-match-player${active ? ' is-active' : ''}`}>
        <h4><span style={{color:token?.color}} title={token?.name}>{token?.symbol}</span><span>{player.name}</span></h4>
        <strong className="lovo-match-cash">${player.cash.toLocaleString('en-US')}</strong>
        <small>Cash · Net worth ${netWorth(game, player.id).toLocaleString('en-US')}</small>
        <span className="lovo-match-turn">{game.status === 'finished' ? 'Match complete' : active ? player.id === userId ? '● Your turn' : '● Active turn' : 'Waiting'}</span>
      </article>;
    })}
  </div>;
}

export default function LovopolyEconomy({ game, me, act, busy, tab = 'Properties', onDeed, onTrade, error }) {

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
  const [counterId,setCounterId]=useState(null);
  const [popup,setPopup]=useState(false);
  const seen=useRef(new Set());
  const editor=useRef(null);
  const incoming=Object.values(game.trades || {}).filter(t=>t.to===me.id && t.status==='pending');
  const offerKey=incoming.map(t=>t.id).sort().join(',');
  useEffect(()=>{
    const key=`${game.id}:${me.id}:${game.completedTurns || 0}:${offerKey}`;
    if(game.turn===me.id && ['ready','playing'].includes(game.status) && offerKey && !seen.current.has(key)) {seen.current.add(key);setPopup(true);onTrade?.();}
    if(game.turn!==me.id || !offerKey || !['ready','playing'].includes(game.status))setPopup(false);
  },[game.id,me.id,game.turn,game.completedTurns,game.status,offerKey]);
  useEffect(()=>{setCounterId(null);},[game.id,me.id]);
  useEffect(()=>{if(counterId && game.trades?.[counterId]?.status!=='pending'){setCounterId(null);setGive(empty());setReceive(empty());}},[counterId,game.trades]);
  const counter=trade=>{setCounterId(trade.id);setGive({...trade.receive,properties:[...(trade.receive.properties || [])]});setReceive({...trade.give,properties:[...(trade.give.properties || [])]});setPopup(false);onTrade?.();requestAnimationFrame(()=>editor.current?.scrollIntoView({block:'nearest'}));};
  const offer=trade=><TradeOffer key={trade.id} {...{trade,game,me,act,busy}} onCounter={counter}/>;
  return <div className="lovo-economy">

    <div hidden={tab !== 'Properties'}><LovopolyProperties game={game} me={me} filter={filter} onFilter={setFilter} onDeed={onDeed} /></div>
    <div hidden={tab !== 'Trade'}>
      {incoming.map(offer)}
      {active && other ? <div ref={editor}>{counterId && <div className="lovo-counter-label"><strong>Counteroffer</strong><button className="lovo-text-button" onClick={()=>{setCounterId(null);setGive(empty());setReceive(empty());}}>Cancel counteroffer</button></div>}{side('You give', give, setGive, me.id)}{side('You receive', receive, setReceive, other.id)}<button className="lovo-button lovo-primary" disabled={busy} onClick={()=>act('trade-offer',{give,receive,...(counterId?{counterTradeId:counterId}:{})})}>{counterId?'Send counteroffer':'Send offer'}</button></div> : <p>Trading is available during an active match.</p>}
      {Object.values(game.trades || {}).filter(t=>!incoming.some(i=>i.id===t.id)).sort((a,b)=>(b.at||0)-(a.at||0)).map(offer)}
    </div>
    {popup && incoming.length>0 && <LovopolyTradePopup offers={incoming} {...{game,me,act,busy,error}} onCounter={counter} onClose={()=>setPopup(false)}/>}
  </div>;
}

export function LovopolyDebt({game, me, act, busy}) {
 const active = ['ready','playing'].includes(game.status);
 return <>{active && game.debt && <div role="status" className="lovo-debt"><h4>Outstanding debt: ${game.debt.amount}</h4><p>Cash available after selling all buildings and mortgaging eligible properties: ${liquidationValue(game, game.debt.playerId)}. Bankruptcy is available only if this cannot cover the debt.</p><p>{game.players[game.debt.playerId].name} can sell buildings, mortgage properties, and trade before deciding whether to declare bankruptcy.</p>{game.debt.playerId === me.id && <><button className="lovo-button" disabled={busy || me.cash < game.debt.amount} onClick={() => act('settle-debt')}>Pay debt</button><details><summary>Declare bankruptcy</summary><p>This ends the match. Your person wins.</p><button className="lovo-button" disabled={busy || liquidationValue(game, me.id) >= game.debt.amount} onClick={() => act('bankrupt')}>Confirm bankruptcy</button></details></>}</div>}</>;
}
