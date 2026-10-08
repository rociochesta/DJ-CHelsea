import { REVEAL_STYLES, REVEAL_FONTS } from '../utils/revealGame';

export default function RevealContent({ asset }) {
  if (!asset) return <div className="flex h-full items-center justify-center bg-black/30 text-sm text-white/40">Loading your secret…</div>;
  if (asset.type === 'photo') return <img src={asset.url} alt="Your revealed picture" className="h-full w-full object-contain bg-black/30" />;
  const style = REVEAL_STYLES.find(item => item.id === asset.style) || REVEAL_STYLES[0];
  const font = REVEAL_FONTS.find(item => item.id === asset.font) || REVEAL_FONTS[0];
  return <div className="flex h-full w-full items-center justify-center p-6 sm:p-10" style={{background:style.background,color:style.color}}><p className="whitespace-pre-wrap break-words text-center leading-relaxed" style={{fontFamily:font.family,fontWeight:asset.font === 'bold' ? 800 : 500,fontSize:asset.text.length > 350 ? 'clamp(12px,2.3vw,20px)' : asset.text.length > 140 ? 'clamp(16px,3vw,26px)' : 'clamp(22px,4vw,38px)'}}>{asset.text}</p></div>;
}
