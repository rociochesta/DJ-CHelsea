export function playbackPosition(state,now=Date.now()){
  if(state?.isPlaying&&Number.isFinite(state.startTime))return Math.max(0,(now-state.startTime)/1000);
  return Number.isFinite(state?.pausedAtSeconds)?Math.max(0,state.pausedAtSeconds):0;
}
export function playerPlaybackUpdate(state,event,currentTime,now=Date.now()){
  if(!Number.isFinite(currentTime)||currentTime<0)return null;
  if(event===2 && state?.isPlaying)return {isPlaying:false,pausedAtSeconds:currentTime};
  if(event===1 && !state?.isPlaying)return {isPlaying:true,startTime:now-currentTime*1000,pausedAtSeconds:null};
  return null;
}
export function seekPlaybackUpdate(state,currentTime,now=Date.now()){
  if(!state?.isPlaying||!Number.isFinite(currentTime)||Math.abs(playbackPosition(state,now)-currentTime)<=3)return null;
  return {isPlaying:true,startTime:now-currentTime*1000,pausedAtSeconds:null};
}
