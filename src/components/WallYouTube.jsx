import { useEffect,useMemo,useState } from 'react';
import YouTube from 'react-youtube';
import { Play } from 'lucide-react';

export default function WallYouTube({videoId}) {
  const [opened,setOpened]=useState(false),[error,setError]=useState(null),[attempt,setAttempt]=useState(0);
  useEffect(()=>{setOpened(false);setError(null);setAttempt(0);},[videoId]);
  const options=useMemo(()=>({width:'100%',height:'100%',playerVars:{origin:window.location.origin,autoplay:1,playsinline:1}}),[]);
  if(!/^[A-Za-z0-9_-]{11}$/.test(videoId||''))return <p className="text-sm text-white/50">This video link is invalid.</p>;
  return <div className="space-y-2">
    <div className="wall-youtube overflow-hidden rounded-xl border border-white/10 bg-black/30">
      {!opened?<button type="button" onClick={()=>setOpened(true)} aria-label="Play wall video" className="relative flex h-full min-h-[200px] w-full items-center justify-center"><img src={`https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`} alt="YouTube video preview" loading="lazy" className="absolute inset-0 h-full w-full object-cover"/><span className="absolute inset-0 bg-black/20"/><span className="fortune-start relative rounded-full p-3"><Play className="h-6 w-6"/></span></button>:error?<div className="flex min-h-[200px] flex-col items-center justify-center gap-3 p-4 text-center"><p className="text-xs text-white/55">{[101,150].includes(error)?'This video does not allow embedded playback.':error===100?'This video is unavailable or private.':'YouTube could not play this video here.'}</p><button type="button" onClick={()=>{setError(null);setAttempt(value=>value+1);}} className="wall-attach">Retry video</button></div>:<YouTube key={`${videoId}:${attempt}`} videoId={videoId} opts={options} onError={event=>setError(event.data)} className="h-full w-full" iframeClassName="h-full w-full"/>}
    </div>
    <a href={`https://www.youtube.com/watch?v=${videoId}`} target="_blank" rel="noopener noreferrer" className="block text-xs text-white/50 hover:text-white">Open in YouTube ↗</a>
  </div>;
}
