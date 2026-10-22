import test from 'node:test';
import assert from 'node:assert/strict';
import { CARD_DECKS, ensureDecks, drawCard, returnHeldCard } from './lovopolyCards.js';
import { updateLovopoly } from './lovopoly.js';
import { liquidationValue } from './lovopolyEconomy.js';

const a={id:'a',name:'Rocio'},b={id:'b',name:'Chelsea'};
let sequence=0;
const play=()=>({id:'cards-fixture',revision:0,status:'playing',mode:'classic',turn:'a',phase:'roll',players:{a:{...a,cash:1500,position:4,token:'heart'},b:{...b,cash:1500,position:0,token:'kiss'}},owners:{},events:{}});
const act=(g,type,user=a,extra={})=>updateLovopoly(g,{type,user,id:`card-action-${++sequence}`,now:sequence,expectedGameId:g.id,expectedRevision:g.revision,...extra});
function top(g,deck,id){ensureDecks(g);g.decks[deck].remaining=[id,...g.decks[deck].remaining.filter(x=>x!==id)];}
function land(card,deck='chance',g=play()) {g.players.a.position=deck==='chance'?4:39;top(g,deck,card);return act(g,'roll',a,{dice:[1,2]});}

test('two unique 30-card decks with exact category counts and one keepable each',()=>{
  for(const [name,deck] of Object.entries(CARD_DECKS)){
    assert.equal(deck.length,30);assert.equal(new Set(deck.map(c=>c.id)).size,30);
    const counts={};deck.forEach(c=>{counts[c.category]=(counts[c.category]||0)+1;assert.ok(c.text && c.title);});
    assert.deepEqual(counts,name==='chance'?{financial:15,mischief:10,romantic:5}:{financial:15,gift:10,romantic:5});
    assert.equal(deck.filter(c=>c.effect==='keep').length,1);
  }
});
test('decks survive reload, draw without repeats, cycle excluding held cards, and return used cards',()=>{
  let g=play();ensureDecks(g);const original=[...g.decks.chance.remaining];
  const duplicate=play();ensureDecks(duplicate);assert.deepEqual(duplicate.decks,g.decks);
  const different=play();different.id='another-match';ensureDecks(different);assert.notDeepEqual(different.decks.chance.remaining,original);
  const drawn=[];
  for(let i=0;i<30;i++){drawn.push(drawCard(g,'chance','a').id);g=JSON.parse(JSON.stringify(g));}
  assert.deepEqual(drawn,original);assert.equal(new Set(drawn).size,30);
  const cycle=Array.from({length:29},()=>drawCard(g,'chance','b').id);
  assert.equal(new Set(cycle).size,29);assert.ok(!cycle.includes('chance-escape'));
  returnHeldCard(g,'a');assert.equal(drawCard(g,'chance','b').id,'chance-escape');
  assert.equal(g.decks.chance.held['chance-escape'],'b');
});
test('movement collects GO, resolves destination rent/purchase, and exposes both card and landing',()=>{
  let g=land('chance-move-0');assert.equal(g.players.a.position,0);assert.equal(g.players.a.cash,1700);
  g=play();g.owners={5:'b'};g=land('chance-move-1','chance',g);
  assert.equal(g.players.a.position,5);assert.equal(g.players.a.cash,1675);assert.equal(g.players.b.cash,1525);
  assert.equal(g.lastLanding.cards[0].id,'chance-move-1');assert.equal(g.lastLanding.visits.at(-1).ownerId,'b');
  g=land('chance-move-3');assert.equal(g.phase,'purchase');assert.equal(g.players.a.position,13);
  g=land('chance-detain');assert.equal(g.players.a.position,10);assert.equal(g.players.a.detained,true);assert.equal(g.players.a.cash,1500);
});
test('back-three draws a second card at community and resolves financial debt',()=>{
  let g=play();g.players.a.position=33;g.players.a.cash=10;
  top(g,'chance','chance-back');top(g,'community','community-money-9');
  g=act(g,'roll',a,{dice:[1,2]});
  assert.equal(g.players.a.position,33);assert.equal(g.lastLanding.cards.length,2);
  assert.equal(g.debt.amount,100);assert.equal(g.debt.creditorId,null);assert.equal(g.players.a.cash,10);
  assert.throws(()=>act(g,'end-turn'));
});
test('gifts are bank-funded and romantic responses never affect finances or turns',()=>{
  let g=land('community-gift-0','community');assert.equal(g.players.a.cash,1700);assert.equal(g.players.b.cash,1525);
  g=land('chance-romance-0');const id=Object.keys(g.romanticInbox)[0];
  assert.equal(g.phase,'end');assert.equal(g.players.a.cash,1500);
  const before=structuredClone(g.players);assert.throws(()=>act(g,'romance-respond',a,{invitationId:id,response:'accepted'}));
  g=act(g,'end-turn');g=act(g,'romance-respond',b,{invitationId:id,response:'declined'});
  assert.deepEqual(g.players,before);assert.equal(g.turn,'b');assert.equal(g.romanticInbox[id].status,'declined');
  assert.throws(()=>act(g,'romance-respond',b,{invitationId:id,response:'accepted'}));
  g=land('chance-romance-1');const afterId=Object.keys(g.romanticInbox)[0];g=act(g,'surrender');
  const winner=g.winner;g=act(g,'romance-respond',b,{invitationId:afterId,response:'accepted'});
  assert.equal(g.status,'finished');assert.equal(g.winner,winner);assert.equal(g.players.b.cash,1500);
});
test('kept cards trade by deck identity, stay out of cycles, and return on use',()=>{
  let g=land('chance-escape');top(g,'community','community-escape');drawCard(g,'community','b');g.players.b.detentionCards=1;
  const side={cash:0,cards:1,properties:[]};g=act(g,'trade-offer',a,{give:side,receive:side});const tradeId=g.lastCommandId;
  g=act(g,'trade-accept',b,{tradeId});assert.equal(g.decks.chance.held['chance-escape'],'b');assert.equal(g.decks.community.held['community-escape'],'a');
  g.turn='b';g.phase='roll';g.players.b.detained=true;g=act(g,'detention-card',b);
  assert.equal(g.players.b.detentionCards,0);assert.equal(g.decks.chance.held['chance-escape'],undefined);assert.equal(g.decks.chance.remaining.at(-1),'chance-escape');
});
test('bankruptcy counts buildings at half, available mortgages, cash, and never counts existing mortgages twice',()=>{
  let g=play();g.players.a.cash=10;g.owners={1:'a',3:'a',6:'a'};g.buildings={1:5,3:4,6:4};g.mortgages={6:true};
  assert.equal(liquidationValue(g,'a'),395);
  g.debt={playerId:'a',amount:395,creditorId:'b'};assert.throws(()=>act(g,'bankrupt'),/selling buildings/);
  g.debt.amount=396;g=act(g,'bankrupt');assert.equal(g.winner,'b');assert.equal(g.owners[1],'b');assert.equal(g.mortgages[6],true);assert.equal(g.players.b.cash,1835);
  g=play();g.players.a.cash=0;g.owners={1:'a'};g.debt={playerId:'a',amount:200,creditorId:null};g=act(g,'bankrupt');assert.equal(g.owners[1],undefined);
});
test('roll retry is deterministic and old saves initialize decks without resetting other state',()=>{
  const g=play();g.owners={1:'b'};
  const command={type:'roll',user:a,id:'retry-roll',now:123,expectedGameId:g.id,expectedRevision:g.revision,dice:[1,2]};
  const next=updateLovopoly(g,command);assert.deepEqual(updateLovopoly(g,command),next);assert.deepEqual(updateLovopoly(next,command),next);
  assert.equal(next.owners[1],'b');assert.equal(next.lastLanding.cards.length,1);assert.equal(g.decks,undefined);
});
