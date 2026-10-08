import test from 'node:test';
import assert from 'node:assert/strict';
import { WHEEL_THEMES,wheelPuzzle } from './wheelPhrases.js';
import { WHEEL_SEGMENTS,normalizeSolution,canTakeWheelTurn,wheelSpinResult,updateWheelGame } from './wheelGame.js';
const a={id:'a',name:'Alex'}, b={id:'b',name:'Sam'};
const command=(type,game,user=a,extra={})=>({type,id:`${type}-${game?.revision||0}`,user,now:100+(game?.revision||0),seed:42,expectedGameId:game?.id||null,expectedRevision:game?.revision,...extra});
const start=(themeId='spicy')=>updateWheelGame(null,command('start',null,a,{id:'game',themeId}));
const join=game=>updateWheelGame(game,command('join',game,b));
const seedFor=(game,type,count)=>{for(let seed=0;seed<1000000;seed+=1000){const result=wheelSpinResult(game,seed);if(result.type===type&&(!count||result.count===count))return seed;}throw Error('Missing segment');};
const spin=(game,type='vowel',count=1)=>updateWheelGame(game,command('spin',game,a,{seed:seedFor(game,type,count)}));
const pickAll=game=>{while(game.turnPhase==='pick')game=updateWheelGame(game,command('pick',game,a,{letter:Object.values(game.revealOffer.options)[0]}));return game;};

test('seven themes have 140 unique puzzles, 20 spicy phrases and 90s music',()=>{
  assert.equal(WHEEL_THEMES.length,7);const puzzles=WHEEL_THEMES.flatMap(t=>t.phrases);
  assert.equal(puzzles.length,140);assert.equal(new Set(puzzles.map(p=>p.id)).size,140);
  assert.equal(new Set(puzzles.map(p=>p.answer)).size,140);
  for(const theme of WHEEL_THEMES){assert.equal(theme.phrases.length,20);for(const p of theme.phrases)assert.ok(normalizeSolution(p.answer));}
  for(const p of WHEEL_THEMES[1].phrases)assert.ok(p.year>=1990&&p.year<=1999&&p.artist);
});
test('wheel offers each count and spinning does not automatically reveal letters',()=>{
  const game=join(start());
  for(const segment of WHEEL_SEGMENTS){
    const next=spin(game,segment.type,segment.count);
    assert.deepEqual(next.revealed,{});assert.deepEqual(next.guessed,{});
    if(segment.type==='lose'){assert.equal(next.turn,'b');continue;}
    assert.equal(next.turn,'a');assert.equal(next.turnPhase,'pick');
    assert.equal(next.revealOffer.remaining,segment.count);
    assert.equal(new Set(next.revealOffer.options).size,next.revealOffer.options.length);
    for(const letter of next.revealOffer.options)assert.equal('AEIOU'.includes(letter),segment.type==='vowel');
  }
});
test('manual vowels reveal matching positions or record a miss and decrement the quota',()=>{
  const game={...join(start()),puzzleId:'music-1',themeId:'music'}; // NO SCRUBS: O,U present; A absent
  let next=spin(game,'vowel',2);
  const action=command('pick',next,a,{letter:'O'});
  next=updateWheelGame(next,action);assert.equal(next.revealed.O,true);assert.equal(next.revealOffer.remaining,1);
  assert.deepEqual(updateWheelGame(next,action),next);
  next=updateWheelGame(next,command('pick',next,a,{letter:'A'}));
  assert.equal(next.revealed.A,undefined);assert.equal(next.guessed.A,true);
  assert.equal(next.turnPhase,'after-reveal');assert.equal(next.turn,'a');
});
test('letter offer keeps a 7 present / 3 absent mix when both pools support it',()=>{
  const game={...join(start()),puzzleId:'spicy-Phrase-0'};
  const result=wheelSpinResult(game,seedFor(game,'letter',3));
  assert.equal(result.options.length,10);
  assert.equal(result.options.filter(letter=>wheelPuzzle(game).answer.includes(letter)).length,7);
  const next=spin(game,'letter',3);
  const absent=next.revealOffer.options.find(letter=>!wheelPuzzle(game).answer.includes(letter));
  const picked=updateWheelGame(next,command('pick',next,a,{letter:absent}));
  assert.equal(picked.guessed[absent],true);assert.equal(picked.revealed[absent],undefined);
});
test('choice phase survives late joins and Firebase round trips; first turn ends only after pass or solve',()=>{
  let game=spin(start(),'vowel',2);
  assert.equal(canTakeWheelTurn(game,'a'),true);
  assert.equal(join(JSON.parse(JSON.stringify(game))).turn,'a');
  game=pickAll(JSON.parse(JSON.stringify(game)));
  assert.equal(game.turnPhase,'after-reveal');assert.equal(game.turn,'a');
  game=updateWheelGame(game,command('pass',game));
  assert.equal(game.turn,'');assert.equal(join(game).turn,'b');
});
test('pick count, available letters, turn ownership and phases are enforced',()=>{
  const game=spin(join(start()),'vowel',2);
  assert.throws(()=>updateWheelGame(game,command('spin',game)),/once per turn/);
  assert.throws(()=>updateWheelGame(game,command('pass',game)),/Spin before/);
  assert.throws(()=>updateWheelGame(game,command('solve',game,a,{solution:wheelPuzzle(game).answer})),/Choose your letters/);
  assert.throws(()=>updateWheelGame(game,command('pick',game,a,{letter:'Z'})),/available letter/);
  assert.throws(()=>updateWheelGame(game,command('pick',game,b,{letter:'A'})),/not your turn/);
  const picked=updateWheelGame(game,command('pick',game,a,{letter:'A'}));
  assert.throws(()=>updateWheelGame(picked,command('pick',picked,a,{letter:'A'})),/available letter/);
  const completed=pickAll(picked);
  assert.throws(()=>updateWheelGame(completed,command('pick',completed,a,{letter:'I'})),/available letter/);
});
test('already guessed vowels and consonants are not offered; exhausted vowels allow solve or pass',()=>{
  const game={...join(start()),guessed:{A:true,E:true,I:true,O:true,U:true,Z:true},revealed:{}};
  const vowels=spin(game,'vowel',2);assert.equal(vowels.turnPhase,'after-reveal');assert.equal(vowels.revealOffer.remaining,0);
  const letters=spin(game,'letter',3);assert.ok(!letters.revealOffer.options.includes('Z'));
});
test('correct solutions win before spinning or after picking; wrong answers pass and do not share guesses',()=>{
  const game=join(start());
  const picked=pickAll(spin(game));
  const won=updateWheelGame(picked,command('solve',picked,a,{solution:wheelPuzzle(game).answer.toLowerCase()+'!'}));
  assert.equal(won.winnerId,'a');assert.equal(won.status,'finished');
  const wrong=updateWheelGame(picked,command('solve',picked,a,{solution:'WRONG'}));
  assert.equal(wrong.turn,'b');assert.equal(wrong.turnPhase,'choice');assert.equal(wrong.lastMove.solution,undefined);
  assert.throws(()=>updateWheelGame(game,command('solve',game,a,{solution:' '})),/Type your solution/);
  const solo=start();assert.equal(updateWheelGame(solo,command('solve',solo,a,{solution:wheelPuzzle(solo).answer})).winnerId,'a');
});
test('stale actions and third players are rejected and finished games cannot take turns',()=>{
  const game=join(start());
  assert.throws(()=>updateWheelGame(game,command('spin',game,a,{expectedRevision:0})),/turn changed/);
  assert.throws(()=>updateWheelGame(game,command('spin',game,a,{expectedGameId:'other'})),/game changed/);
  assert.throws(()=>updateWheelGame(game,command('join',game,{id:'third'})),/two players/);
  const finished=updateWheelGame(game,command('finish',game,b));
  assert.throws(()=>updateWheelGame(finished,command('spin',finished)),/not your turn/);
});
test('manual finish archives results and every theme uses unseen puzzles before repeats',()=>{
  for(const theme of WHEEL_THEMES){let game=null;const seen=new Set();for(let i=0;i<21;i++){
    game=updateWheelGame(game,command('start',game,a,{id:`${theme.id}-${i}`,themeId:theme.id}));
    if(i<20){assert.ok(!seen.has(game.puzzleId));seen.add(game.puzzleId);}
    game=updateWheelGame(game,command('finish',game));assert.equal(game.status,'finished');
  }assert.equal(seen.size,20);assert.equal(Object.keys(game.history).length,20);}
});
