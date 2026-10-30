import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import catalog from '../data/lovopolyPlaces.json' with {type:'json'};
import {createBoardLayout,getLovopolyTiles} from './lovopolyCatalog.js';
import {LOVOPOLY_TILES} from './lovopolyBoard.js';
import {updateLovopoly} from './lovopoly.js';
test('every category draws from its editable pool, excludes disabled entries, and saves the selected text',()=>{
 const source=structuredClone(catalog.places);
 const template=source.find(p=>p.category==='together');
 source.push({...template,id:'together-extra',name:'Editable title',description:'Editable description'});
 source.push({...template,id:'together-disabled',enabled:false});
 let selected;
 for(let i=0;i<80;i++){
  const layout=createBoardLayout(`all-pools-${i}`,source);
  const pool=Object.values(layout.slots).filter(p=>p.category==='together');
  assert.equal(pool.length,3);assert.equal(new Set(pool.map(p=>p.id)).size,3);
  assert.ok(!pool.some(p=>p.id==='together-disabled'));
  selected ||= pool.find(p=>p.id==='together-extra');
 }
 assert.ok(selected);assert.equal(selected.name,'Editable title');assert.equal(selected.description,'Editable description');
 source.find(p=>p.id==='together-extra').name='Later edit';
 assert.equal(selected.name,'Editable title');
});
test('new location pools are all reachable without duplicates across matches',()=>{
 const seen=new Set();
 for(let i=0;i<100;i++){
  const places=Object.values(createBoardLayout(`locations-${i}`).slots);
  assert.equal(new Set(places.map(p=>p.id)).size,places.length);
  places.forEach(p=>seen.add(p.id));
 }
 for(const category of ['chile','oklahoma']){
  const pool=catalog.places.filter(p=>p.category===category);
  assert.equal(pool.length,category==='chile'?8:7);
  for(const place of pool){assert.ok(seen.has(place.id),place.id);assert.ok(place.animations.length,place.id);}
 }
});
test('new game replaces a completed match with a fresh setup and preserves its result',()=>{
 const game={id:'old-match',revision:4,status:'finished',mode:'classic',roundLimit:0,result:'Chelsea wins.',players:{a:{id:'a',name:'Rocio',token:'heart',cash:10}},boardLayout:createBoardLayout('old-match')};
 const action={type:'new-game',user:{id:'a',name:'Rocio'},id:'new-match',now:100,expectedGameId:game.id,expectedRevision:4};
 const fresh=updateLovopoly(game,action);
 assert.equal(fresh.status,'setup');assert.equal(fresh.players.a.cash,1500);
 assert.notDeepEqual(fresh.boardLayout,game.boardLayout);
 assert.equal(fresh.archives[game.id].status,'finished');assert.equal(fresh.archives[game.id].result,game.result);
 assert.throws(()=>updateLovopoly({...game,status:'playing'},action));
 assert.throws(()=>updateLovopoly(game,{...action,user:{id:'stranger'}}));
});
test('layout is repeatable, swaps whole categories, and preserves every slot economy',()=>{
 const boardLayout=createBoardLayout('test-layout');
 assert.deepEqual(boardLayout,createBoardLayout('test-layout'));
 assert.notDeepEqual(boardLayout,createBoardLayout('another-match'));
 const tiles=getLovopolyTiles({boardLayout});
 assert.ok(tiles.some(t=>t.group && t.category!==t.group));
 for(const original of LOVOPOLY_TILES){const tile=tiles[original.id];for(const key of ['price','rent','rents','buildCost','group','type'])assert.deepEqual(tile[key],original[key]);}
 for(const group of new Set(tiles.filter(t=>t.group).map(t=>t.group)))assert.equal(new Set(tiles.filter(t=>t.group===group).map(t=>t.category)).size,1);
});
test('expanded pools select three distinct places and snapshot their data',()=>{
 const source=structuredClone(catalog.places);
 source.push({...source.find(p=>p.category==='chile'),id:'extra-chile',name:'Extra test place'});
 const layout=createBoardLayout('expanded',source);
 const chile=Object.values(layout.slots).filter(p=>p.category==='chile');
 assert.equal(chile.length,3);assert.equal(new Set(chile.map(p=>p.id)).size,3);
 const before=JSON.stringify(layout);source.forEach(p=>p.name='changed');assert.equal(JSON.stringify(layout),before);
});
test('legacy boards keep their names and every catalog asset exists',()=>{
 assert.deepEqual(getLovopolyTiles(null).map(t=>t.name),LOVOPOLY_TILES.map(t=>t.name));
 for(const place of catalog.places)for(const path of [place.image,...place.animations.map(a=>a.src)])assert.ok(existsSync(new URL(`../../public${path}`,import.meta.url)),path);
});
