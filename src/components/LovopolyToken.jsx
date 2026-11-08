import { LOVOPOLY_TOKENS, TOKEN_COLORS } from '../utils/lovopolyBoard';

const board = import.meta.glob('../../assets/tokens/{Board/,}*.svg', { eager: true, import: 'default' });
const premium = import.meta.glob('../../assets/tokens/Premium/*.png', { eager: true, import: 'default' });

export function premiumIcon(token) {
  return premium[`../../assets/tokens/Premium/${token.asset}.png`];
}

export default function LovopolyToken({ id, color }) {
  const token = LOVOPOLY_TOKENS.find(item => item.id === id);
  if (!token) return null;
  if (id === 'plane' || id === 'jellyfish') {
    const legacyIcon = { plane: '✈', jellyfish: '🪼' }[id];
    return legacyIcon ? <span className="lovo-piece" style={{ backgroundColor: TOKEN_COLORS[color] || TOKEN_COLORS.Blush }} aria-label={id}>{legacyIcon}</span> : null;
  }
  const file = ({ Love_Lovelock: 'Love_Lock', Animal_Squid: 'Animal_Squid_1' })[token.asset] || token.asset;
  const src = board[`../../assets/tokens/Board/${file}.svg`] || board[`../../assets/tokens/${file}.svg`];
  return <span className="lovo-piece" style={{ backgroundColor: TOKEN_COLORS[color] || TOKEN_COLORS.Blush }}>
    <img src={src} alt={token.name} draggable="false" />
  </span>;
}
