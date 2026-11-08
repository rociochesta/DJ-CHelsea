import {getLovopolyTiles,getLovopolyGroups} from '../utils/lovopolyCatalog';
import {completedGroups} from '../utils/lovopolyVisuals';
import LovopolyConfirm from './LovopolyConfirm';
import {propertyRent} from '../utils/lovopolyLanding';
import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Dice5, Heart, X } from 'lucide-react';
import LovopolyToken, { premiumIcon } from './LovopolyToken';
import { PREMIUM_TOKENS, TOKEN_COLORS, LOVOPOLY_GROUPS, LOVOPOLY_TILES, LOVOPOLY_TOKENS, lovopolyTileLayout } from '../utils/lovopolyBoard';
import { QUICK_ROUNDS } from '../utils/lovopoly';
import './Lovopoly.css';
import LovopolyEconomy, { LovopolyNetWorth, LovopolyDebt } from './LovopolyEconomy';
import LovopolyLanding from './LovopolyLanding';
import LovopolyInbox from './LovopolyInbox';
import LovopolyDetention from './LovopolyDetention';
import LovopolyLeave from './LovopolyLeave';
import LovopolyDeed from './LovopolyDeed';
import LovopolyDice from './LovopolyDice';
import {DICE_ROLL_MS,DICE_SETTLE_MS,TOKEN_STEP_MS,rollPresentationMs,latestBoardRoll} from '../utils/lovopolyAnimation';

const tokenById = id => LOVOPOLY_TOKENS.find(token => token.id === id) || LOVOPOLY_TOKENS[0];
const diceFaces = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
const typeLabels = { go: 'Starting corner', property: 'Property', station: 'Station', utility: 'Utility', chance: 'Love or Disaster', community: 'From Me to You', tax: 'Tax', detention: 'Kiss Detention / Just visiting', rest: 'Free parking corner', 'go-to-detention': 'Go to Kiss Detention' };

function TokenPicker({ value, color, players, userId, disabled, onChange }) {
  const selected = tokenById(value);
  const [category, setCategory] = useState(selected.category);
  return <fieldset className="lovo-token-picker" disabled={disabled}>
    <legend>Choose your token</legend>
    <div className="lovo-category-switch" role="group" aria-label="Token category">
      {['Love', 'Animal'].map(item => <button key={item} type="button" aria-pressed={category === item} onClick={() => setCategory(item)}>{item}</button>)}
    </div>
    <div className="lovo-premium-grid">{PREMIUM_TOKENS.filter(item => item.category === category).map(token => {
      const taken = players.some(player => player.id !== userId && player.token === token.id);
      return <button type="button" key={token.id} onClick={() => onChange(token.id, color)}
        aria-pressed={value === token.id} aria-label={`${token.name}${taken ? ' · taken' : ''}`}
        disabled={taken || disabled} title={taken ? `${token.name} is taken` : token.name}>
        <img className="lovo-premium-icon" src={premiumIcon(token)} alt="" loading="lazy" /><small>{token.name}</small>
      </button>;
    })}</div>
    <section className="lovo-piece-preview" aria-label="Board token preview">
      <LovopolyToken id={value} color={color} />
      <div><small>Board preview</small><strong>{selected.name}</strong></div>
    </section>
    <div className="lovo-swatches" role="group" aria-label="Token color">{Object.entries(TOKEN_COLORS).map(([name, hex]) =>
      <button type="button" key={name} aria-label={name} title={name} aria-pressed={name === color}
        style={{ backgroundColor: hex }} onClick={() => onChange(value, name)}>{name === color ? '✓' : ''}</button>
    )}</div>
  </fieldset>;
}

function Dice({ values, rolling = false }) {
  return <span className={`lovo-dice ${rolling ? 'lovo-dice-rolling' : ''}`} role="img" aria-label={values ? `Dice: ${values.join(' and ')}` : 'Not rolled yet'}>
    {(values || [null, null]).map((value, index) => <span key={index} aria-hidden="true">{value ? diceFaces[value - 1] : '·'}</span>)}
  </span>;
}

function TileDetails({ tile, game, onClose }) {
 const LOVOPOLY_TILES=getLovopolyTiles(game);
 const LOVOPOLY_GROUPS=getLovopolyGroups(game);
  const dialog = useRef(null);
  const [full,setFull]=useState(!tile.price);
  const [animated, setAnimated] = useState(false);
  useEffect(() => {
    const element = dialog.current;
    element.showModal();
    return () => element.close();
  }, []);
  return <dialog ref={dialog} className="lovo-dialog" aria-labelledby="lovo-tile-title" onCancel={onClose} onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="lovo-detail-header"><div><small>Space {tile.id} · {typeLabels[tile.type]}</small><h3 id="lovo-tile-title">{tile.name}</h3></div><button type="button" autoFocus onClick={onClose} aria-label="Close tile"><X size={20} /></button></div>
    {!!tile.price && <div><p>Owner: {game?.players?.[game?.owners?.[tile.id]]?.name || 'Bank · unowned'}</p><p>Price: ${tile.price} · Current rent: ${propertyRent(game || {},tile,(game?.lastDice || [1,1]).reduce((a,b)=>a+b,0))}{tile.type==='utility'?' (current dice)':''}</p><p>{game?.buildings?.[tile.id]===5?'Love Castle':`${game?.buildings?.[tile.id] || 0} Love Nests`} · {game?.mortgages?.[tile.id]?'MORTGAGED — No Rent Collected':'Not mortgaged'}</p>{!full && <button className="lovo-button" onClick={()=>setFull(true)}>View Full Deed</button>}</div>}
    {full && <><div className={`lovo-detail-art ${tile.id % 10 === 0 ? 'lovo-detail-corner' : ''}`}>
      <img src={tile.image} alt={`${tile.name} illustrated tile`} />
      {tile.overlay && animated && <img className="lovo-detail-overlay" src={tile.overlay} alt="" />}
    </div>
    {!!tile.price && <p>Purchase: ${tile.price} · {tile.type === 'property' ? `Base rent: ${tile.rent}` : tile.type === 'station' ? 'Rent: $25–$200 by stations owned' : 'Rent: 4× dice, or 10× with both utilities'}</p>}
    {!!tile.price && !tile.group && <p>Mortgage: ${tile.price / 2} · Repayment: ${Math.ceil(tile.price * 55 / 100)}</p>}
    {tile.group && <p>Love Nest: ${tile.buildingCost} each · Love Castle: ${tile.buildingCost} after four nests.<br />Rent with 1–4 nests / castle: {tile.rents.slice(1).map(value => `$${value}`).join(' / ')}.<br />Mortgage: ${tile.price / 2} · Repayment: ${Math.ceil(tile.price * 55 / 100)}.</p>}
    {tile.group && <p className="lovo-group"><span style={{ backgroundColor: LOVOPOLY_GROUPS[tile.group].color }} />{LOVOPOLY_GROUPS[tile.group].name} · {LOVOPOLY_TILES.filter(other => other.group === tile.group).length} properties</p>}
    {tile.overlay && <button type="button" className="lovo-button" onClick={() => setAnimated(value => !value)}>{animated ? 'Hide animation' : 'Play tile animation'}</button>}
    </>}
  </dialog>;
}

export function LovopolyBoard({ players = [], onSelect, showNumbers = false, zoom = 1, turn, game, rolling = false }) {
 const LOVOPOLY_TILES=getLovopolyTiles(game);
 const LOVOPOLY_GROUPS=getLovopolyGroups(game);
  const [shownPlayers,setShownPlayers]=useState(players);
  const shownRef=useRef(players);
  const lastRoll=latestBoardRoll(game);
  const rollKey=`${game?.id || ''}:${lastRoll?.id || ''}`;
  const seenRoll=useRef(rollKey);
  const positionKey=players.map(p=>`${p.id}:${p.position}`).join('|');
  useEffect(()=>{
    const previous=shownRef.current;
    const save=value=>{shownRef.current=value;setShownPlayers(value);};
    const isNew=seenRoll.current!==rollKey;
    seenRoll.current=rollKey;
    if(!isNew || !lastRoll || window.matchMedia('(prefers-reduced-motion: reduce)').matches){save(players);return;}
    const actor=players.find(p=>p.id===lastRoll.userId),old=previous.find(p=>p.id===lastRoll.userId);
    if(!actor || !old || actor.position===old.position){save(players);return;}
    const count=(game.lastDice || []).reduce((a,b)=>a+b,0);
    const timers=[];
    // Keep the saved game intact; only the displayed token waits for the dice.
    const direct=actor.detained || actor.position!==(old.position+count)%40;
    const steps=direct?1:count;
    for(let step=1;step<=steps;step++)timers.push(setTimeout(()=>save(players.map(p=>p.id===actor.id?{...p,position:step===steps?actor.position:(old.position+step)%40}:p)),DICE_ROLL_MS+DICE_SETTLE_MS+step*TOKEN_STEP_MS));
    return()=>timers.forEach(clearTimeout);
  },[rollKey,positionKey]);
  const monopolies=completedGroups(game?.owners);
  const previous=useRef(null);
  const [celebration,setCelebration]=useState(null);
  const signature=JSON.stringify(monopolies);
  useEffect(()=>{
    const current=JSON.parse(signature);
    if(previous.current?.id===game?.id){const gained=Object.keys(current).filter(k=>previous.current.groups[k]!==current[k]);if(gained.length)setCelebration(gained.map(k=>`${game?.players?.[current[k]]?.name || "Your person"} · ${LOVOPOLY_GROUPS[k].name}`).join(" / "));}
    else setCelebration(null);
    previous.current={id:game?.id,groups:current};
  },[signature,game?.id]);
  useEffect(()=>{if(!celebration)return;const timer=setTimeout(()=>setCelebration(null),3500);return()=>clearTimeout(timer);},[celebration]);
  return <div className="lovo-board-scroll" tabIndex={0} aria-label="Lovopoly board; scroll to explore when zoomed">
    <div className={`lovo-board ${showNumbers ? 'lovo-numbered' : ''}`} style={{ width: `${zoom * 100}%` }}>
      <div className="lovo-board-center"><Heart className="lovo-center-heart" fill="currentColor" aria-hidden="true"/><h3>LOVOPOLY</h3><p>A little love.<br />A little rivalry.</p><LovopolyDice game={game} rolling={rolling}/></div>
      {celebration && <div className="lovo-monopoly-celebration" role="status">👑 Monopoly!<br/>{celebration}</div>}
      {LOVOPOLY_TILES.map(tile => {
        const { x, y, w, h, rotation } = lovopolyTileLayout(tile.id);
        const owner=game?.players?.[game?.owners?.[tile.id]],level=game?.buildings?.[tile.id] || 0,mortgaged=game?.mortgages?.[tile.id];
        const complete=!!monopolies[tile.group];
        const occupants = shownPlayers.filter(player => player.position === tile.id);
        return <button type="button" key={tile.id} className={`lovo-tile ${w > h ? 'lovo-tile-side' : ''} ${complete?'lovo-monopoly-tile':''}`} data-monopoly={complete || undefined}
          style={{ '--monopoly-color':LOVOPOLY_GROUPS[tile.group]?.color, left: `${x / 12.5}%`, top: `${y / 12.5}%`, width: `${w / 12.5}%`, height: `${h / 12.5}%` }}
          onClick={() => onSelect(tile)} aria-label={`Space ${tile.id}: ${tile.name}${owner?`. Owned by ${owner.name}`:''}${level?`. ${level===5?'Love Castle':`${level} Love Nests`}`:''}${mortgaged?'. Mortgaged, no rent':''}${complete?'. Complete monopoly':''}${occupants.length ? `. ${occupants.map(player => player.name).join(' and ')} here` : ''}`}>
          <div className="lovo-board-art" style={{transform:`rotate(${rotation}deg)`}}><img src={tile.thumbnail} alt="" draggable="false"/>{tile.group && <span className="lovo-board-group-stripe" aria-hidden="true" style={{background:LOVOPOLY_GROUPS[tile.group]?.color}}/>}</div>
          <span className="lovo-tile-number" aria-hidden="true">{tile.id}</span>
          {owner && <span className="lovo-owner-badge" title={`Owner: ${owner.name}`} aria-hidden="true"><LovopolyToken id={owner.token} color={owner.tokenColor} /></span>}
          {level>0 && <span className="lovo-building-badge" title={level===5?'Love Castle':`${level} Love Nests`} aria-hidden="true">{level===5?'🏰':`🏠×${level}`}</span>}
          {mortgaged && <span className="lovo-mortgage-badge" title="Mortgaged — No Rent Collected" aria-hidden="true">🏦</span>}
          {occupants.length > 0 && <span className="lovo-board-tokens">{occupants.map(player => <span className={player.id===turn?"lovo-token-active":""} key={player.id} title={player.name}  aria-hidden="true"><LovopolyToken id={player.token} color={player.tokenColor} /></span>)}</span>}
        </button>;
      })}
    </div>
  </div>;
}

// This view is independent of Firebase, so it can also be exercised locally with
// two clients and the exact production reducer rather than writing test rooms.
export default function LovopolyGame({ currentUser, game, onAction, onClose }) {
 const LOVOPOLY_TILES=getLovopolyTiles(game);
 const LOVOPOLY_GROUPS=getLovopolyGroups(game);
  const [confirmation,setConfirmation]=useState(null);
  const [mode, setMode] = useState('classic');
  const [roundLimit, setRoundLimit] = useState(20);
  const [color, setColor] = useState('Blush');
  const selectToken = (id, shade) => { setToken(id); setColor(shade); };
  const [token, setToken] = useState('heart');
  const [selectedTile, setSelectedTile] = useState(null);
  const [exploreTile, setExploreTile] = useState(null);
  const [landingOpen,setLandingOpen] = useState(false);
  const [landingCard,setLandingCard]=useState(null);
  const [detentionOpen,setDetentionOpen] = useState(false);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [matchTab, setMatchTab] = useState('Properties');
  const lock = useRef(false);
  const players = Object.values(game?.players || {});
  const me = game?.players?.[currentUser?.id];
  const cancelled = game?.status === 'cancelled';
  const creating = !game || cancelled;
  const joining = game?.status === 'setup' && !me;
  const openingRoll = game?.openingRolls?.[currentUser?.id];
  const available = PREMIUM_TOKENS.filter(item => !players.some(player => player.id !== currentUser?.id && player.token === item.id));
  const chosenToken = creating ? token : available.some(item => item.id === token) ? token : available[0]?.id;
  const events = Object.values(game?.events || {}).sort((a, b) => b.at - a.at);
  const landingKey=`lovo-seen:${game?.id}:${currentUser?.id}`;
  const landings=Object.values({...game?.latestLandings,...(game?.lastLanding?{latest:game.lastLanding}:{})}).sort((a,b)=>b.at-a.at);
  const newestLanding=landings[0];
  useEffect(()=>{
    setLandingOpen(false);
    if(!me || !newestLanding || !['ready','playing'].includes(game?.status))return;
    let seen=0;try{seen=Number(localStorage.getItem(landingKey)) || 0;}catch{}
    if(newestLanding.at<=seen)return;
    const recent=Date.now()-newestLanding.at<10000;
    const timer=setTimeout(()=>{setExploreTile(null);setSelectedTile(null);setLandingCard(newestLanding);setLandingOpen(true);},recent && !window.matchMedia('(prefers-reduced-motion: reduce)').matches?rollPresentationMs(newestLanding.dice || game.lastDice):0);
    return()=>clearTimeout(timer);
  },[game?.id,newestLanding?.id,currentUser?.id,game?.status]);
  useEffect(()=>{
    if(me?.detained && game?.turn===me.id && ['ready','playing'].includes(game?.status)) {
      setSelectedTile(null);setLandingOpen(false);const timer=setTimeout(()=>setDetentionOpen(true),window.matchMedia('(prefers-reduced-motion: reduce)').matches?0:rollPresentationMs(game.lastDice));return()=>clearTimeout(timer);
    } else setDetentionOpen(false);
  },[game?.id,currentUser?.id,me?.detained,me?.detentionId,game?.turn,game?.status]);
  const openDetention=()=>{setSelectedTile(null);setLandingOpen(false);setDetentionOpen(true);};
  const selectBoardTile=tile=>{setSelectedTile(null);setExploreTile(tile);};
  const closeLanding=()=>{setLandingOpen(false);const item=landingCard || game?.lastLanding;if(item)try{localStorage.setItem(landingKey,String(item.at));}catch{}};

  useEffect(() => { setError(''); setMatchTab('Properties'); }, [game?.id, currentUser?.id, game?.status]);

  async function act(type, extra = {}, confirmed=false) {
    if(!confirmed && ['buy','mortgage','unmortgage','build','sell-building','trade-offer','trade-accept'].includes(type)){setConfirmation({type,extra,previewGame:game,revision:game.revision,gameId:game.id,userId:currentUser.id});return false;}
    if(confirmed && (confirmation.revision!==game.revision || confirmation.gameId!==game.id || confirmation.userId!==currentUser.id)){setConfirmation(null);setError('The match changed. Review the action again.');return false;}
    if (lock.current) return;
    lock.current = true; setBusy(type); setError('');
    try {
      if(type==='roll' || type==='heart-reroll'){setDetentionOpen(false);setLandingOpen(false);document.querySelector('.lovo-board-center')?.scrollIntoView({block:'center',behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});}
      await onAction(type, extra);
      if(type==='roll' || type==='heart-reroll')await new Promise(resolve=>setTimeout(resolve,window.matchMedia('(prefers-reduced-motion: reduce)').matches?0:rollPresentationMs()));
      if(type==='buy' && game?.lastLanding)closeLanding();
      return true;
    }
    catch (cause) { setError(cause.message || 'Could not save. Please try again.'); return false; }
    finally { lock.current = false; setBusy(''); }
  }

  const status = creating ? 'A board for the two of you.'
    : game.status === 'setup' ? 'Waiting for your person to join.'
    : game.status === 'opening' ? openingRoll ? 'Your opening roll is saved. Waiting for your person.' : 'Roll to decide who goes first.'
    : game.status === 'finished' ? game.winner === 'tie' ? 'A shared victory!' : `${game.players[game.winner]?.name} wins!`
    : `${game.players?.[game.turn]?.name || 'Your person'}’s turn · Round ${Math.floor((game.completedTurns || 0) / 2) + 1}`;

  return <section className="lovo-game" aria-label="Lovopoly">
    <header className="lovo-header"><button type="button" className="lovo-back" onClick={onClose}><ArrowLeft size={16} /> Back to room</button><div><small>LOVE, WITH A COMPETITIVE STREAK</small><h2>Lovopoly<span>♥</span></h2></div><span className="lovo-preview-badge">Classic & Quick</span></header>
    <p className="lovo-status" role="status">{busy ? 'Saving your move…' : status}</p>
    {creating && <p className="lovo-preview-note">Roll, buy your favorite places, and collect rent. Progress is saved after every action.</p>}
    {error && <p className="lovo-error" role="alert">{error}</p>}

    {players.length > 0 && !cancelled && !['ready','playing','finished'].includes(game.status) && <div className="lovo-players">{players.map(player => <article key={player.id} className={player.id === game.turn ? 'lovo-player lovo-player-first' : 'lovo-player'}>
      <span className="lovo-player-token"><LovopolyToken id={player.token} color={player.tokenColor} /></span>
      <div><h3>{player.name}{player.id === currentUser?.id && <small> You</small>}</h3><p>${player.cash.toLocaleString()} · {player.hearts || 0} ❤️ <span>· {LOVOPOLY_TILES[player.position].name}</span></p></div>
      {game.status !== 'setup' && <div className="lovo-player-roll"><Dice values={game.openingRolls?.[player.id]?.dice} rolling={busy === 'opening-roll' && player.id === currentUser?.id} /><small>{game.firstPlayerId === player.id ? 'Goes first' : game.openingRolls?.[player.id] ? `Total ${game.openingRolls[player.id].total}` : 'Opening roll'}</small></div>}
    </article>)}{players.length === 1 && <div className="lovo-player lovo-player-empty"><Heart size={24} /><span>A place for your person.<small>They can join from this room whenever they return.</small></span></div>}</div>}

    {game?.lastRent && !cancelled && game.status !== 'finished' && <div className="lovo-rent-notice" role="status"><strong>{game.lastRent.status === 'paid' ? 'Rent paid automatically' : game.lastRent.status === 'owed' ? 'Rent awaiting payment' : 'Rent resolved by bankruptcy'} · ${game.lastRent.amount}</strong><span>{game.players[game.lastRent.payerId]?.name} → {game.players[game.lastRent.ownerId]?.name} · {LOVOPOLY_TILES[game.lastRent.tileId]?.name}</span><small>{game.lastRent.status === 'paid' ? 'Both balances have already been updated.' : game.lastRent.status === 'owed' ? 'Not enough cash. Resolve the debt in Your match before continuing.' : 'Remaining assets were settled with the creditor.'}</small></div>}
    <div className="lovo-workspace"><div className="lovo-board-area">
      <LovopolyBoard game={cancelled?null:game} players={cancelled ? [] : players} turn={game?.turn} onSelect={selectBoardTile} rolling={busy==='roll' && !game?.lastDice} />
      <p className="lovo-board-hint">Select a tile to explore its details.</p>
    </div>

    <aside className="lovo-setup">
      <div className="lovo-setup-heading"><Dice5 size={20} /><h3>{creating ? 'Make yourselves at home' : 'Your match'}</h3>{!creating && <span className="lovo-mode-badge">{game.mode === 'quick' ? `Quick · ${game.roundLimit} rounds` : 'Classic'}</span>}</div>
      {creating ? <>
        <p>One starts. The other joins. No time limits.</p>
        <fieldset className="lovo-mode-picker" disabled={!!busy}><legend>Game mode</legend><label><input type="radio" name="lovopoly-mode" value="classic" checked={mode === 'classic'} onChange={() => setMode('classic')} /><span><strong>Classic</strong><small>Play until one player remains.</small></span></label><label><input type="radio" name="lovopoly-mode" value="quick" checked={mode === 'quick'} onChange={() => setMode('quick')} /><span><strong>Quick</strong><small>A set number of rounds.</small></span></label></fieldset>
        {mode === 'quick' && <label className="lovo-rounds">Number of rounds<select value={roundLimit} onChange={event => setRoundLimit(Number(event.target.value))} disabled={!!busy}>{QUICK_ROUNDS.map(rounds => <option key={rounds} value={rounds}>{rounds} rounds</option>)}</select></label>}
        <TokenPicker value={token} players={[]} userId={currentUser?.id} disabled={!!busy} color={color} onChange={selectToken} />
        <button type="button" className="lovo-button lovo-primary" disabled={!!busy || !currentUser?.id} onClick={() => act('create', { mode, roundLimit, token, tokenColor: color })}>Save match setup <Heart size={15} /></button>
      </> : <>
        {joining && <><p>{players[0]?.name} saved a place for you. Choose your token to accept these match settings.</p><TokenPicker value={chosenToken} players={players} userId={currentUser?.id} disabled={!!busy} color={color} onChange={selectToken} /><button type="button" className="lovo-button lovo-primary" disabled={!!busy || !currentUser?.id} onClick={() => act('join', { token: chosenToken, tokenColor: color })}>Join setup</button></>}
        {!me && !joining && <p>This saved setup already has two players. You can still explore the board.</p>}
        {me && ['setup', 'opening'].includes(game.status) && !openingRoll && <TokenPicker value={me.token} players={players} userId={currentUser?.id} disabled={!!busy} color={me.tokenColor || 'Blush'} onChange={(selected, shade) => { if (selected !== me.token || shade !== (me.tokenColor || 'Blush')) act('token', { token: selected, tokenColor: shade }); }} />}
        {me && game.status === 'setup' && <div className="lovo-waiting"><img src="/lovopoly/love-envelope.svg" alt="" /><p>Your person can join here when they return.</p></div>}
        {me && game.status === 'opening' && <div className="lovo-opening">
          <h4>Who makes the first move?</h4><p>Each player rolls two dice. Highest total starts; ties roll again. These rolls do not move your tokens.</p>
          {game.openingRound > 1 && <p className="lovo-tie">Last round was a tie. Opening round {game.openingRound}.</p>}
          <button type="button" className="lovo-button lovo-primary" disabled={!!busy || !!openingRoll} onClick={() => act('opening-roll')}><Dice5 size={17} />{openingRoll ? 'Opening roll saved' : 'Roll to choose first player'}</button>
        </div>}
        {me && ['ready', 'playing', 'finished'].includes(game.status) && <div className="lovo-turn">
          <LovopolyNetWorth game={game} userId={me.id} />
          <div className="lovo-main-action">
          {game.status !== 'finished' && game.turn === me.id && !game.debt && <>
            {(!game.phase || game.phase === 'roll') && <button className="lovo-button lovo-primary" disabled={!!busy} onClick={() => me.detained ? openDetention() : act('roll')}>{me.detained ? 'Choose an escape' : 'Roll dice'}</button>}
            {game.phase === 'purchase' && <><button className="lovo-button lovo-primary" disabled={!!busy || me.cash < LOVOPOLY_TILES[me.position].price} onClick={() => act('buy')}>Buy property</button><button className="lovo-button" disabled={!!busy} onClick={() => act('pass')}>Pass</button></>}
            {game.phase === 'end' && <button className="lovo-button lovo-primary" disabled={!!busy} onClick={() => act('end-turn')}>{game.extraRoll ? 'Continue · doubles bonus roll' : 'End turn'}</button>}
          </>}
<p role="status">{game.status === 'finished' ? 'Match complete' : game.debt ? 'Resolve the outstanding debt to continue.' : game.turn !== me.id ? `Waiting for ${game.players[game.turn]?.name || 'your person'} to play` : game.phase === 'purchase' ? `Buy ${LOVOPOLY_TILES[me.position].name} for ${LOVOPOLY_TILES[me.position].price}, or pass.` : game.phase === 'detention-release' ? 'Open escape options to pay or use a card.' : game.phase === 'end' ? game.extraRoll ? 'Doubles! Take your bonus roll.' : 'Finish your turn and pass the dice.' : me.detained ? 'Choose a challenge, pay $50, use a card, or try doubles.' : 'Roll to move across the board'}</p>
          </div>
          <LovopolyDebt game={game} me={me} act={act} busy={!!busy} />
          {game.turn===me.id && ['ready','playing'].includes(game.status) && <div className="lovo-heart-actions"><p>❤️ {me.hearts || 0} hearts · Earn hearts by answering cards in the Romantic Inbox.</p>
            {game.reroll?.playerId===me.id && game.reroll.revision===game.revision && <button className="lovo-button" disabled={!!busy || (me.hearts || 0)<2} onClick={()=>act('heart-reroll')}>Reroll · 2 ❤️</button>}
            {me.detained && ['roll','detention-release'].includes(game.phase || 'roll') && <button className="lovo-button" disabled={!!busy || (me.hearts || 0)<3} onClick={()=>act('heart-escape')}>Escape detention · 3 ❤️</button>}
            {game.lastRent?.payerId===me.id && !game.lastRent.covered && ['paid','owed'].includes(game.lastRent.status) && <button className="lovo-button" disabled={!!busy || (me.hearts || 0)<4} onClick={()=>act('heart-rent')}>Cover up to $100 rent · 4 ❤️</button>}
          </div>}
          {(game.lastDice || busy === 'roll') && <Dice values={game.lastDice} rolling={busy === 'roll'} />}
          {game.result && <p>{game.result}</p>}
          {game.status==='finished' && <div className="lovo-rematch"><h4>Play again?</h4><p>A fresh board · $1,500 each. Your previous result is saved.</p><button className="lovo-button lovo-primary" disabled={!!busy} onClick={()=>act('new-game')}>Start a new game</button></div>}
          {game.status !== 'finished' && me.detained && <div className="lovo-detention-notice"><span>Kiss Detention · {me.detentionAttempts || 0}/3 attempts</span><button className="lovo-button" disabled={!!busy} onClick={openDetention}>View escape options</button></div>}
          <div className="lovo-match-tabs" role="tablist" aria-label="Match details">{['Properties','Trade','History','Rules'].map((tab,index) => <button key={tab} id={`lovo-tab-${tab}`} type="button" role="tab" aria-selected={matchTab===tab} aria-controls="lovo-match-panel" tabIndex={matchTab===tab?0:-1} onClick={()=>setMatchTab(tab)} onKeyDown={event=>{const tabs=['Properties','Trade','History','Rules'];const next=event.key==='ArrowRight'?(index+1)%4:event.key==='ArrowLeft'?(index+3)%4:event.key==='Home'?0:event.key==='End'?3:null;if(next!==null){event.preventDefault();setMatchTab(tabs[next]);event.currentTarget.parentElement.children[next].focus();}}}>{tab}{tab==='Trade' && Object.values(game.trades || {}).some(t=>t.status==='pending') ? ' •' : ''}</button>)}</div>
          <div className="lovo-match-content">
            <div role="tabpanel" id="lovo-match-panel" aria-labelledby={`lovo-tab-${matchTab}`} tabIndex={0}>
              <LovopolyEconomy game={game} me={me} act={act} busy={!!busy} tab={matchTab} onDeed={setSelectedTile} onTrade={()=>setMatchTab('Trade')} error={error} />
              {matchTab==='History' && <><h4>Match history</h4>{game.lastLanding && <button className="lovo-button" onClick={()=>{setLandingCard(game.lastLanding);setLandingOpen(true);}}>View last landing</button>}{!events.length && <p>No moves yet.</p>}<ol className="lovo-match-history">{events.map(event=><li key={event.id}><p>{event.text}</p><time dateTime={new Date(event.at).toISOString()}>{new Date(event.at).toLocaleString()}</time></li>)}</ol>{Object.values(game.archives || {}).filter(match=>match.status==='finished' && match.id!==game.id).map(match=><p key={match.id}>{match.result}</p>)}</>}
              {matchTab==='Rules' && <><h4>Rules & current limits</h4><ul className="lovo-match-rules"><li>Complete a color group for double rent. Doubles grant another roll; three consecutive doubles send you to Kiss Detention.</li><li>Mortgage for 50%, repay principal plus 10%.</li><li>Mortgaged properties collect no rent.</li><li>Build and sell evenly; sales return half the building cost.</li><li>Trades and gifts require acceptance and remain pending.</li><li>Quick mode counts both players’ completed turns, including bonus rolls, and compares cash, property value (half when mortgaged), and building cost.</li><li>No auctions.</li><li>Each deck has 60 cards drawn without repeats until cycling; kept cards return when used.</li><li>Submit a romance response (or lighter alternative) for 1 heart; your person may add 1 bonus heart. Spend 2 to replace your last roll and its landing before taking another action, 3 to escape detention, or 4 to cover up to $100 of current rent. Hearts reset each match and do not count toward net worth. Invitations never block turns.</li><li>Kiss Detention allows three doubles attempts.</li><li>Pay or use a card before rolling for a normal turn; doubles escape or third-attempt release uses that roll without a bonus.</li></ul></>}
            </div>
          </div>
        </div>}
        {me && game.status !== 'finished' && <LovopolyLeave game={game} me={me} act={act} busy={!!busy} error={error} />}
      </>}
    </aside></div>

    <LovopolyInbox game={game} userId={currentUser?.id} act={act} busy={!!busy}/>
    {landingOpen && !detentionOpen && !(me?.detained && (landingCard || game?.lastLanding)?.playerId===me.id) && (landingCard || game?.lastLanding) && <LovopolyLanding key={(landingCard || game.lastLanding).id} error={error} game={game} landing={landingCard || game.lastLanding} userId={currentUser?.id} act={act} busy={!!busy} onClose={closeLanding} onDeed={tile=>{closeLanding();setSelectedTile(tile);}}/>}
    {detentionOpen && <LovopolyDetention game={game} me={me} act={act} busy={!!busy} error={error} onClose={()=>setDetentionOpen(false)} onManage={()=>{setDetentionOpen(false);setMatchTab('Properties');}}/>}
    {confirmation && <LovopolyConfirm game={game} user={currentUser} request={confirmation} busy={!!busy} error={error} onClose={()=>setConfirmation(null)} onConfirm={async()=>{if(await act(confirmation.type,confirmation.extra,true))setConfirmation(null);}}/>}
    {exploreTile && <LovopolyLanding key={`explore:${exploreTile.id}`} game={game || {players:{}}} exploreTile={exploreTile} onClose={()=>setExploreTile(null)} onDeed={tile=>{setExploreTile(null);setSelectedTile(tile);}}/>}
    {selectedTile && (selectedTile.price ? <LovopolyDeed key={selectedTile.id} tile={selectedTile} game={game} userId={currentUser?.id} act={act} busy={!!busy} onClose={()=>setSelectedTile(null)} /> : <TileDetails key={selectedTile.id} tile={selectedTile} game={game} onClose={() => setSelectedTile(null)} />)}
  </section>;
}

