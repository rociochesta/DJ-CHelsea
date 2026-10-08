import { useEffect,useRef,useState } from 'react';
import { Mic,Square } from 'lucide-react';
import { readFileData } from '../utils/revealPhoto';

export default function RevealVoiceReply({onSend}) {
  const [recording,setRecording]=useState(false),[audio,setAudio]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const recorder=useRef(null),stream=useRef(null),timer=useRef(null),mounted=useRef(true),lock=useRef(false);
  const release=()=>{clearTimeout(timer.current);stream.current?.getTracks().forEach(track=>track.stop());stream.current=null;};
  useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;if(recorder.current?.state==='recording')recorder.current.stop();release();};},[]);
  const stop=()=>{if(recorder.current?.state==='recording')recorder.current.stop();};
  const record=async()=>{
    if(lock.current)return;lock.current=true;setBusy(true);setError('');
    try{
      if(!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder)throw new Error('Voice recording is unavailable in this browser. You can send a text or photo instead.');
      const input=await navigator.mediaDevices.getUserMedia({audio:true});
      if(!mounted.current){input.getTracks().forEach(track=>track.stop());return;}
      stream.current=input;
      const mime=['audio/webm','audio/mp4','audio/ogg'].find(type=>MediaRecorder.isTypeSupported(type));
      const instance=new MediaRecorder(input,{...(mime?{mimeType:mime}:{}),audioBitsPerSecond:64000});recorder.current=instance;
      const chunks=[];instance.ondataavailable=event=>{if(event.data.size)chunks.push(event.data);};
      instance.onstop=async()=>{release();if(!mounted.current)return;setRecording(false);setBusy(true);try{const blob=new Blob(chunks,{type:instance.mimeType || 'audio/webm'});if(!blob.size)throw Error('Nothing was recorded.');const url=await readFileData(blob);if(mounted.current)setAudio(url);}catch{if(mounted.current)setError('Could not save that recording. Try again.');}finally{if(mounted.current)setBusy(false);}};
      instance.onerror=()=>{stop();release();if(mounted.current){setRecording(false);setError('The recording stopped. Try again.');}};
      instance.start();setAudio('');setRecording(true);timer.current=setTimeout(stop,30000);
    }catch(cause){release();if(mounted.current)setError(cause.name==='NotAllowedError'?'Microphone access was declined. You can send a text or photo instead.':cause.message || 'Could not start recording.');}
    finally{lock.current=false;if(mounted.current)setBusy(false);}
  };
  const send=async()=>{if(lock.current)return;lock.current=true;setBusy(true);setError('');try{await onSend([{type:'audio',url:audio}]);setAudio('');}catch(cause){setError(cause.message || 'Could not send your voice note.');}finally{lock.current=false;setBusy(false);}};
  return <div className="space-y-3"><div className="flex gap-2 flex-wrap">{recording?<button type="button" onClick={stop} className="inline-flex items-center gap-2 rounded-xl border border-violet-300/40 px-4 py-2 text-sm text-violet-200"><Square className="h-4 w-4"/>Stop recording</button>:<button type="button" disabled={busy} onClick={record} className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-4 py-2 text-sm disabled:opacity-40"><Mic className="h-4 w-4"/>Record a voice reply</button>}{recording&&<span role="status" className="self-center text-xs text-violet-300">Recording · Up to 30 seconds</span>}</div>{audio&&<div className="space-y-2"><audio controls src={audio} className="w-full"/><div className="flex gap-2"><button type="button" disabled={busy} onClick={send} className="rounded-xl border border-violet-300/30 px-4 py-2 text-sm text-violet-200 disabled:opacity-40">Send voice reply</button><button type="button" disabled={busy} onClick={()=>setAudio('')} className="rounded-xl border border-white/15 px-4 py-2 text-sm">Discard</button></div></div>}{error&&<p role="alert" className="text-sm text-red-300">{error}</p>}</div>;
}
