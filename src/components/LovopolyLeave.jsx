import {useEffect, useRef, useState} from 'react';

export default function LovopolyLeave({game, me, act, busy, error}) {
  const [open,setOpen]=useState(false);
  const [choice,setChoice]=useState('');
  const dialog=useRef(null);
  const players=Object.values(game.players);
  const canSurrender=players.length===2 && ['opening','ready','playing'].includes(game.status);
  useEffect(()=>{if(open)dialog.current?.showModal();},[open]);
  useEffect(()=>{setOpen(false);setChoice('');},[game.id,me.id,game.status]);
  const close=()=>{if(!busy){setOpen(false);setChoice('');}};
  const submit=async type=>{if(await act(type)){setOpen(false);setChoice('');}};
  return <footer className="lovo-leave-footer">
    <button type="button" className="lovo-text-button" onClick={()=>setOpen(true)}>Leave match <span aria-hidden="true">↗</span></button>
    {game.cancellation && <button className="lovo-text-button" onClick={()=>{setChoice('cancel');setOpen(true);}}>Cancellation pending</button>}
    {open && <dialog ref={dialog} className="lovo-dialog lovo-leave-dialog" aria-labelledby="lovo-leave-title" onCancel={event=>{event.preventDefault();close();}}>
      <h3 id="lovo-leave-title">{choice==='surrender'?'Surrender match':choice==='cancel'?'Cancel setup':'Leave match'}</h3>
      {!choice && <><p>Choose how you want to leave this match.</p><div className="lovo-leave-options">{canSurrender && <button className="lovo-button" disabled={busy} onClick={()=>setChoice('surrender')}>Surrender</button>}<button className="lovo-button" disabled={busy} onClick={()=>setChoice('cancel')}>Cancel setup</button></div></>}
      {choice==='surrender' && <><p>This ends the match immediately. {players.find(p=>p.id!==me.id)?.name} wins. This cannot be undone.</p><button className="lovo-button" disabled={busy} onClick={()=>submit('surrender')}>Confirm surrender</button></>}
      {choice==='cancel' && (game.cancellation ? <><p>{game.cancellation.requestedBy===me.id?'Your cancellation request is waiting for your person.':`${game.players[game.cancellation.requestedBy]?.name || 'Your person'} asked to cancel this setup.`}</p>{game.cancellation.requestedBy!==me.id && <button className="lovo-button" disabled={busy} onClick={()=>submit('cancel-accept')}>Agree to cancel</button>}<button className="lovo-button" disabled={busy} onClick={()=>submit('cancel-decline')}>{game.cancellation.requestedBy===me.id?'Withdraw request':'Keep setup'}</button></> : <><p>{players.length===1?'Cancel this unjoined setup?':'Ask your person to cancel this setup? It stays saved until they agree.'}</p><button className="lovo-button" disabled={busy} onClick={()=>submit('cancel-request')}>{players.length===1?'Confirm cancellation':'Send cancellation request'}</button></>)}
      {error && <p role="alert">{error}</p>}
      <button className="lovo-button" disabled={busy} onClick={close}>Keep playing</button>
    </dialog>}
  </footer>;
}
