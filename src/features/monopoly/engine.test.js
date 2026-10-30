import test from 'node:test';
import assert from 'node:assert/strict';
import { updateMonopoly } from './engine.js';
import { tiles, tokens, categories, decks } from './catalog.js';
let n=0;const users=Array.from({length:9},(_,i)=>({id:`p${i}`,name:`Player ${i}`}));
const act=(g,type,user=users[0],extra={})=>updateMonopoly(g,{type,user,id:`action${++n}`,now:n,expectedGameId:g?.id||null,expectedRevision:g?.revision,...extra});
function lobby(count=8){let g=act(null,'create');for(let i=1;i<count;i++)g=act(g,'join',users[i]);return g;}
function started(count=8){return act(lobby(count),'start');}
test('catalog preserves forty deeds and has eight unique tokens and valid cards',()=>{
 assert.equal(tiles.length,40);assert.equal(new Set(tokens.map(t=>t.id)).size,8);
 for(const tile of tiles){assert.ok(tile.name);if(tile.group)assert.ok(categories[tile.group]);}
 for(const cards of Object.values(decks)){assert.equal(new Set(cards.map(c=>c.id)).size,cards.length);for(const c of cards)assert.ok(['cash','move','detain','nearest','back','other-utility'].includes(c.effect));}
});
test('eight online seats; rejects ninth, late joins and non-creator starts',()=>{
 const g=lobby();assert.equal(Object.keys(g.players).length,8);assert.equal(new Set(Object.values(g.players).map(p=>p.token)).size,8);
 assert.throws(()=>act(g,'join',users[8]));assert.throws(()=>act(g,'start',users[1]));assert.throws(()=>act(started(2),'join',users[2]));assert.throws(()=>act(lobby(1),'start'));
});
test('every player gets a turn; eliminated players are skipped',()=>{
 let g=started();const order=[...g.order];
 for(const id of order){assert.equal(g.turn,id);g.phase='end';g=act(g,'end-turn',g.players[id]);}
 assert.equal(g.turn,order[0]);g=act(g,'surrender',g.players[g.turn]);assert.equal(g.status,'playing');assert.equal(g.turn,order[1]);
 for(let i=0;i<7;i++){g.phase='end';g=act(g,'end-turn',g.players[g.turn]);assert.notEqual(g.turn,order[0]);}
});
test('stale and duplicate commands are safe and spectators cannot act',()=>{
 const g=started();const a={type:'roll',user:g.players[g.turn],id:'same-command',now:99,expectedGameId:g.id,expectedRevision:g.revision,dice:[1,2]};
 const next=updateMonopoly(g,a);assert.deepEqual(updateMonopoly(next,a),next);assert.throws(()=>updateMonopoly(next,{...a,id:'stale'}));assert.throws(()=>act(g,'roll',users[8],{dice:[1,2]}));
 assert.equal(g.players[g.turn].position,0);
});
test('purchase, rent, mortgages and buildings reuse Lovopoly economics',()=>{
 let g=started(2);let p=g.players[g.turn];g=act(g,'roll',p,{dice:[1,2]});assert.equal(g.phase,'purchase');g=act(g,'buy',p);assert.equal(g.owners[3],p.id);assert.equal(g.players[p.id].cash,1440);
 g=act(g,'mortgage',p,{tileId:3});assert.equal(g.players[p.id].cash,1470);g=act(g,'unmortgage',p,{tileId:3});assert.equal(g.players[p.id].cash,1437);
 g.owners[1]=p.id;g.owners[6]=p.id;g=act(g,'build',p,{tileId:3});assert.equal(g.buildings[3],1);assert.throws(()=>act(g,'build',p,{tileId:3}));
 g=act(g,'end-turn',p);const other=g.players[g.turn];const before=g.players[p.id].cash;g=act(g,'roll',other,{dice:[1,2]});assert.equal(g.players[p.id].cash,before+tiles[3].rents[1]);
});
test('bankruptcy transfers to creditor and continues with remaining players',()=>{
 let g=started(3);const p=g.players[g.turn],creditor=g.order[1];p.cash=0;g.owners[1]=p.id;g.debt={playerId:p.id,amount:500,creditorId:creditor};
 g=act(g,'bankrupt',p);assert.equal(g.status,'playing');assert.equal(g.owners[1],creditor);assert.ok(g.players[p.id].eliminated);assert.equal(g.debt,null);
 g=act(g,'surrender',g.players[g.turn]);assert.equal(g.status,'finished');assert.ok(g.winner);
});
test('three failed pause rolls create a payable debt and resume saved movement',()=>{
 let g=started(2);const p=g.players[g.turn];p.detained=true;p.position=10;p.attempts=2;p.cash=0;
 g=act(g,'roll',p,{dice:[1,2]});assert.equal(g.debt.reason,'detention');assert.equal(g.savedMove,3);assert.throws(()=>act(g,'end-turn',p));
 g.players[p.id].cash=50;g=act(g,'settle-debt',p);assert.equal(g.players[p.id].position,13);assert.equal(g.players[p.id].detained,false);assert.equal(g.phase,'purchase');
});
test('Firebase empty maps omitted and reconnect retain state',()=>{
 let g=lobby(2);delete g.owners;delete g.events;g=act(g,'start');assert.ok(g.owners);const restored=JSON.parse(JSON.stringify(g));assert.deepEqual(restored,g);
});
test('creator departure hands over lobby and last departure clears it',()=>{
 let g=lobby(2);g=act(g,'leave-lobby');assert.equal(g.creatorId,users[1].id);assert.equal(act(g,'leave-lobby',users[1]),null);
});


test('quick rounds count remaining players after elimination, with ties',()=>{
 let g=started(3);g.mode='quick';g.roundLimit=1;g=act(g,'surrender',g.players[g.turn]);
 for(let i=0;i<2;i++){g.phase='end';g=act(g,'end-turn',g.players[g.turn]);}
 assert.equal(g.status,'finished');assert.equal(g.winner,'tie');assert.equal(g.completedRounds,1);
});
test('Chance movement pays Start once and shared economy uses NA names',()=>{
 let g=started(2),p=g.players[g.turn];p.position=34;g.decks.chance=['chance-go'];
 g=act(g,'roll',p,{dice:[1,1]});assert.equal(g.players[p.id].position,0);assert.equal(g.players[p.id].cash,1700);assert.equal(g.lastCard.id,'chance-go');
 assert.equal(g.boardLayout.slots[1].name,'The First Meeting');
});


test('landing snapshots preserve purchase, rent and card movement without replaying effects',()=>{
 let g=started(2);const p=g.players[g.turn];g=act(g,'roll',p,{dice:[1,2]});
 assert.equal(g.lastLanding.playerId,p.id);assert.equal(g.lastLanding.visits[0].tileId,3);const landingId=g.lastLanding.id;
 g=act(g,'buy',p);assert.equal(g.lastLanding.id,landingId);
 g=act(g,'end-turn',p);const other=g.players[g.turn];g=act(g,'roll',other,{dice:[1,2]});assert.equal(g.lastLanding.visits[0].rent,tiles[3].rent);assert.match(g.lastLanding.visits[0].message,/paid/);
 g=started(2);g.decks.chance=['chance-service'];g=act(g,'roll',g.players[g.turn],{dice:[3,4]});
 assert.deepEqual(g.lastLanding.visits.map(v=>v.tileId),[7,21]);assert.equal(g.lastLanding.cards[0].visitIndex,0);assert.equal(g.lastLanding.cards[0].id,'chance-service');assert.equal(g.phase,'purchase');
});
test('detention and Community landings produce a serializable presentation',()=>{
 let g=started(2);g.decks.community=['community-welcome'];g=act(g,'roll',g.players[g.turn],{dice:[1,1]});assert.equal(g.lastLanding.cards[0].deck,'community');assert.equal(g.players[g.turn].cash,1600);
 g=started(2);g.players[g.turn].position=23;g=act(g,'roll',g.players[g.turn],{dice:[3,4]});assert.deepEqual(g.lastLanding.visits.map(v=>v.tileId),[30,10]);assert.equal(g.players[g.turn].detained,true);assert.deepEqual(JSON.parse(JSON.stringify(g.lastLanding)),g.lastLanding);
});

test('new Chance financial cards apply all fifteen signed amounts',()=>{
 const original=new Set(['chance-go','chance-travel','chance-refund','chance-pause','chance-service','chance-supplies']);
 const added=decks.chance.filter(c=>!original.has(c.id)).slice(0,20);assert.equal(added.length,20);
 const financial=added.filter(c=>c.effect==='cash');assert.equal(financial.length,15);
 assert.deepEqual(financial.map(c=>c.amount),[100,-75,-50,150,-100,-60,200,-125,100,-150,75,-80,125,-200,250]);
 for(const card of financial){let g=started(2);g.decks.chance=[card.id];const id=g.turn;g=act(g,'roll',g.players[id],{dice:[3,4]});assert.equal(g.players[id].cash,1500+card.amount);assert.equal(g.lastLanding.cards[0].text,card.text);}
});
test('nearest stations/utilities advance, pay Start on wrap and resolve normal rent',()=>{
 for(const [cardId,position,destination] of [['chance-emergency-meeting-required',0,15],['chance-emergency-meeting-required',29,5],['chance-the-higher-power-has-other-plans',0,12],['chance-the-higher-power-has-other-plans',29,12]]){
  let g=started(2);const id=g.turn,other=g.order.find(p=>p!==id);g.players[id].position=position;g.decks.chance=[cardId];g.owners[destination]=other;
  g=act(g,'roll',g.players[id],{dice:[3,4]});const rent=tiles[destination].type==='utility'?28:25;
  assert.equal(g.players[id].position,destination);assert.equal(g.players[id].cash,1500+(position===29?200:0)-rent);assert.equal(g.players[other].cash,1500+rent);
 }
});
test('back-three resolves taxes and chained Community; GO and Ego apply correct payments',()=>{
 let g=started(2);g.decks.chance=['chance-the-spiritual-u-turn'];g=act(g,'roll',g.players[g.turn],{dice:[3,4]});assert.equal(g.players[g.turn].position,4);assert.equal(g.players[g.turn].cash,1300);
 g=started(2);g.players[g.turn].position=29;g.decks.chance=['chance-the-spiritual-u-turn'];g.decks.community=['community-welcome'];g=act(g,'roll',g.players[g.turn],{dice:[3,4]});assert.deepEqual(g.lastLanding.visits.map(v=>v.tileId),[36,33]);assert.equal(g.lastLanding.cards.length,2);assert.equal(g.players[g.turn].cash,1600);
 for(const [cardId,pos,cash] of [['chance-the-geographic-cure',0,1700],['chance-go-do-some-step-work',10,1500]]){g=started(2);g.decks.chance=[cardId];g=act(g,'roll',g.players[g.turn],{dice:[3,4]});assert.equal(g.players[g.turn].position,pos);assert.equal(g.players[g.turn].cash,cash);}
});

test('second Chance batch adds 25 unique cards with correct financial amounts',()=>{
 assert.equal(decks.chance.length,51);assert.equal(new Set(decks.chance.map(c=>c.id)).size,51);
 const batch=decks.chance.slice(26);assert.equal(batch.length,25);
 assert.deepEqual(batch.slice(0,15).map(c=>c.amount),[-100,150,-200,100,-75,250,-50,200,-125,125,-150,100,-60,300,-100]);
 for(const card of batch.slice(0,15)){let g=started(2);g.decks.chance=[card.id];g=act(g,'roll',g.players[g.turn],{dice:[3,4]});assert.equal(g.players[g.turn].cash,1500+card.amount);}
});
test('other utility skips nearest forward utility and resolves rent and Start',()=>{
 for(const [start,destination,bonus] of [[0,28,0],[15,12,200],[29,28,200]]){
  let g=started(2);const id=g.turn,owner=g.order.find(p=>p!==id);g.players[id].position=start;g.owners[destination]=owner;g.decks.chance=['chance-the-universe-has-reassigned-you'];
  g=act(g,'roll',g.players[id],{dice:[3,4]});assert.equal(g.players[id].position,destination);assert.equal(g.players[id].cash,1500+bonus-28);assert.equal(g.players[owner].cash,1528);
 }
});
test('back five resolves Community and Zoom Room movement resolves purchase after Start',()=>{
 let g=started(2);g.decks.chance=['chance-the-emotional-time-machine'];g.decks.community=['community-welcome'];g=act(g,'roll',g.players[g.turn],{dice:[3,4]});assert.deepEqual(g.lastLanding.visits.map(v=>v.tileId),[7,2]);assert.equal(g.players[g.turn].cash,1600);
 g=started(2);g.decks.chance=['chance-the-fellowship-express'];g=act(g,'roll',g.players[g.turn],{dice:[3,4]});assert.equal(g.players[g.turn].position,5);assert.equal(g.players[g.turn].cash,1700);assert.equal(g.phase,'purchase');
});
