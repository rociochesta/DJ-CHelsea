import {completedGroups} from '../utils/lovopolyVisuals';
import LovopolyConfirm from './LovopolyConfirm';
import {propertyRent} from '../utils/lovopolyLanding';
import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Dice5, Heart, Minus, Plus, X } from 'lucide-react';
import { LOVOPOLY_GROUPS, LOVOPOLY_TILES, LOVOPOLY_TOKENS, lovopolyTileLayout } from '../utils/lovopolyBoard';
import { QUICK_ROUNDS } from '../utils/lovopoly';
import './Lovopoly.css';
import LovopolyEconomy, { LovopolyNetWorth } from './LovopolyEconomy';
import LovopolyLanding from './LovopolyLanding';
import LovopolyInbox from './LovopolyInbox';
import LovopolyEscapeChoices from './LovopolyEscapeChoices';

const tokenById = id => LOVOPOLY_TOKENS.find(token => token.id === id) || LOVOPOLY_TOKENS[0];
const diceFaces = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
const typeLabels = { go: 'Starting corner', property: 'Property', station: 'Station', utility: 'Utility', chance: 'Love or Disaster', community: 'From Me to You', tax: 'Tax', detention: 'Kiss Detention / Just visiting', rest: 'Free parking corner', 'go-to-detention': 'Go to Kiss Detention' };

function TokenPicker({ value, players, userId, disabled, onChange }) {
  return <fieldset className="lovo-token-picker" disabled={disabled}>
    <legend>Choose your token</legend>
    <div>{LOVOPOLY_TOKENS.map(token => {
      const taken = players.some(player => player.id !== userId && player.token === token.id);
      return <button type="button" key={token.id} onClick={() => onChange(token.id)}
        aria-pressed={value === token.id} aria-label={`${token.name}${taken ? ' · taken' : ''}`}
        disabled={taken || disabled} title={taken ? `${token.name} is taken` : token.name}>
        <span aria-hidden="true">{token.symbol}</span><small>{token.name}</small>
      </button>;
    })}</div>
  </fieldset>;
}

function Dice({ values, rolling = false }) {
  return <span className={`lovo-dice ${rolling ? 'lovo-dice-rolling' : ''}`} role="img" aria-label={values ? `Dice: ${values.join(' and ')}` : 'Not rolled yet'}>
    {(values || [null, null]).map((value, index) => <span key={index} aria-hidden="true">{value ? diceFaces[value - 1] : '·'}</span>)}
  </span>;
}

function TileDetails({ tile, game, onClose }) {
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

export function LovopolyBoard({ players = [], onSelect, showNumbers = false, zoom = 1, turn, game }) {
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
      <div className="lovo-board-center" aria-hidden="true"><Heart className="lovo-center-heart" fill="currentColor" /><h3>LOVOPOLY</h3><p>A little love.<br />A little rivalry.</p><span>40 places to fall for you.</span></div>
      {celebration && <div className="lovo-monopoly-celebration" role="status">👑 Monopoly!<br/>{celebration}</div>}
      {LOVOPOLY_TILES.map(tile => {
        const { x, y, w, h, rotation } = lovopolyTileLayout(tile.id);
        const owner=game?.players?.[game?.owners?.[tile.id]],level=game?.buildings?.[tile.id] || 0,mortgaged=game?.mortgages?.[tile.id];
        const complete=!!monopolies[tile.group];
        const occupants = players.filter(player => player.position === tile.id);
        return <button type="button" key={tile.id} className={`lovo-tile ${w > h ? 'lovo-tile-side' : ''} ${complete?'lovo-monopoly-tile':''}`} data-monopoly={complete || undefined}
          style={{ '--monopoly-color':LOVOPOLY_GROUPS[tile.group]?.color, left: `${x / 12.5}%`, top: `${y / 12.5}%`, width: `${w / 12.5}%`, height: `${h / 12.5}%` }}
          onClick={() => onSelect(tile)} aria-label={`Space ${tile.id}: ${tile.name}${owner?`. Owned by ${owner.name}`:''}${level?`. ${level===5?'Love Castle':`${level} Love Nests`}`:''}${mortgaged?'. Mortgaged, no rent':''}${complete?'. Complete monopoly':''}${occupants.length ? `. ${occupants.map(player => player.name).join(' and ')} here` : ''}`}>
          <img src={tile.thumbnail} style={{ transform: `rotate(${rotation}deg)` }} alt="" draggable="false" />
          <span className="lovo-tile-number" aria-hidden="true">{tile.id}</span>
          {owner && <span className="lovo-owner-badge" title={`Owner: ${owner.name}`} aria-hidden="true">{tokenById(owner.token).symbol}</span>}
          {level>0 && <span className="lovo-building-badge" title={level===5?'Love Castle':`${level} Love Nests`} aria-hidden="true">{level===5?'🏰':`🏠×${level}`}</span>}
          {mortgaged && <span className="lovo-mortgage-badge" title="Mortgaged — No Rent Collected" aria-hidden="true">🏦</span>}
          {occupants.length > 0 && <span className="lovo-board-tokens">{occupants.map(player => <span className={player.id===turn?"lovo-token-active":""} key={player.id} title={player.name} style={{ borderColor: tokenById(player.token).color }} aria-hidden="true">{tokenById(player.token).symbol}</span>)}</span>}
        </button>;
      })}
    </div>
  </div>;
}

// This view is independent of Firebase, so it can also be exercised locally with
// two clients and the exact production reducer rather than writing test rooms.
export default function LovopolyGame({ currentUser, game, onAction, onClose }) {
  const [confirmation,setConfirmation]=useState(null);
  const [mode, setMode] = useState('classic');
  const [roundLimit, setRoundLimit] = useState(20);
  const [token, setToken] = useState('heart');
  const [selectedTile, setSelectedTile] = useState(null);
  const [landingOpen,setLandingOpen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [showNumbers, setShowNumbers] = useState(false);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [confirmSurrender, setConfirmSurrender] = useState(false);
  const lock = useRef(false);
  const players = Object.values(game?.players || {});
  const me = game?.players?.[currentUser?.id];
  const cancelled = game?.status === 'cancelled';
  const creating = !game || cancelled;
  const joining = game?.status === 'setup' && !me;
  const openingRoll = game?.openingRolls?.[currentUser?.id];
  const available = LOVOPOLY_TOKENS.filter(item => !players.some(player => player.id !== currentUser?.id && player.token === item.id));
  const chosenToken = creating ? token : available.some(item => item.id === token) ? token : available[0]?.id;
  const events = Object.values(game?.events || {}).sort((a, b) => b.at - a.at);
  useEffect(()=>{
    setLandingOpen(false);
    if(!game?.lastLanding || game.lastLanding.playerId!==currentUser?.id || game.status!=='playing')return;
    const key=`lovo-landing:${game.id}:${currentUser.id}`;
    let seen=null;try{seen=sessionStorage.getItem(key);}catch{}
    if(seen!==game.lastLanding.id){setSelectedTile(null);setLandingOpen(true);}
  },[game?.id,game?.lastLanding?.id,currentUser?.id,game?.status]);
  const closeLanding=()=>{setLandingOpen(false);try{sessionStorage.setItem(`lovo-landing:${game.id}:${currentUser.id}`,game.lastLanding.id);}catch{}};

  useEffect(() => { setError(''); setConfirmCancel(false); setConfirmSurrender(false); }, [game?.id, currentUser?.id, game?.status]);

  async function act(type, extra = {}, confirmed=false) {
    if(!confirmed && ['buy','mortgage','unmortgage','build','sell-building','trade-offer','trade-accept'].includes(type)){setConfirmation({type,extra,revision:game.revision,gameId:game.id,userId:currentUser.id});return false;}
    if(confirmed && (confirmation.revision!==game.revision || confirmation.gameId!==game.id || confirmation.userId!==currentUser.id)){setConfirmation(null);setError('The match changed. Review the action again.');return false;}
    if (lock.current) return;
    lock.current = true; setBusy(type); setError('');
    try { await onAction(type, extra); setConfirmCancel(false); setConfirmSurrender(false); return true; }
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
    {me && game.turn===me.id && ['ready','playing'].includes(game.status) && <div className="lovo-turn-banner" key={`${game.id}:${game.completedTurns}`} role="status"><strong>Your turn, beautiful! 💋</strong><p>{game.lastTurnSummary?.playerId!==me.id && game.lastTurnSummary?.text || 'Your dice are ready.'}</p></div>}
    <p className="lovo-preview-note">Roll, buy your favorite places, and collect rent. Progress is saved after every action.</p>
    {error && <p className="lovo-error" role="alert">{error}</p>}

    {players.length > 0 && !cancelled && <div className="lovo-players">{players.map(player => <article key={player.id} className={player.id === game.turn ? 'lovo-player lovo-player-first' : 'lovo-player'}>
      <span className="lovo-player-token" style={{ color: tokenById(player.token).color }}>{tokenById(player.token).symbol}</span>
      <div><h3>{player.name}{player.id === currentUser?.id && <small> You</small>}</h3><p>${player.cash.toLocaleString()} <span>· {LOVOPOLY_TILES[player.position].name}</span></p></div>
      {game.status !== 'setup' && <div className="lovo-player-roll"><Dice values={game.openingRolls?.[player.id]?.dice} rolling={busy === 'opening-roll' && player.id === currentUser?.id} /><small>{game.firstPlayerId === player.id ? 'Goes first' : game.openingRolls?.[player.id] ? `Total ${game.openingRolls[player.id].total}` : 'Opening roll'}</small></div>}
    </article>)}{players.length === 1 && <div className="lovo-player lovo-player-empty"><Heart size={24} /><span>A place for your person.<small>They can join from this room whenever they return.</small></span></div>}</div>}

    {game?.lastRent && !cancelled && game.status !== 'finished' && <div className="lovo-rent-notice" role="status"><strong>{game.lastRent.status === 'paid' ? 'Rent paid automatically' : game.lastRent.status === 'owed' ? 'Rent awaiting payment' : 'Rent resolved by bankruptcy'} · ${game.lastRent.amount}</strong><span>{game.players[game.lastRent.payerId]?.name} → {game.players[game.lastRent.ownerId]?.name} · {LOVOPOLY_TILES[game.lastRent.tileId]?.name}</span><small>{game.lastRent.status === 'paid' ? 'Both balances have already been updated.' : game.lastRent.status === 'owed' ? 'Not enough cash. Resolve the debt in Your match before continuing.' : 'Remaining assets were settled with the creditor.'}</small></div>}
    <div className="lovo-workspace"><div className="lovo-board-area"><div className="lovo-board-toolbar"><span>YOUR BOARD</span><div><button type="button" onClick={() => setZoom(value => Math.max(1, value - 0.5))} disabled={zoom <= 1} aria-label="Zoom out"><Minus size={15} /></button><button type="button" onClick={() => setZoom(1)} aria-label="Fit board">{Math.round(zoom * 100)}%</button><button type="button" onClick={() => setZoom(value => Math.min(3, value + 0.5))} disabled={zoom >= 3} aria-label="Zoom in"><Plus size={15} /></button><label><input type="checkbox" checked={showNumbers} onChange={event => setShowNumbers(event.target.checked)} /> Numbers</label></div></div>
      <LovopolyBoard game={cancelled?null:game} players={cancelled ? [] : players} turn={game?.turn} onSelect={setSelectedTile} zoom={zoom} showNumbers={showNumbers} />
      <p className="lovo-board-hint">Select a tile to see its artwork. Zoom in to explore the details.</p>
    </div>

    <aside className="lovo-setup">
      <div className="lovo-setup-heading"><Dice5 size={20} /><h3>{creating ? 'Make yourselves at home' : 'Your match'}</h3>{!creating && <span className="lovo-mode-badge">{game.mode === 'quick' ? `Quick · ${game.roundLimit} rounds` : 'Classic'}</span>}</div>
      {creating ? <>
        <p>One starts. The other joins. No time limits.</p>
        <fieldset className="lovo-mode-picker" disabled={!!busy}><legend>Game mode</legend><label><input type="radio" name="lovopoly-mode" value="classic" checked={mode === 'classic'} onChange={() => setMode('classic')} /><span><strong>Classic</strong><small>Play until one player remains.</small></span></label><label><input type="radio" name="lovopoly-mode" value="quick" checked={mode === 'quick'} onChange={() => setMode('quick')} /><span><strong>Quick</strong><small>A set number of rounds.</small></span></label></fieldset>
        {mode === 'quick' && <label className="lovo-rounds">Number of rounds<select value={roundLimit} onChange={event => setRoundLimit(Number(event.target.value))} disabled={!!busy}>{QUICK_ROUNDS.map(rounds => <option key={rounds} value={rounds}>{rounds} rounds</option>)}</select></label>}
        <TokenPicker value={token} players={[]} userId={currentUser?.id} disabled={!!busy} onChange={setToken} />
        <p className="lovo-setup-summary">$1,500 each · $200 for passing Hello, Beautiful.</p>
        <button type="button" className="lovo-button lovo-primary" disabled={!!busy || !currentUser?.id} onClick={() => act('create', { mode, roundLimit, token })}>Save match setup <Heart size={15} /></button>
      </> : <>
        {joining && <><p>{players[0]?.name} saved a place for you. Choose your token to accept these match settings.</p><TokenPicker value={chosenToken} players={players} userId={currentUser?.id} disabled={!!busy} onChange={setToken} /><button type="button" className="lovo-button lovo-primary" disabled={!!busy || !currentUser?.id} onClick={() => act('join', { token: chosenToken })}>Join setup</button></>}
        {!me && !joining && <p>This saved setup already has two players. You can still explore the board.</p>}
        {me && ['setup', 'opening'].includes(game.status) && !openingRoll && <TokenPicker value={me.token} players={players} userId={currentUser?.id} disabled={!!busy} onChange={selected => { if (selected !== me.token) act('token', { token: selected }); }} />}
        {me && game.status === 'setup' && <div className="lovo-waiting"><img src="/lovopoly/love-envelope.svg" alt="" /><p>Your person can join here when they return.</p></div>}
        {me && game.status === 'opening' && <div className="lovo-opening">
          <h4>Who makes the first move?</h4><p>Each player rolls two dice. Highest total starts; ties roll again. These rolls do not move your tokens.</p>
          {game.openingRound > 1 && <p className="lovo-tie">Last round was a tie. Opening round {game.openingRound}.</p>}
          <button type="button" className="lovo-button lovo-primary" disabled={!!busy || !!openingRoll} onClick={() => act('opening-roll')}><Dice5 size={17} />{openingRoll ? 'Opening roll saved' : 'Roll to choose first player'}</button>
        </div>}
        {me && ['ready', 'playing', 'finished'].includes(game.status) && <div className="lovo-turn">
          <div className={`lovo-turn-indicator${game.status !== 'finished' && game.turn === me.id ? ' lovo-turn-indicator-active' : ''}`} role="status">
            <span className="lovo-turn-dot" aria-hidden="true" />
            <span>{game.status === 'finished' ? 'Match complete' : game.turn === me.id ? 'Your turn' : `${game.players[game.turn]?.name || 'Your person'}’s turn`}</span>
          </div>
          <LovopolyNetWorth game={game} />
          {(game.lastDice || busy === 'roll') && <Dice values={game.lastDice} rolling={busy === 'roll'} />}
          {game.result && <p>{game.result}</p>}
          {game.status==='finished' && <div className="lovo-rematch"><h4>Play again?</h4><p>New match · {game.mode==='quick'?`Quick, ${game.roundLimit} rounds`:'Classic'} · $1,500 each · same tokens. The previous result and Romantic Inbox are saved. Both players must agree.</p>
            {!game.rematch ? <button className="lovo-button lovo-primary" disabled={!!busy} onClick={()=>act('rematch-request')}>Request rematch</button>
              : game.rematch.requestedBy===me.id ? <><p role="status">Waiting for your person to accept the rematch.</p><button className="lovo-button" disabled={!!busy} onClick={()=>act('rematch-withdraw')}>Withdraw rematch request</button></>
              : <><p>{game.players[game.rematch.requestedBy]?.name} wants to play again.</p><button className="lovo-button lovo-primary" disabled={!!busy} onClick={()=>act('rematch-accept')}>Accept rematch</button><button className="lovo-button" disabled={!!busy} onClick={()=>act('rematch-decline')}>Decline rematch</button></>}
          </div>}
          {game.status !== 'finished' && me.detained && <div className="lovo-detention"><h4>Kiss Detention</h4><p>Failed attempts: {me.detentionAttempts || 0}/3. Escape with doubles and move without a bonus roll. Pay $50 or use a card before rolling to take a normal turn.</p>
            {game.turn===me.id && ['roll','detention-release',undefined].includes(game.phase) && <>
              {game.phase==='detention-release' && <p>Release required. Your roll is saved: {game.detentionRoll?.dice.join(' + ')}. Pay or use a card, then move with that roll. If short of cash, raise money and pay the debt below.</p>}
              {!game.debt && <button className="lovo-button" disabled={!!busy || me.cash<50} onClick={()=>act('detention-pay')}>Pay $50 to leave</button>}
              {!!me.detentionCards && (!game.debt || game.debt.reason==='detention') && <button className="lovo-button" disabled={!!busy} onClick={()=>act('detention-card')}>Use detention card</button>}
            </>}
            <LovopolyEscapeChoices key={`${game.id}:${me.id}:${me.detentionId || 'legacy'}`} game={game} me={me} act={act} busy={!!busy}/>
          </div>}
          {game.status !== 'finished' && game.turn === me.id && !game.debt && <>
            {(!game.phase || game.phase === 'roll') && <button className="lovo-button lovo-primary" disabled={!!busy} onClick={() => act('roll')}>Roll dice</button>}
            {game.phase === 'purchase' && <><p>{LOVOPOLY_TILES[me.position].name} · $ {LOVOPOLY_TILES[me.position].price}</p><button className="lovo-button lovo-primary" disabled={!!busy || me.cash < LOVOPOLY_TILES[me.position].price} onClick={() => act('buy')}>Buy property</button><button className="lovo-button" disabled={!!busy} onClick={() => act('pass')}>Pass</button></>}
            {game.phase === 'end' && <button className="lovo-button lovo-primary" disabled={!!busy} onClick={() => act('end-turn')}>{game.extraRoll ? 'Continue · doubles bonus roll' : 'End turn'}</button>}
          </>}
          <LovopolyEconomy game={game} me={me} act={act} busy={!!busy} />
          {game.lastLanding && <button className="lovo-button" onClick={()=>setLandingOpen(true)}>View last landing</button>}
          <details><summary>Rules & current limits</summary><p>Mortgage for 50%, repay principal plus 10%. Mortgaged properties collect no rent. Build and sell evenly; sales return half the building cost. Trades and gifts require acceptance and remain pending. Quick mode counts both players’ completed turns, including bonus rolls, and compares cash, property value (half when mortgaged), and building cost. No auctions. Each deck has 30 cards drawn without repeats until cycling; kept cards return when used. Romantic invitations never affect money or block turns. Kiss Detention allows three doubles attempts. Pay or use a card before rolling for a normal turn; doubles escape or third-attempt release uses that roll without a bonus.</p></details>
        </div>}
        {me && players.length === 2 && ['opening', 'ready', 'playing'].includes(game.status) && <div className="lovo-cancel">
          {confirmSurrender ? <div role="group" aria-label="Confirm surrender"><p>This ends the match immediately. {players.find(player => player.id !== me.id)?.name} wins, and your surrender is saved in match history. You cannot undo this.</p><button type="button" className="lovo-button" disabled={!!busy} onClick={() => act('surrender')}>Confirm surrender</button><button type="button" className="lovo-text-button" disabled={!!busy} onClick={() => setConfirmSurrender(false)}>Keep playing</button></div>
            : <button type="button" className="lovo-text-button" disabled={!!busy} onClick={() => { setConfirmCancel(false); setConfirmSurrender(true); }}>Surrender</button>}
        </div>}
        {me && game.status !== 'finished' && !confirmSurrender && <div className="lovo-cancel">
          {game.cancellation ? <><p>{game.cancellation.requestedBy === me.id ? 'Your cancellation request is waiting for your person.' : `${game.players[game.cancellation.requestedBy]?.name || 'Your person'} asked to cancel this setup.`}</p>{game.cancellation.requestedBy !== me.id && <button type="button" className="lovo-button" disabled={!!busy} onClick={() => act('cancel-accept')}>Agree to cancel</button>}<button type="button" className="lovo-text-button" disabled={!!busy} onClick={() => act('cancel-decline')}>{game.cancellation.requestedBy === me.id ? 'Withdraw request' : 'Keep setup'}</button></>
            : confirmCancel ? <><p>{players.length === 1 ? 'Cancel this unjoined setup?' : 'Ask your person to cancel this setup? It stays saved until they agree.'}</p><button type="button" className="lovo-button" disabled={!!busy} onClick={() => act('cancel-request')}>{players.length === 1 ? 'Confirm cancellation' : 'Send cancellation request'}</button><button type="button" className="lovo-text-button" onClick={() => setConfirmCancel(false)}>Keep setup</button></>
            : <button type="button" className="lovo-text-button" disabled={!!busy} onClick={() => setConfirmCancel(true)}>Cancel setup</button>}
        </div>}
      </>}
    </aside></div>

    {!!events.length && <details className="lovo-activity"><summary>Match history <span>{events.length}</span></summary><ol>{events.map(event => <li key={event.id}><span>{event.text}</span><time dateTime={new Date(event.at).toISOString()}>{new Date(event.at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</time></li>)}</ol></details>}
    {Object.values(game?.archives || {}).some(match=>match.status==='finished' && match.id!==game.id) && <details className="lovo-activity"><summary>Previous matches</summary>{Object.values(game.archives).filter(match=>match.status==='finished' && match.id!==game.id).sort((a,b)=>(b.finishedAt || b.createdAt)-(a.finishedAt || a.createdAt)).map(match=><div key={match.id}><p><strong>{match.winner==='tie'?'Draw':`${match.players[match.winner]?.name} won`}</strong> · {new Date(match.finishedAt || match.createdAt).toLocaleDateString()}</p><p>{match.result}</p></div>)}</details>}
    <LovopolyInbox game={game} userId={currentUser?.id} act={act} busy={!!busy}/>
    {landingOpen && game?.lastLanding && <LovopolyLanding error={error} game={game} landing={game.lastLanding} userId={currentUser?.id} act={act} busy={!!busy} onClose={closeLanding} onDeed={tile=>{closeLanding();setSelectedTile(tile);}}/>}
    {confirmation && <LovopolyConfirm game={game} user={currentUser} request={confirmation} busy={!!busy} error={error} onClose={()=>setConfirmation(null)} onConfirm={async()=>{if(await act(confirmation.type,confirmation.extra,true))setConfirmation(null);}}/>}
    {selectedTile && <TileDetails key={selectedTile.id} tile={selectedTile} game={game} onClose={() => setSelectedTile(null)} />}
  </section>;
}
