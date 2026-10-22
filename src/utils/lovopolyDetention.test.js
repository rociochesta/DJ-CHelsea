import test from 'node:test';
import assert from 'node:assert/strict';
import {updateLovopoly} from './lovopoly.js';
import {enterDetention,romancePending} from './lovopolyRomance.js';
import {prepareEscapeChoices} from './lovopolyChallenges.js';
const a={id:'a',name:'A'}, b={id:'b',name:'B'};
let serial=0;
const act=(g,type,user=a,extra={})=>updateLovopoly(g,{type,user,id:`test-${++serial}`,now:serial,expectedGameId:g.id,expectedRevision:g.revision,...extra});
const start=()=>({id:'test-game',revision:0,status:'playing',mode:'classic',turn:'a',phase:'roll',players:{a:{...a,cash:1500,position:10,detained:true,detentionId:'stay-1',token:'heart'},b:{...b,cash:1500,position:0,token:'kiss'}},owners:{},events:{}});
const nextAttempt=g=>{g=act(g,'end-turn');g.phase='end';return act(g,'end-turn',b);};
const invite=g=>{prepareEscapeChoices(g,g.players.a);return act(g,'detention-challenge',a,{challengeId:g.players.a.detentionChoices[0]});};
test('three failures: first two stay detained, third requires release with saved dice, never permits reroll',()=>{
  let g=start();
  for(let n=1;n<=3;n++){
    g=act(g,'roll',a,{dice:[1,2]});assert.equal(g.players.a.detentionAttempts,n);assert.equal(g.players.a.position,10);
    assert.throws(()=>act(g,'roll',a,{dice:[6,6]}));
    if(n<3){assert.throws(()=>act(g,'detention-pay'));g=nextAttempt(g);}
  }
  assert.equal(g.phase,'detention-release');assert.throws(()=>act(g,'end-turn'));
  g=JSON.parse(JSON.stringify(g));g=act(g,'detention-pay');
  assert.equal(g.players.a.position,13);assert.equal(g.players.a.cash,1450);assert.equal(g.players.a.detained,false);assert.equal(g.extraRoll,false);
  assert.equal(g.phase,'purchase');g=act(g,'pass');g=act(g,'end-turn');assert.equal(g.turn,'b');
});
test('doubles escape moves, resolves rent, never grants bonus; pre-roll payment/card restores normal doubles',()=>{
  let g=start();g.owners={14:'b'};g=act(g,'roll',a,{dice:[2,2]});
  assert.equal(g.players.a.position,14);assert.equal(g.players.a.cash,1490);assert.equal(g.extraRoll,false);g=act(g,'end-turn');assert.equal(g.turn,'b');
  for(const type of ['detention-pay','detention-card']){
    g=start();g.players.a.detentionCards=1;g=act(g,type);g=act(g,'roll',a,{dice:[2,2]});
    assert.equal(g.extraRoll,true);assert.equal(g.phase,'purchase');g=act(g,'pass');g=act(g,'end-turn');assert.equal(g.turn,'a');assert.equal(g.phase,'roll');
  }
});
test('third failure can use card instead of cash, even when insolvent',()=>{
  let g=start();g.players.a.detentionAttempts=2;g.players.a.cash=0;g.players.a.detentionCards=1;
  g=act(g,'roll',a,{dice:[1,2]});assert.equal(g.debt.reason,'detention');
  g=act(g,'detention-card');assert.equal(g.debt,null);assert.equal(g.players.a.position,13);assert.equal(g.players.a.cash,0);assert.equal(g.players.a.detentionCards,0);
});
test('debt settlement resumes saved movement and may create a new rent debt without reroll',()=>{
  let g=start();g.players.a.detentionAttempts=2;g.players.a.cash=0;g.owners={39:'a',13:'b'};g.buildings={13:5};
  g=act(g,'roll',a,{dice:[1,2]});g=act(g,'mortgage',a,{tileId:39});g=act(g,'settle-debt');
  assert.equal(g.players.a.position,13);assert.equal(g.players.a.cash,150);assert.equal(g.debt.creditorId,'b');assert.equal(g.debt.amount,750);assert.equal(g.detentionRoll,null);
  assert.throws(()=>act(g,'roll',a,{dice:[1,2]}));
});
test('messages and acceptance do not complete a gesture: performer submits, partner confirms, history preserves conversation',()=>{
  let g=start();g.romanticInbox={i:{id:'i',from:'a',to:'b',status:'pending',at:1,title:'A note',text:'Write a note'}};
  g=act(g,'romance-respond',b,{invitationId:'i',response:'accepted'});assert.equal(romancePending(g.romanticInbox.i),true);
  assert.throws(()=>act(g,'romance-confirm',b,{invitationId:'i'}));
  g=act(g,'romance-message',a,{invitationId:'i',text:'Thinking of you'});assert.equal(g.romanticInbox.i.status,'accepted');
  assert.throws(()=>act(g,'romance-submit',b,{invitationId:'i',text:'Cannot submit for you'}));
  assert.throws(()=>act(g,'romance-submit',a,{invitationId:'i',text:'   '}));
  g=act(g,'romance-submit',a,{invitationId:'i',text:'I sent you a sweet goodnight note.'});
  assert.equal(g.romanticInbox.i.status,'submitted');assert.throws(()=>act(g,'romance-confirm',a,{invitationId:'i'}));
  g=act(g,'romance-confirm',b,{invitationId:'i'});assert.equal(romancePending(g.romanticInbox.i),false);
  assert.equal(g.players.a.cash,1500);assert.equal(g.players.a.detained,true);
  g=act(g,'surrender');g=act(g,'romance-message',b,{invitationId:'i',text:'I loved it.'});assert.equal(Object.keys(g.romanticInbox.i.messages).length,3);
  assert.throws(()=>act(g,'romance-confirm',b,{invitationId:'i'}));
});
test('romantic escape is confirmed once per stay, effective next turn, never blocks ordinary attempts',()=>{
  let g=invite(start());const id=g.lastCommandId;
  assert.throws(()=>act(g,'detention-challenge'));
  g=act(g,'romance-submit',a,{invitationId:id,text:'I would love a sunset walk with you.'});
  g=act(g,'romance-confirm',b,{invitationId:id});assert.equal(g.players.a.detained,true);
  g=act(g,'roll',a,{dice:[1,2]});g=nextAttempt(g);assert.equal(g.players.a.detained,false);assert.equal(g.players.a.cash,1500);
  g=act(g,'roll',a,{dice:[2,2]});assert.equal(g.extraRoll,true);
});
test('late completion cannot free a new detention or change a finished match',()=>{
  for(const finished of [false,true]){
    let g=invite(start());const id=g.lastCommandId;
    g=act(g,'romance-submit',a,{invitationId:id,text:'A sweet memory'});
    if(finished)g=act(g,'surrender');else enterDetention(g.players.a,'stay-2');
    g=act(g,'romance-confirm',b,{invitationId:id});assert.ok(!g.players.a.romanticReleaseId);assert.equal(g.players.a.detained,true);
    assert.equal(g.romanticInbox[id].status,'completed');
  }
});
