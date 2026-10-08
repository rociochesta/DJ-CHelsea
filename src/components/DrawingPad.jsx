import { useRef, useState } from 'react';
import { Send } from 'lucide-react';

export default function DrawingPad({ onAdd, onClose }) {
  const canvas = useRef(null);
  const last = useRef(null);
  const [color, setColor] = useState('#f9a8d4');
  const [width, setWidth] = useState(4);
  const point = event => {
    const rect = canvas.current.getBoundingClientRect();
    return { x: (event.clientX - rect.left) * 640 / rect.width, y: (event.clientY - rect.top) * 400 / rect.height };
  };
  const paint = (from, to) => {
    const ctx = canvas.current.getContext('2d');
    ctx.strokeStyle = color; ctx.lineWidth = width; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(from.x, from.y); ctx.lineTo(to.x, to.y); ctx.stroke();
  };
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onKeyDown={event => { if (event.key === 'Escape') onClose(); }}>
    <section role="dialog" aria-modal="true" aria-label="Draw something" className="lounge-drawing w-full max-w-xl rounded-3xl border border-white/15 bg-[#11111b] p-5 space-y-4" onKeyDown={event => {
      if (event.key !== 'Tab') return;
      const controls = event.currentTarget.querySelectorAll('button, input');
      const first = controls[0], lastControl = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); lastControl.focus(); }
      else if (!event.shiftKey && document.activeElement === lastControl) { event.preventDefault(); first.focus(); }
    }}>
      <div className="flex justify-between items-center"><h2 className="text-xl font-semibold">Draw something</h2><button autoFocus type="button" onClick={onClose}>Close</button></div>
      <div className="flex flex-wrap items-center gap-4"><label className="flex items-center gap-2 text-sm">Color<input type="color" value={color} onChange={event => setColor(event.target.value)} /></label><label className="flex items-center gap-2 text-sm">Brush<input type="range" min="1" max="20" value={width} onChange={event => setWidth(Number(event.target.value))} /></label><button type="button" onClick={() => canvas.current.getContext('2d').clearRect(0, 0, 640, 400)} className="text-sm">Clear</button></div>
      <canvas ref={canvas} width={640} height={400} aria-label="Drawing canvas" className="w-full rounded-xl bg-white touch-none cursor-crosshair" onPointerDown={event => { event.currentTarget.setPointerCapture(event.pointerId); last.current = point(event); paint(last.current, { x: last.current.x + .01, y: last.current.y }); }} onPointerMove={event => { if (!last.current) return; const next = point(event); paint(last.current, next); last.current = next; }} onPointerUp={() => { last.current = null; }} onPointerCancel={() => { last.current = null; }} />
      <button type="button" className="wall-send inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm" onClick={() => {
        const output = document.createElement('canvas'); output.width = 640; output.height = 400;
        const ctx = output.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, 640, 400); ctx.drawImage(canvas.current, 0, 0);
        onAdd(output.toDataURL('image/png'));
      }}><Send className="h-4 w-4"/>Add drawing</button>
    </section>
  </div>;
}
