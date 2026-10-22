import test from 'node:test';
import assert from 'node:assert/strict';
import {ESCAPE_CHALLENGES,prepareEscapeChoices,recordChallengeCompletion} from './lovopolyChallenges.js';
import {enterDetention} from './lovopolyRomance.js';
import {updateLovopoly} from './lovopoly.js';
const a={id:'a',name:'A'},b={id:'b',name:'B'};let serial=0;
const game=()=>({id:'collection-game',revision:0,status:'playing',mode:'classic',phase:'roll',turn:'a',players:{a:{...a,token:'heart',cash:1500,position:10,detained:true,detentionId:'stay-1'},b:{...b,token:'kiss',cash:1500,position:0}},events:{}});
const act=(g,type,user=a,extra={})=>updateLovopoly(g,{id:`challenge-${++serial}`,now:serial,type,user,expectedGameId:g.id,expectedRevision:g.revision,...extra});
const send=g=>{g=act(g,'detention-options');return act(g,'detention-challenge',a,{challengeId:g.players.a.detentionChoices[0]});};
const submit=(g,id)=>act(g,'romance-submit',a,{invitationId:id,text:'A little romantic response.'});

test('collection has 30 unique texts and IDs, exactly 20 B and 10 C',()=>{
  assert.equal(ESCAPE_CHALLENGES.length,30);
  for(const key of ['id','title','text'])assert.equal(new Set(ESCAPE_CHALLENGES.map(c=>c[key])).size,30);
  assert.equal(ESCAPE_CHALLENGES.filter(c=>c.tone==='B').length,20);assert.equal(ESCAPE_CHALLENGES.filter(c=>c.tone==='C').length,10);
});
test('legacy and new detentions retain three unique choices through reload and repeated requests',()=>{
  let g=game();delete g.players.a.detentionId;g=act(g,'detention-options');const ids=[...g.players.a.detentionChoices];
  assert.equal(new Set(ids).size,3);g=JSON.parse(JSON.stringify(g));g=act(g,'detention-options');assert.deepEqual(g.players.a.detentionChoices,ids);
  assert.throws(()=>act(g,'detention-challenge',a,{challengeId:'fake'}));
  const other=ESCAPE_CHALLENGES.find(c=>!ids.includes(c.id));assert.throws(()=>act(g,'detention-challenge',a,{challengeId:other.id}));
  g=act(g,'detention-challenge',a,{challengeId:ids[1]});const invitationId=g.lastCommandId;
  assert.equal(g.romanticInbox[invitationId].challengeId,ids[1]);assert.throws(()=>act(g,'detention-options'));
  g=act(g,'romance-respond',b,{invitationId,response:'declined'});assert.throws(()=>act(g,'detention-challenge',a,{challengeId:ids[0]}));
  enterDetention(g.players.a,'stay-2');g=act(g,'detention-options');assert.equal(g.players.a.detentionChoices.length,3);assert.equal(g.players.a.detentionChallengeId,null);
});
test('choice priority uses confirmed completions per player and fills three slots near cycle end',()=>{
  let g=game();g.escapeProgress={a:{cycle:1,completed:Object.fromEntries(ESCAPE_CHALLENGES.slice(0,27).map(c=>[c.id,true]))}};
  prepareEscapeChoices(g,g.players.a);assert.deepEqual(new Set(g.players.a.detentionChoices),new Set(ESCAPE_CHALLENGES.slice(27).map(c=>c.id)));
  enterDetention(g.players.a,'stay-2');g.escapeProgress.a.completed[ESCAPE_CHALLENGES[27].id]=true;g.escapeProgress.a.completed[ESCAPE_CHALLENGES[28].id]=true;
  prepareEscapeChoices(g,g.players.a);assert.equal(g.players.a.detentionChoices[0],ESCAPE_CHALLENGES[29].id);assert.equal(g.players.a.detentionChoices.length,3);
  enterDetention(g.players.b,'stay-b');prepareEscapeChoices(g,g.players.b);assert.deepEqual(g.escapeProgress.b.completed,{});
});
test('acceptance and submission do not count; confirmation counts once and survives rematch without carrying escape effects',()=>{
  let g=send(game());const id=g.lastCommandId,chosen=g.romanticInbox[id].challengeId;
  g=act(g,'romance-respond',b,{invitationId:id,response:'accepted'});assert.deepEqual(g.escapeProgress.a.completed,{});
  g=submit(g,id);assert.deepEqual(g.escapeProgress.a.completed,{});
  assert.throws(()=>act(g,'romance-confirm',a,{invitationId:id}));
  g=act(g,'romance-confirm',b,{invitationId:id});assert.equal(g.escapeProgress.a.completed[chosen],true);assert.equal(g.players.a.romanticReleaseId,'stay-1');
  assert.throws(()=>act(g,'romance-confirm',b,{invitationId:id}));
  g=act(g,'surrender');g=act(g,'rematch-request');g=act(g,'rematch-accept',b);
  assert.equal(g.escapeProgress.a.completed[chosen],true);assert.equal(g.romanticInbox[id].status,'completed');assert.equal(g.players.a.romanticReleaseId,undefined);
});
test('all 30 completions start a fresh cycle on next selection and retain conversation history',()=>{
  const g=game();g.escapeProgress={a:{cycle:2,completed:Object.fromEntries(ESCAPE_CHALLENGES.map(c=>[c.id,true]))}};g.romanticInbox={old:{id:'old',status:'completed'}};
  prepareEscapeChoices(g,g.players.a);assert.equal(g.escapeProgress.a.cycle,3);assert.deepEqual(g.escapeProgress.a.completed,{});assert.equal(g.romanticInbox.old.status,'completed');
  recordChallengeCompletion(g,{from:'a',challengeId:ESCAPE_CHALLENGES[0].id,challengeCycle:2});assert.deepEqual(g.escapeProgress.a.completed,{});
  recordChallengeCompletion(g,{from:'a',challengeId:ESCAPE_CHALLENGES[0].id,challengeCycle:3});assert.equal(Object.keys(g.escapeProgress.a.completed).length,1);
});
test('late confirmation after a rematch records progress but never releases a new detention',()=>{
  let g=send(game());const id=g.lastCommandId,chosen=g.romanticInbox[id].challengeId;g=submit(g,id);g=act(g,'surrender');g=act(g,'rematch-request');g=act(g,'rematch-accept',b);
  enterDetention(g.players.a,'new-stay');g=act(g,'romance-confirm',b,{invitationId:id});assert.equal(g.escapeProgress.a.completed[chosen],true);assert.equal(g.players.a.romanticReleaseId,null);
});
test('a pending or declined challenge does not block paying before rolling; confirmation waits for actual next turn',()=>{
  let g=send(game());const id=g.lastCommandId;g=act(g,'romance-respond',b,{invitationId:id,response:'declined'});g=act(g,'detention-pay');assert.equal(g.players.a.cash,1450);assert.equal(g.players.a.detained,false);
  g=send(game());const otherId=g.lastCommandId;g=submit(g,otherId);g.turn='b';g.phase='end';g.extraRoll=true;
  g=act(g,'romance-confirm',b,{invitationId:otherId});g=act(g,'end-turn',b);assert.equal(g.turn,'b');assert.equal(g.players.a.detained,true);
  g.phase='end';g=act(g,'end-turn',b);assert.equal(g.turn,'a');assert.equal(g.players.a.detained,false);assert.equal(g.players.a.cash,1500);
});
