export const MOODS = [
  { id: 'happy', file: 'Happy.svg', label: 'Feeling good' },
  { id: 'sleepy', file: 'Sleepy.svg', label: 'Low battery' },
  { id: 'sad', file: 'sad.svg', label: 'Feeling low' },
  { id: 'embarrassed', file: 'embarrassed.svg', label: 'Blushing' },
  { id: 'angry', file: 'angry.svg', label: 'Not today' },
  { id: 'playful', file: 'playful.svg', label: 'Feeling playful' },
  { id: 'nothing', file: 'Nothing.svg', label: 'Just here' },
  { id: 'crying', file: 'crying.svg', label: 'Need a hug' },
];

export function MoodIcon({ mood, className = 'h-9 w-9' }) {
  const option = MOODS.find(item => item.id === mood);
  return option ? <img src={`/moods/${option.file}`} alt={option.label} className={className} /> : null;
}

export default function MoodPicker({ value, onChange, disabled = false }) {
  return <fieldset disabled={disabled}>
    <legend className="mb-3 text-base font-semibold text-white/90">Pick your vibe for today</legend>
    <div className="grid grid-cols-4 gap-x-3 gap-y-4">
      {MOODS.map(mood => <button key={mood.id} type="button" aria-pressed={value === mood.id} onClick={() => onChange(mood.id)} className="group flex min-w-0 flex-col items-center gap-2 rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-fuchsia-400 disabled:opacity-50">
        <span className={`block w-full max-w-[88px] rounded-[28%] p-1 transition ${value === mood.id ? 'ring-2 ring-fuchsia-400 shadow-[0_0_18px_rgba(232,121,249,0.35)]' : 'group-hover:ring-1 group-hover:ring-white/30'}`}>
          <MoodIcon mood={mood.id} className="aspect-square w-full object-contain" />
        </span>
        <span className={`text-center text-xs leading-tight ${value === mood.id ? 'text-fuchsia-200' : 'text-white/65'}`}>{mood.label}</span>
      </button>)}
    </div>
  </fieldset>;
}
