import {useEffect,useState} from 'react';
import {validWallVideoUrl} from '../utils/wallVideo';
export default function WallVideo({url}){
  const [error,setError]=useState(false);
  useEffect(()=>setError(false),[url]);
  return error||!validWallVideoUrl(url)?<p role="status" className="rounded-xl bg-black/20 p-3 text-xs text-white/50">This clip could not play. Try uploading an MP4 encoded with H.264.</p>:<video controls playsInline preload="none" src={url} onError={()=>setError(true)} className="max-h-96 w-full rounded-xl bg-black/30" aria-label="Uploaded wall video"/>;
}
