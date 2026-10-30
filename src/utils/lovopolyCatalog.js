import catalog from '../data/lovopolyPlaces.json' with {type:'json'};
import {LOVOPOLY_TILES,LOVOPOLY_GROUPS} from './lovopolyBoard.js';
const byId=Object.fromEntries(catalog.places.map(p=>[p.id,p]));
const bySlot=Object.fromEntries(catalog.places.filter(p=>Number.isInteger(p.originalSlot)).map(p=>[p.originalSlot,p]));
function shuffle(items,random){const result=[...items];for(let i=result.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[result[i],result[j]]=[result[j],result[i]];}return result;}
export function createBoardLayout(seed,source=catalog.places){
 let state=2166136261;for(const c of seed)state=Math.imul(state^c.charCodeAt(0),16777619)>>>0;
 const random=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};
 const groups=Object.keys(LOVOPOLY_GROUPS),three=groups.filter(g=>LOVOPOLY_TILES.filter(t=>t.group===g).length===3);
 const shuffled=shuffle(three,random),categoryFor=Object.fromEntries(groups.map(g=>[g,three.includes(g)?shuffled[three.indexOf(g)]:g]));
 const result={version:1,slots:{}};
 for(const group of groups){const slots=LOVOPOLY_TILES.filter(t=>t.group===group),category=categoryFor[group];let pool=source.filter(p=>p.category===category && p.enabled!==false);if(pool.length<slots.length)throw new Error(`Not enough places for ${category}`);pool=shuffle(pool,random);slots.forEach((slot,i)=>{const place=pool[i];result.slots[slot.id]=structuredClone(place);});}
 return result;
}
export function getLovopolyTiles(game){return LOVOPOLY_TILES.map(slot=>{
 const saved=game?.boardLayout?.slots?.[slot.id];
 const place=saved ? {...saved,...(byId[saved.id] ? {image:byId[saved.id].image,animations:byId[saved.id].animations} : {})} : bySlot[slot.id];
 if(!place)return slot;
 return {...slot,name:place.name,placeId:place.id,category:place.category,description:place.description,image:place.image,thumbnail:place.image,animations:place.animations || [],overlay:null};
});}
export function getLovopolyGroups(game){const tiles=getLovopolyTiles(game);return Object.fromEntries(Object.entries(LOVOPOLY_GROUPS).map(([key,value])=>{const category=tiles.find(t=>t.group===key)?.category;return [key,{...value,name:LOVOPOLY_GROUPS[category]?.name || value.name,category}];}));}
