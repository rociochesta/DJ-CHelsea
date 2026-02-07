// utils/autoMicComp.js
import { startRttPinger } from "./latencyPing";
import { createDelayedMic, setDelayMs } from "./delayedMic";

export async function enableAutoMicComp(room, opts = {}) {
  const safetyMargin = opts.safetyMargin ?? 60;  // ms
  const maxDelay = opts.maxDelay ?? 250;         // ms
  const alpha = opts.alpha ?? 0.2;               // smoothing

  if (!room) return () => {};

  // 1) Create processed mic
  const { ctx, delayNode, rawStream, processedTrack } = await createDelayedMic({
    initialDelayMs: safetyMargin,
  });

  // 2) Publish processed track (important: don't publish default mic in parallel)
  const pub = await room.localParticipant.publishTrack(processedTrack, {
    name: "mic-delayed",
  });

  // 3) RTT loop + smoothing
  let smoothOneWay = 0;

  const stopPing = startRttPinger(room, (rttMs) => {
    const oneWay = rttMs / 2;

    smoothOneWay = smoothOneWay
      ? smoothOneWay * (1 - alpha) + oneWay * alpha
      : oneWay;

    const target = Math.min(maxDelay, Math.max(0, smoothOneWay + safetyMargin));
    setDelayMs(delayNode, target);
  });

  // cleanup
  return async () => {
    try { stopPing?.(); } catch {}
    try { pub?.track?.stop?.(); } catch {}
    try { rawStream?.getTracks?.().forEach((t) => t.stop()); } catch {}
    try { await ctx?.close?.(); } catch {}
  };
}