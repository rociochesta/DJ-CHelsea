import { useEffect, useState } from 'react';
import LovopolyGame from './LovopolyGame';
import { rollLovopolyDice, updateLovopoly } from '../utils/lovopoly';
const KEY = 'lovopoly-local-v1';
const users = [{id:'local-rocio',name:'Rocio'}, {id:'local-chelsea',name:'Chelsea'}];
export default function LovopolyLocal() {
  const [game,setGame] = useState(() => { try { return JSON.parse(localStorage.getItem(KEY)) } catch { return null } });
  const [user,setUser] = useState(users[0]);
  useEffect(() => { const sync = e => { if (e.key === KEY) { try { setGame(JSON.parse(e.newValue)); } catch {} } }; window.addEventListener('storage',sync); return () => window.removeEventListener('storage',sync); },[]);
  async function onAction(type,extra) {
    const save = () => {
      const stored = JSON.parse(localStorage.getItem(KEY));
      const next = updateLovopoly(stored, {...extra,type,user,id:crypto.randomUUID(),now:Date.now(),expectedGameId:game?.id || null,expectedRevision:game?.revision,...(['roll','opening-roll','dice-preview','heart-reroll'].includes(type) ? {dice:rollLovopolyDice()} : {})});
      localStorage.setItem(KEY,JSON.stringify(next)); setGame(next);
    };
    if (navigator.locks) await navigator.locks.request(KEY,save); else save();
  }
  return <main style={{maxWidth:1200,margin:'auto',padding:20}}><nav style={{display:'flex',gap:12,alignItems:'center',marginBottom:16,flexWrap:'wrap'}}><strong>Local play</strong><label>Play as <select aria-label="Play as" value={user.id} onChange={e=>setUser(users.find(u=>u.id===e.target.value))}>{users.map(u=><option key={u.id} value={u.id}>{u.name}</option>)}</select></label><span>Switch players to take turns. Saved in this browser.</span></nav><LovopolyGame currentUser={user} game={game} onAction={onAction} onClose={()=>{window.location.href='/'}} /></main>;
}
