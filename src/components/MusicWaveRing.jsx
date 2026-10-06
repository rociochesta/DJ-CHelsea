import React, { useEffect, useRef } from 'react';

export default function MusicWaveRing({ playing, analyserRef, color }) {
  const canvas = useRef(null);
  useEffect(() => {
    const element = canvas.current;
    const context = element.getContext('2d');
    if (!context) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    let frame;
    const bins = new Uint8Array(128);
    const draw = time => {
      context.clearRect(0, 0, 240, 240);
      const analyser = analyserRef.current;
      if (playing && analyser) analyser.getByteFrequencyData(bins);
      for (let index = 0; index < 64; index++) {
        const angle = index / 64 * Math.PI * 2 - Math.PI / 2;
        const strength = playing && !reduced.matches
          ? analyser ? bins[index] / 255 : (Math.sin(time / 320 + index * 0.45) + 1) * 0.25
          : 0;
        const radius = 91;
        const length = 3 + strength * 23;
        context.beginPath();
        context.moveTo(120 + Math.cos(angle) * radius, 120 + Math.sin(angle) * radius);
        context.lineTo(120 + Math.cos(angle) * (radius + length), 120 + Math.sin(angle) * (radius + length));
        context.strokeStyle = color;
        context.globalAlpha = playing ? 0.85 : 0.3;
        context.lineWidth = 2.5;
        context.lineCap = 'round';
        context.stroke();
      }
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [playing, analyserRef, color]);
  return <canvas ref={canvas} width={240} height={240} aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full" />;
}
