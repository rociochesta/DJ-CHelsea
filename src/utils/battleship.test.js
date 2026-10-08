import test from 'node:test';
import assert from 'node:assert/strict';
import {FLEET,shipCells,validateFleet,randomFleet,updateBattleship} from './battleship.js';
const a={id:'a',name:'Rocio'},b={id:'b',name:'Sam'};
const fleet=Object.fromEntries(FLEET.map((ship,i)=>[ship.id,{row:i,col:0,vertical:false}]));
let serial=0;
const act=(game,type,user=a,extra={})=>updateBattleship(game,{type,user,id:`command${++serial}`,now:100,expectedGameId:game?.id||null,expectedRevision:game?.revision,...extra});
function ready(){let game=act(null,'start');game=act(game,'ready',a,{fleet});game=act(game,'join',b);return act(game,'ready',b,{fleet});}
test('ships fit within the board, cannot overlap, and random layouts contain 17 cells',()=>{
  assert.throws(()=>shipCells(9,9,2));assert.throws(()=>shipCells(-1,0,1));
  assert.throws(()=>validateFleet({...fleet,destroyer:{row:0,col:0}}));assert.throws(()=>validateFleet({}));
  for(let i=0;i<100;i++)assert.equal(validateFleet(randomFleet()),true);
  assert.equal(FLEET.reduce((sum,s)=>sum+s.size,0),17);
});
test('creator locks ships alone; only two players may join and both must be ready',()=>{
  let game=act(null,'start');game=act(game,'ready',a,{fleet});assert.equal(game.status,'setup');
  assert.throws(()=>act(game,'fire',a,{row:0,col:0}));game=act(game,'join',b);
  assert.throws(()=>act(game,'join',{id:'c'}));assert.throws(()=>act(game,'ready',a,{fleet}));
  game=act(game,'ready',b,{fleet});assert.equal(game.status,'playing');assert.equal(game.turn,'a');
});
test('hit and miss each pass the turn; wrong turn and repeated coordinates are rejected',()=>{
  let game=ready();assert.throws(()=>act(game,'fire',b,{row:0,col:0}));
  game=act(game,'fire',a,{row:0,col:0});assert.equal(game.shots.a['0_0'].hit,true);assert.equal(game.turn,'b');
  game=act(game,'fire',b,{row:9,col:9});assert.equal(game.shots.b['9_9'].hit,false);
  assert.throws(()=>act(game,'fire',a,{row:0,col:0}));
});
test('all 17 hits sink the fleet and finish with a winner',()=>{
  let game=ready();let miss=0;
  for(const ship of FLEET){for(let col=0;col<ship.size;col++){
    game=act(game,'fire',a,{row:FLEET.indexOf(ship),col});
    if(col===ship.size-1)assert.equal(game.lastMove.sunk,ship.name);
    if(game.status!=='finished'){game=act(game,'fire',b,{row:8+Math.floor(miss/10),col:miss%10});miss++;}
  }}
  assert.equal(game.status,'finished');assert.equal(game.winnerId,'a');assert.throws(()=>act(game,'fire',b,{row:7,col:7}));
});
test('stale moves are rejected and commands are idempotent',()=>{
  const game=ready(),command={type:'fire',id:'fixed',user:a,now:100,expectedGameId:game.id,expectedRevision:game.revision,row:0,col:0};
  const next=updateBattleship(game,command);assert.deepEqual(updateBattleship(next,command),next);
  assert.throws(()=>updateBattleship(next,{...command,id:'different'}));
});
test('finish stops play and allows a new game without carrying fleets over',()=>{
  const finished=act(ready(),'finish');assert.equal(finished.status,'finished');
  const next=act(finished,'start',b);assert.deepEqual(next.fleets,{});assert.equal(next.starter,'b');
});
test('missing empty Firebase objects still allow setup and the first shot',()=>{
  let game=act(null,'start');delete game.fleets;delete game.shots;
  game=act(game,'ready',a,{fleet});game=act(game,'join',b);game=act(game,'ready',b,{fleet});delete game.shots;
  game=act(game,'fire',a,{row:0,col:0});assert.equal(game.shots.a['0_0'].hit,true);
});
