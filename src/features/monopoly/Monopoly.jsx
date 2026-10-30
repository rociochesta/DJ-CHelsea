import React, { useEffect, useState } from 'react';
import { database, ref, runTransaction } from '../../utils/firebase';
import { updateMonopoly, rollDice } from './engine';
import { tiles, tokens, categories, lovopolyTileLayout } from './catalog';
import { netWorth } from '../../utils/lovopolyEconomy';
import './monopoly.css';
import TilePopup from './TilePopup';
import { sampleLiteratureRoll, purchasePrice } from './literature';
export default function Monopoly({ roomCode, currentUser, game, participants = {} }) {
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[selected,setSelected]=useState(null),[mode,setMode]=useState('classic');
  const [landingOpen,setLandingOpen]=useState(null);
  useEffect(()=>{
    if(game?.lastLanding?.id&&game.status==='playing'&&game.turn===game.lastLanding.playerId&&game.phase!=='roll'){
      setSelected(null);setLandingOpen(game.lastLanding.id);
    }else setLandingOpen(null);
  },[game?.id,game?.lastLanding?.id]);
  const currentLanding=landingOpen===game?.lastLanding?.id&&game?.status==='playing'&&game.turn===game.lastLanding.playerId?game.lastLanding:null;
  const closePopup=()=>{setSelected(null);setLandingOpen(null);};
  const players=Object.values(game?.players||{}),me=game?.players?.[currentUser?.id],mine=game?.turn===currentUser?.id&&!me?.eliminated;
  async function act(type,extra={}){
    if(busy)return;setBusy(true);setError('');
    const action={...extra,type,user:currentUser,id:crypto.randomUUID(),now:Date.now(),expectedGameId:game?.id||null,expectedRevision:game?.revision,...(type==='roll'?{dice:rollDice()}: {}),...(['roll','settle-debt'].includes(type)?{triviaRoll:sampleLiteratureRoll()}: {})};
    try{const result=await runTransaction(ref(database,`karaoke-rooms/${roomCode}/monopolyGame`),existing=>updateMonopoly(existing,action),{applyLocally:false});if(!result.committed)throw new Error('Could not save the move. Try again.');return true;}catch(e){setError(e.message);return false;}finally{setBusy(false);}
  }
  const button=(label,type,extra={},disabled=false)=><button type="button" disabled={busy||disabled} onClick={()=>act(type,extra)}>{label}</button>;
  return <section className="na-monopoly" aria-label="NA Monopoly">
    <header><div><small>JAM MODE · 2–8 ONLINE PLAYERS</small><h2>NA Monopoly</h2><p>Just for Today · Meetings, service & fellowship</p></div><span>{players.length}/8 players</span></header>
    {error&&<p role="alert" className="na-error">{error}</p>}
    {(!game||game.status==='finished')&&<div className="na-controls">
      {game?.status==='finished'&&<strong>{game.winner==='tie'?'The match ended in a tie.':`${game.players[game.winner]?.name} wins!`}</strong>}
      <label>Match length <select value={mode} onChange={e=>setMode(e.target.value)}><option value="classic">Classic · last player standing</option><option value="quick">Quick · 20 rounds</option></select></label>
      {button(game?'New match':'Create lobby','create',{mode},!currentUser?.id)}
    </div>}
    {game?.status==='setup'&&<div className="na-controls"><p>Invite everyone in the room to join here. The creator starts when 2–8 players are ready.</p>{!me?button('Join match','join',{},players.length>=8):<>{button('Leave lobby','leave-lobby')}{game.creatorId===me.id&&button('Start match','start',{},players.length<2)}</>}</div>}
    {!!players.length&&<ul className="na-players">{players.map(p=>{const token=tokens.find(t=>t.id===p.token);return <li key={p.id} className={game.turn===p.id?'na-active':''}><span style={{color:token.color}}>{token.symbol}</span><strong>{p.name}</strong><small>{p.eliminated?'Eliminated':`$${p.cash} · worth $${netWorth(game,p.id)}`}{p.detained?' · Pause':''}{!participants[p.id]?' · away':''}</small></li>;})}</ul>}
    {game?.status==='playing'&&<div className="na-controls" aria-live="polite"><strong>{game.players[game.turn]?.name}'s turn</strong>{game.lastDice&&<span>Dice: {game.lastDice.join(' + ')}</span>}
      {mine&&<>{game.debt?<><span>Debt: ${game.debt.amount}. Manage your properties below to raise funds.</span>{button('Pay debt','settle-debt')}{button('Declare bankruptcy','bankrupt')}</>:<>{game.phase==='challenge'&&<button onClick={()=>{setSelected(null);setLandingOpen(game.lastLanding.id);}}>Open literature challenge</button>}{game.phase==='roll'&&button(me.detained?'Roll to leave Pause':'Roll dice','roll')}{game.phase==='purchase'&&<>{button(`Buy · $${purchasePrice(game,tiles[me.position])}`,'buy',{},me.cash<purchasePrice(game,tiles[me.position]))}{button('Pass','pass')}</>}{game.phase==='end'&&button(game.extraRoll?'Continue · roll again':'End turn','end-turn')}</>}<details><summary>Leave match</summary><p>Surrender eliminates your token and releases or transfers your properties. The other players continue.</p>{button('Confirm surrender','surrender')}</details></>}
      {!me&&<span>You are watching. Join the next match.</span>}
      {game.message&&<p>{game.message}</p>}{game.lastLanding&&game.turn===game.lastLanding.playerId&&game.phase!=='roll'&&<button onClick={()=>{setSelected(null);setLandingOpen(game.lastLanding.id);}}>View landing</button>}
    </div>}
    <p className="sm:hidden">Swipe the board sideways to explore all spaces.</p>
    <div className="na-board-scroll" tabIndex={0} aria-label="NA Monopoly board; scroll sideways to explore"><div className="na-board">
      <div className="na-center"><small>JUST FOR TODAY</small><h3>NA<br/>MONOPOLY</h3><p>Unity · Service · Recovery</p><span>2–8 players · Online</span></div>
      {tiles.map(tile=>{const box=lovopolyTileLayout(tile.id),owner=game?.players?.[game?.owners?.[tile.id]],occupants=players.filter(p=>!p.eliminated&&p.position===tile.id);return <button type="button" key={tile.id} className={`na-tile ${selected===tile.id?'na-selected':''}`} style={{left:`${box.x/12.5}%`,top:`${box.y/12.5}%`,width:`${box.w/12.5}%`,height:`${box.h/12.5}%`,'--category':categories[tile.group]?.color||'#94a3b8'}} onClick={()=>{setLandingOpen(null);setSelected(tile.id);setError('');}} aria-label={`${tile.name}${owner?`, owned by ${owner.name}`:''}${occupants.length?`, ${occupants.map(p=>p.name).join(', ')}`:''}`}><span className="na-tile-art" style={{width:`${(box.rotation===90||box.rotation===270?box.h/box.w:1)*100}%`,height:`${(box.rotation===90||box.rotation===270?box.w/box.h:1)*100}%`,transform:`translate(-50%, -50%) rotate(${box.rotation}deg)`}}><img src={tile.thumbnail} alt="" draggable={false} decoding="async"/><span className="na-stripe"/></span><span className="na-tile-label">{tile.name}</span><small className="na-price">{tile.price?`$${tile.price}`:tile.type==='go'?'+$200':''}</small><span className="na-markers">{occupants.map(p=>{const t=tokens.find(t=>t.id===p.token);return <span key={p.id} style={{color:t.color}} title={p.name}>{t.symbol}</span>;})}</span>{owner&&<small className="na-owner">{owner.name}{game.mortgages?.[tile.id]?' · M':''}{game.buildings?.[tile.id]?` · ${game.buildings[tile.id]===5?'Hotel':game.buildings[tile.id]+' houses'}`:''}</small>}</button>;})}
      {(currentLanding||selected!==null)&&<TilePopup key={currentLanding?.id||`tile-${selected}`} tileId={selected} landing={currentLanding} game={game} userId={currentUser?.id} busy={busy} error={error} onAction={act} onClose={closePopup}/>}
    </div></div>
    <details><summary>How to play</summary><p>Each player starts with $1,500. Collect $200 when passing Start. Buy spaces, collect rent, complete groups and build evenly. Three doubles send you to Pause. Roll doubles to leave; after three attempts pay $50. An unpaid debt must be resolved before play continues. Passing on a property leaves it in the bank. Quick mode ends after 20 rounds and compares net worth. Reconnect with the same room identity to resume.</p><p>On a purchasable space, a 30% chance offers an optional NA Literature Challenge. Correct answers reduce purchase prices by 20% or rent by 30%; stations and utilities get 25% off. Incorrect answers add 10%. On your own space, correct earns $50 and incorrect pays $50 to the bank. Skip has no penalty. Amounts round up to whole dollars. Each player has an independent deck; only answered questions are used.</p><p>This is a fan-made themed game; all money and ownership are fictional.</p></details>
    {game&&<details><summary>Recent activity</summary><ol>{Object.entries(game.events||{}).reverse().map(([id,event])=><li key={id}>{event.text}</li>)}</ol></details>}
  </section>;
}
