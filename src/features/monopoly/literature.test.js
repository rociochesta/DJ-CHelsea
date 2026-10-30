import test from 'node:test';
import assert from 'node:assert/strict';
import { updateMonopoly } from './engine.js';
import { questions, sampleLiteratureRoll, purchasePrice } from './literature.js';
import { tiles } from './catalog.js';
let sequence=0;const a={id:'a',name:'A'},b={id:'b',name:'B'};
const act=(g,type,user=g?.players?.[g.turn]||a,extra={})=>updateMonopoly(g,{type,user,id:`lit-${++sequence}`,now:sequence,expectedGameId:g?.id||null,expectedRevision:g?.revision,...extra});
function game(){let g=act(null,'create',a);g=act(g,'join',b);return act(g,'start',a);}
function land(g,tile=3,roll=0){g.players[g.turn].position=(tile+37)%40;return act(g,'roll',undefined,{dice:[1,2],triviaRoll:roll});}
function respond(g,result){const challengeId=g.literatureChallenge.id;if(result==='skip')return act(g,'literature-skip',undefined,{challengeId});g=act(g,'literature-accept',undefined,{challengeId});const answer=questions.find(q=>q.id===g.literatureChallenge.questionId).answerIndex;return act(g,'literature-answer',undefined,{challengeId,answerIndex:result==='correct'?answer:(answer+1)%3});}

test('exactly 30 percent of uniform samples trigger and rejected bytes are resampled',()=>{
 let count=0;for(let n=0;n<200;n++)if(sampleLiteratureRoll({getRandomValues:arr=>{arr[0]=n;return arr;}})<30)count++;assert.equal(count,60);
 const values=[255,200,29];assert.equal(sampleLiteratureRoll({getRandomValues:arr=>{arr[0]=values.shift();return arr;}}),29);
 assert.equal(land(game(),3,29).phase,'challenge');assert.equal(land(game(),3,30).phase,'purchase');assert.throws(()=>land(game(),3,100));
 let g=game();g=land(g,4,0);assert.equal(g.literatureChallenge,null);assert.equal(g.phase,'end');
});
test('purchase prices are frozen before acceptance; correct discounts, wrong surcharges, skip normal',()=>{
 for(const [tile,correct] of [[3,48],[5,150],[12,113]])for(const result of ['correct','incorrect','skip']){
  let g=land(game(),tile);const id=g.turn,base=tiles[tile].price,balance=g.players[id].cash;
  assert.equal(g.literatureChallenge.baseAmount,base);assert.equal(g.players[id].cash,balance);assert.throws(()=>act(g,'buy'));assert.throws(()=>act(g,'end-turn'));
  g=respond(g,result);const expected=result==='correct'?correct:result==='incorrect'?Math.ceil(base*110/100):base;
  assert.equal(purchasePrice(g,tiles[tile]),expected);g=act(g,'buy');assert.equal(g.players[id].cash,balance-expected);assert.equal(g.owners[tile],id);
 }
});
test('rent is deferred then paid once, including station and utility percentages',()=>{
 for(const [tile,base,discount] of [[3,10,30],[5,25,25],[12,12,25]])for(const outcome of ['correct','incorrect','skip']){
  let g=game(),payer=g.turn,owner=g.order.find(id=>id!==payer);g.owners[tile]=owner;if(tile===3)g.buildings={[tile]:1};
  g=land(g,tile);assert.equal(g.literatureChallenge.baseAmount,base);assert.equal(g.players[owner].cash,1500);assert.equal(g.debt,undefined);
  g=respond(g,outcome);const amount=outcome==='correct'?Math.ceil(base*(100-discount)/100):outcome==='incorrect'?Math.ceil(base*110/100):base;
  assert.equal(g.players[payer].cash,1500-amount);assert.equal(g.players[owner].cash,1500+amount);assert.equal(g.lastLanding.visits.at(-1).rent,amount);
  assert.throws(()=>respond(g,'skip'));
 }
});
test('own properties award 50, charge 50 on wrong answers and do nothing on skip',()=>{
 for(const outcome of ['correct','incorrect','skip']){
  let g=game();const id=g.turn;g.owners[3]=id;g=land(g);g=respond(g,outcome);assert.equal(g.players[id].cash,outcome==='correct'?1550:outcome==='incorrect'?1450:1500);
 }
 let g=game();g.owners[3]=g.turn;g.players[g.turn].cash=0;g=respond(land(g),'incorrect');assert.equal(g.debt.amount,50);assert.equal(g.debt.creditorId,null);assert.throws(()=>act(g,'end-turn'));
});
test('insufficient rent creates only the final adjusted debt and settlement pays once',()=>{
 let g=game(),payer=g.turn,owner=g.order.find(id=>id!==payer);g.owners[5]=owner;g.players[payer].cash=0;
 g=respond(land(g,5),'incorrect');assert.equal(g.debt.amount,28);assert.equal(g.players[owner].cash,1500);
 g.players[payer].cash=28;g=act(g,'settle-debt');assert.equal(g.players[owner].cash,1528);assert.equal(g.debt,null);
});
test('individual decks never repeat answered cards until exhausted; skip remains available',()=>{
 let g=game(),id=g.turn;g.owners[3]=id;g=land(g);const skipped=g.literatureChallenge.questionId;g=respond(g,'skip');
 assert.equal(g.literatureDecks[id].used.length,0);assert.equal(g.literatureDecks[id].remaining.at(-1),skipped);
 const seen=[];
 for(let i=0;i<questions.length;i++){
  g.phase='roll';g=land(g);seen.push(g.literatureChallenge.questionId);g=respond(g,i%2?'incorrect':'correct');
 }
 assert.equal(new Set(seen).size,questions.length);assert.equal(seen.at(-1),skipped);assert.equal(g.literatureDecks[id].remaining.length,0);
 // Firebase omits empty collections.
 delete g.literatureDecks[id].remaining;g.phase='roll';g=land(g);assert.equal(g.literatureDecks[id].cycle,2);assert.equal(g.literatureDecks[id].used.length,0);
 const other=g.order.find(p=>p!==id);g=respond(g,'skip');g.turn=other;g.phase='roll';g=land(g);assert.equal(g.literatureDecks[other].cycle,1);assert.equal(g.literatureDecks[other].remaining.length,questions.length);
});
test('accepted question survives reload; stale, invalid, off-turn and duplicate answers cannot pay twice',()=>{
 let g=land(game());const challengeId=g.literatureChallenge.id;g=act(g,'literature-accept',undefined,{challengeId});g=JSON.parse(JSON.stringify(g));
 assert.equal(g.literatureChallenge.status,'accepted');assert.throws(()=>act(g,'literature-answer',undefined,{challengeId,answerIndex:999}));assert.throws(()=>act(g,'literature-skip',g.players[g.order.find(id=>id!==g.turn)],{challengeId}));
 const command={type:'literature-answer',user:g.players[g.turn],id:'once',now:999,expectedGameId:g.id,expectedRevision:g.revision,challengeId,answerIndex:questions.find(q=>q.id===g.literatureChallenge.questionId).answerIndex};
 const next=updateMonopoly(g,command);assert.deepEqual(updateMonopoly(next,command),next);assert.throws(()=>updateMonopoly(next,{...command,id:'stale'}));
});
test('movement cards and the saved detention roll can offer a challenge on arrival',()=>{
 let g=game();g.decks.chance=['chance-service'];g=act(g,'roll',undefined,{dice:[3,4],triviaRoll:0});assert.equal(g.literatureChallenge.tileId,21);assert.deepEqual(g.lastLanding.visits.map(v=>v.tileId),[7,21]);
 g=game();const p=g.players[g.turn];p.position=10;p.detained=true;p.attempts=2;p.cash=0;g=act(g,'roll',undefined,{dice:[1,2],triviaRoll:0});assert.equal(g.debt.reason,'detention');g.players[g.turn].cash=50;g=act(g,'settle-debt',undefined,{triviaRoll:0});assert.equal(g.phase,'challenge');assert.equal(g.literatureChallenge.tileId,13);
});

