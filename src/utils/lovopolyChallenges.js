import challenges from "../data/lovopoly-challenges.json" with {type:"json"};
export const ESCAPE_CHALLENGES = challenges.cards;
export const escapeChallenge = id => ESCAPE_CHALLENGES.find(c=>c.id===id);

function shuffle(values,seed) {
  let state=2166136261;
  for(const ch of seed)state=Math.imul(state^ch.charCodeAt(0),16777619)>>>0;
  const result=[...values];
  for(let i=result.length-1;i>0;i--){state=(Math.imul(state,1664525)+1013904223)>>>0;const j=Math.floor(state/4294967296*(i+1));[result[i],result[j]]=[result[j],result[i]];}
  return result;
}
export function challengeProgress(game,playerId) {
  game.escapeProgress ||= {};
  game.escapeProgress[playerId] ||= {cycle:1,completed:{}};
  const progress=game.escapeProgress[playerId];progress.completed ||= {};
  return progress;
}
export function prepareEscapeChoices(game,player) {
  if(player.detentionChoices?.length===3)return player.detentionChoices;
  const progress=challengeProgress(game,player.id);
  if(ESCAPE_CHALLENGES.every(c=>progress.completed[c.id])){progress.cycle++;progress.completed={};}
  player.detentionId ||= `${game.id}:legacy:${player.id}`;
  const shuffled=shuffle(ESCAPE_CHALLENGES.map(c=>c.id),`${game.id}:${player.id}:${player.detentionId}:${progress.cycle}`);
  player.detentionChoices=[...shuffled.filter(id=>!progress.completed[id]),...shuffled.filter(id=>progress.completed[id])].slice(0,3);
  player.detentionChoiceCycle=progress.cycle;
  return player.detentionChoices;
}
export function recordChallengeCompletion(game,item) {
  if(!escapeChallenge(item.challengeId))return;
  const progress=challengeProgress(game,item.from);
  // A late confirmation from a previous cycle stays in History but cannot
  // consume a challenge in a new cycle.
  if(item.challengeCycle===progress.cycle)progress.completed[item.challengeId]=true;
}
