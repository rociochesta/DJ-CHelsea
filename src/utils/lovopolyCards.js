import chance from "../data/lovopoly-chance.json" with {type:"json"};
import community from "../data/lovopoly-community.json" with {type:"json"};
export const CARD_DECKS = {chance:chance.cards,community:community.cards};
export const cardById = id => Object.values(CARD_DECKS).flat().find(c=>c.id===id);

// Stable Fisher–Yates permutation seeded by the match UUID and cycle. Transaction
// retries never consume randomness or change the draw. Decks persist in Firebase.
function shuffle(ids, seed) {
  let state=2166136261;
  for (const ch of seed) state=Math.imul(state ^ ch.charCodeAt(0),16777619)>>>0;
  const result=[...ids];
  for(let i=result.length-1;i>0;i--){state=(Math.imul(state,1664525)+1013904223)>>>0;const j=Math.floor(state/4294967296*(i+1));[result[i],result[j]]=[result[j],result[i]];}
  return result;
}
export function ensureDecks(game) {
  game.decks ||= {};
  for(const name of Object.keys(CARD_DECKS)) game.decks[name] ||= {cycle:0,remaining:shuffle(CARD_DECKS[name].map(c=>c.id),`${game.id}:${name}:0`),held:{}};
}
export function drawCard(game,name,playerId) {
  ensureDecks(game);
  const deck=game.decks[name]; deck.remaining ||= []; deck.held ||= {};
  if(!deck.remaining.length){deck.cycle++;deck.remaining=shuffle(CARD_DECKS[name].filter(c=>!deck.held[c.id]).map(c=>c.id),`${game.id}:${name}:${deck.cycle}`);}
  const card=cardById(deck.remaining.shift());
  if(card.effect==='keep') deck.held[card.id]=playerId;
  return card;
}
export function transferHeldCards(game,from,to,count) {
  // Legacy saves may have anonymous cards; preserve their numeric balances.
  for(const deck of Object.values(game.decks || {})) for(const [id,owner] of Object.entries(deck.held || {})) {
    if(count>0 && owner===from){deck.held[id]=to;count--;}
  }
}
export function returnHeldCard(game,playerId) {
  for(const deck of Object.values(game.decks || {})) for(const [id,owner] of Object.entries(deck.held || {})) {
    if(owner===playerId){delete deck.held[id];deck.remaining ||= [];deck.remaining.push(id);return;}
  }
}
