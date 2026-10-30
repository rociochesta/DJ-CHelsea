import {useEffect,useState} from 'react';
import {LOVOPOLY_GROUPS} from '../utils/lovopolyBoard';
export default function LovopolyArtwork({tile,animate=false}){
 const [loadedImage,setLoadedImage]=useState(null);
 useEffect(()=>{
  if(!animate || loadedImage!==tile.image)return;
  if((tile.animations || []).some(a=>a.src.endsWith('/compiled-overlay.svg')))return;
  // Reinsert the overlay after each short scene; the source art stays still.
  if(window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  const timer=setInterval(()=>setCycle(value=>value+1),16000);
  return()=>clearInterval(timer);
 },[animate,loadedImage,tile.image]);
 const [cycle,setCycle]=useState(0);
 return <div className="lovo-place-art"><img className="lovo-place-base" src={tile.image} alt={tile.name} onLoad={()=>setLoadedImage(tile.image)}/>{tile.group && <span className="lovo-place-color" style={{background:LOVOPOLY_GROUPS[tile.group]?.color}}/>}{loadedImage===tile.image && animate && (tile.animations || []).map((animation,index)=><img key={`${animation.src}:${index}:${cycle}`} className="lovo-place-animation" src={`${animation.src}${animation.src.includes('?')?'&':'?'}replay=${cycle}`} alt="" style={animation.style}/>)}</div>;
}

