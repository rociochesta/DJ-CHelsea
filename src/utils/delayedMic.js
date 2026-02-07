// utils/delayedMic.js
export async function createDelayedMic({ initialDelayMs = 0 } = {}) {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  const ctx = new AudioCtx();

  const src = ctx.createMediaStreamSource(stream);

  const delayNode = ctx.createDelay(1.0); // max 1s
  delayNode.delayTime.value = clamp(initialDelayMs / 1000, 0, 1);

  const dest = ctx.createMediaStreamDestination();
  src.connect(delayNode).connect(dest);

  const processedTrack = dest.stream.getAudioTracks()[0];

  return { ctx, delayNode, rawStream: stream, processedTrack };
}

export function setDelayMs(delayNode, ms) {
  const seconds = clamp(ms / 1000, 0, 1);
  const now = delayNode.context.currentTime;
  // smooth change to avoid clicks
  delayNode.delayTime.setTargetAtTime(seconds, now, 0.05);
}

function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}