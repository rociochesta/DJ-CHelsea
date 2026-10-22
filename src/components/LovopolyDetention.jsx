import {useEffect,useRef} from 'react';
import {X,Dice5,Heart,Wallet,CreditCard} from 'lucide-react';
import LovopolyEscapeChoices from './LovopolyEscapeChoices';

export default function LovopolyDetention({game,me,act,busy,error,onClose,onManage}) {
  const dialog=useRef(null);
  useEffect(()=>{const element=dialog.current;element.showModal();return ()=>element.close();},[]);
  const detained=!!me?.detained;
  const active=['ready','playing'].includes(game?.status);
  const myTurn=active && game.turn===me?.id;
  const phase=game?.phase || 'roll';
  const canRelease=detained && myTurn && ['roll','detention-release'].includes(phase);
  const canCard=canRelease && !!me.detentionCards && (!game.debt || game.debt.reason==='detention');
  const canPay=canRelease && !game.debt && me.cash>=50;
  const close=()=>{if(!busy)onClose();};
  return <dialog ref={dialog} className="lovo-dialog lovo-detention-dialog" aria-labelledby="lovo-detention-title" onCancel={event=>{event.preventDefault();close();}}>
    <header className="lovo-detail-header"><div><small>TAKE A LITTLE BREAK</small><h3 id="lovo-detention-title">Kiss Detention</h3></div><button type="button" aria-label="Close Kiss Detention" disabled={busy} onClick={close}><X size={20}/></button></header>
    {!detained ? <><p>You’re just visiting. Landing on Kiss Detention normally does not detain you.</p><p>You are detained only when sent here by a space or card, or after three consecutive doubles.</p></> : <>
      <p role="status">{!myTurn ? `Waiting for ${game.players[game.turn]?.name || 'your person'}. You can choose a challenge now; pay or roll on your turn.` : phase==='end' ? 'You remain detained. Choose a challenge or end your turn; pay or roll on your next turn.' : phase==='detention-release' ? `Three attempts used. Pay or use a card to move with your saved roll (${game.detentionRoll?.dice?.join(' + ') || 'saved'}).` : 'Choose how you want to escape.'}</p>
      <div className="lovo-detention-options">
        <section><h4><Dice5 size={18}/> Roll doubles</h4><p>Failed attempts: {me.detentionAttempts || 0}/3. Doubles free you and move your token, without a bonus roll.</p><button className="lovo-button lovo-primary" disabled={busy || !myTurn || phase!=='roll' || !!game.debt} onClick={()=>act('roll')}>Roll to escape</button></section>
        <section><h4><Wallet size={18}/> Pay $50</h4><p>Pay before rolling to take a normal turn. After the third failure, move using the saved roll.</p><button className="lovo-button" disabled={busy || !canPay} onClick={()=>act('detention-pay')}>Pay $50 to leave</button>{me.cash<50 && <small>You need $50. Manage properties or trade to raise cash.</small>}</section>
        <section><h4><CreditCard size={18}/> Escape card</h4><p>{me.detentionCards || 0} available. Use one instead of paying.</p><button className="lovo-button" disabled={busy || !canCard} onClick={()=>act('detention-card')}>Use detention card</button></section>
      </div>
      {game.debt?.playerId===me.id && <div className="lovo-debt"><p>Outstanding debt: ${game.debt.amount}. Raise cash through Properties or Trade, then use Pay debt in the match panel.</p><button className="lovo-button" disabled={busy} onClick={onManage}>Manage properties</button></div>}
      {active && <section className="lovo-detention-challenges"><h4><Heart size={18}/> Challenge escape</h4><LovopolyEscapeChoices key={`${game.id}:${me.id}:${me.detentionId || 'legacy'}`} game={game} me={me} act={act} busy={busy}/></section>}
      {myTurn && phase==='end' && !game.debt && <button className="lovo-button lovo-primary" disabled={busy} onClick={async()=>{if(await act('end-turn'))onClose();}}>End turn</button>}
    </>}
    {error && <p role="alert" className="lovo-error">{error}</p>}
    <button className="lovo-button" disabled={busy} onClick={close}>Dismiss</button>
    {detained && <small className="lovo-detention-dismiss-note">Dismiss only closes this window. You remain detained and can reopen the options from your match panel.</small>}
  </dialog>;
}
