import {LOVOPOLY_GROUPS,LOVOPOLY_TILES} from './lovopolyBoard.js';
export function completedGroups(owners={}) {
 return Object.fromEntries(Object.keys(LOVOPOLY_GROUPS).flatMap(key=>{
  const group=LOVOPOLY_TILES.filter(t=>t.group===key),owner=owners[group[0].id];
  return owner && group.every(t=>owners[t.id]===owner)?[[key,owner]]:[];
 }));
}
