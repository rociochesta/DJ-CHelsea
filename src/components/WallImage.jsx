import { useEffect, useState } from 'react';
export default function WallImage({ src }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);
  return failed ? <p className="rounded-xl bg-black/20 p-3 text-sm text-white/50">This image could not load.</p>
    : <img src={src} alt="Wall attachment" loading="lazy" onError={() => setFailed(true)} className="max-h-80 w-full rounded-2xl object-contain bg-black/20" />;
}
