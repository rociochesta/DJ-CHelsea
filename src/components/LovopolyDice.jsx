import {useEffect,useRef,useState} from 'react';
import {Heart} from 'lucide-react';
import {DICE_ROLL_MS,latestBoardRoll} from '../utils/lovopolyAnimation';
const pips={1:[4],2:[0,8],3:[0,4,8],4:[0,2,6,8],5:[0,2,4,6,8],6:[0,2,3,5,6,8]};
export default function LovopolyDice({game,rolling}) {
 const roll=latestBoardRoll(game);
 const signature=`${game?.id || ''}:${roll?.id || ''}`;
 const previous=useRef(signature);
 const [animating,setAnimating]=useState(false);
 const [frame,setFrame]=useState(0);
 useEffect(()=>{
   if(previous.current===signature)return;
   previous.current=signature;
   if(!roll)return;
   setAnimating(true);
   const timer=setTimeout(()=>setAnimating(false),window.matchMedia('(prefers-reduced-motion: reduce)').matches?0:DICE_ROLL_MS);
   return()=>clearTimeout(timer);
 },[signature]);
 const spinning=animating || rolling;
 useEffect(()=>{if(!spinning)return;const interval=setInterval(()=>setFrame(value=>value+1),95);return()=>clearInterval(interval);},[spinning]);
 const values=game?.lastDice;
 const total=values?.reduce((a,b)=>a+b,0);
 const text=roll?.text || '';
 let message=values?`Move ${total} spaces`:'Your next move starts here';
 let detail='';
 if(/Three consecutive doubles/.test(text))message='Three doubles · Kiss Detention!';
 else if(/Go to Kiss Detention|go to Kiss Detention/.test(text) || (roll && game?.players?.[roll.userId]?.detained && /Sent to|detention/i.test(text) && !/attempt|escape/i.test(text)))message='Go to Kiss Detention!';
 else if(/Third failed escape/.test(text))message='Pay or use a card to move';
 else if(/Remain detained/.test(text))message='No doubles · stay in Kiss Detention';
 else if(/Escaped Kiss Detention/.test(text))detail='You escaped!';
 else if(values?.[0]===values?.[1])detail='Doubles! Roll again after this move.';
 return <div className="lovo-board-dice" aria-label="Board dice">
   <div className={`lovo-heart-dice${spinning?' is-rolling':''}`} aria-hidden="true">{[0,1].map(index=>{
     const value=spinning?(frame+index*2)%6+1:values?.[index];
     return <div className="lovo-heart-die" key={index}>{Array.from({length:9},(_,cell)=><span key={cell}>{(pips[value] || [4]).includes(cell) && <Heart fill="currentColor" strokeWidth={0}/>}</span>)}</div>;
   })}</div>
   <div className="lovo-dice-message" role="status" aria-live="polite"><strong>{spinning?'Rolling…':message}</strong>{!spinning && values && <span>{values[0]} + {values[1]} = {total}{detail?` · ${detail}`:''}</span>}</div>
 </div>;
}
