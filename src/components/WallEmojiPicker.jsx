export default function WallEmojiPicker({ disabled, onSelect, onClose }) {
  return <div aria-label="Choose an emoji" className="absolute bottom-full left-0 z-20 mb-2 grid w-[272px] max-w-[80vw] grid-cols-6 gap-1 rounded-2xl border border-white/15 bg-[#171020] p-2 shadow-xl" onKeyDown={event => { if (event.key === 'Escape') onClose(); }}>
    {['😏','🔥','👀','😈','😂','😘','🙈','💋','😎','🤔','✨','🌙','🎶','🎉','🍸','🎲','🫣','🤭','😜','🫠','🥂','💅','🤫','🍓'].map(emoji => <button key={emoji} type="button" disabled={disabled} aria-label={`Insert ${emoji}`} onPointerDown={event => event.preventDefault()} onClick={() => onSelect(emoji)} className="flex h-10 items-center justify-center rounded-lg text-xl hover:bg-white/10">{emoji}</button>)}
  </div>;
}
