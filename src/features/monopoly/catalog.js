import { LOVOPOLY_TILES, lovopolyTileLayout } from '../../utils/lovopolyBoard.js';
import tileData from './data/tiles.json' with { type: 'json' };
import categories from './data/categories.json' with { type: 'json' };
import tokens from './data/tokens.json' with { type: 'json' };
import chance from './data/chance.json' with { type: 'json' };
import community from './data/community.json' with { type: 'json' };
export { categories, tokens, lovopolyTileLayout };
export const decks = { chance, community };
// Preserve Lovopoly's deed schedules and color-group sizes for shared economy rules.
export const tiles = LOVOPOLY_TILES.map(tile => {
  const content = tileData.find(entry => entry.id === tile.id);
  if (!content || content.type !== tile.type) throw new Error(`Invalid tile metadata at ${tile.id}`);
  return { ...tile, ...content, image: content.art, description: content.text, overlay: null };
});
export function shuffled(ids, seed) {
  let state = 2166136261;
  for (const c of seed) state = Math.imul(state ^ c.charCodeAt(0), 16777619) >>> 0;
  const result = [...ids];
  for (let i=result.length-1;i>0;i--) { state=(Math.imul(state,1664525)+1013904223)>>>0; const j=Math.floor(state/4294967296*(i+1)); [result[i],result[j]]=[result[j],result[i]]; }
  return result;
}
