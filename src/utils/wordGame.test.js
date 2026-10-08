import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { makeBag, seededRandom, evaluateWordMove, updateWordGame, canPlayWordTurn } from './wordGame.js';

const dictionary = new Set(['AT','CAT','CATS','TO','IT','TA','A','HELLO','READING','ZA','QUIZ']);
const a = { id:'a',name:'Alex' }, b = { id:'b',name:'Sam' };
const command = (type,game,user = a,extra = {}) => ({ type,id:`${type}-${game?.revision || 0}`,user,now:123,seed:42,expectedGameId:game?.id || null,expectedRevision:game?.revision,...extra });
const begin = () => updateWordGame(null,command('start',null,a,{ id:'game' }));
const joined = () => { const game = begin(); return updateWordGame(game,command('join',game,b)); };
const fixture = (letters = 'CAT',board = {}) => ({ ...joined(),board,players:{ a:{ ...joined().players.a,rack:letters.split('').map((letter,index) => ({ id:`tile-${index}`,letter })) },b:joined().players.b } });
const move = (letters,row = 7,col = 6) => letters.split('').map((letter,index) => ({ row,col:col+index,letter,tileId:`tile-${index}` }));

test('100 unique tiles, two blanks, and reproducible transaction shuffle', () => {
  const bag = makeBag(seededRandom(42));
  assert.equal(bag.length,100);
  assert.equal(new Set(bag.map(tile => tile.id)).size,100);
  assert.equal(bag.filter(tile => tile.letter === '?').length,2);
  assert.deepEqual(makeBag(seededRandom(42)),bag);
});
test('game starts without the other person online, joining deals seven and chooses first player', () => {
  const game = begin();
  assert.equal(game.status,'waiting'); assert.equal(game.bag.length,93); assert.equal(game.players.a.rack.length,7);
  assert.throws(() => updateWordGame(game,command('start',game)),/already a game/);
  const otherStarts = updateWordGame(null,command('start',null,a,{ id:'game',starter:'other' }));
  const next = updateWordGame(otherStarts,command('join',otherStarts,b));
  assert.equal(next.turn,'b'); assert.equal(next.status,'playing'); assert.equal(next.bag.length,86);
  assert.throws(() => updateWordGame(next,command('join',next,{ id:'c' })),/two players/);
});
test('starter can play once before the other person joins, then their person takes the next turn', () => {
  const initial = begin();
  const game = { ...initial,players:{ a:{ ...initial.players.a,rack:'CATLOVE'.split('').map((letter,index) => ({ id:`tile-${index}`,letter })) } } };
  assert.equal(canPlayWordTurn(game,'a'),true);
  const action = command('play',game,a,{ placements:move('CAT') });
  const played = updateWordGame(game,action,dictionary);
  assert.equal(played.players.a.score,10);
  assert.equal(played.status,'waiting'); assert.equal(played.turn,'');
  assert.equal(canPlayWordTurn(played,'a'),false);
  assert.throws(() => updateWordGame(played,command('pass',played,a)),/not your turn/);
  assert.deepEqual(updateWordGame(played,action,dictionary),played);
  const next = updateWordGame(JSON.parse(JSON.stringify(played)),command('join',played,b));
  assert.equal(next.turn,'b'); assert.equal(next.status,'playing');
  assert.equal(next.board['7_7'].letter,'A'); assert.equal(next.players.a.score,10);
  assert.equal(next.players.b.rack.length,7); assert.equal(next.bag.length,83);
});
test('choosing the other person to start still waits for them; pass before joining hands off correctly', () => {
  const otherStarts = updateWordGame(null,command('start',null,a,{ id:'game',starter:'other' }));
  assert.equal(canPlayWordTurn(otherStarts,'a'),false);
  assert.throws(() => updateWordGame(otherStarts,command('pass',otherStarts)),/not your turn/);
  const initial = begin();
  const passed = updateWordGame(initial,command('pass',initial));
  assert.equal(passed.turn,'');
  assert.equal(updateWordGame(passed,command('join',passed,b)).turn,'b');
});
test('either player can finish without changing scores, and stale or outsider finishes are rejected', () => {
  const game = { ...joined(),players:{ ...joined().players,a:{ ...joined().players.a,score:10 },b:{ ...joined().players.b,score:7 } } };
  const action = command('finish',game,b);
  const result = updateWordGame(game,action);
  assert.equal(result.status,'finished'); assert.equal(result.turn,''); assert.equal(result.finishedBy,'b');
  assert.equal(result.players.a.score,10); assert.equal(result.players.b.score,7);
  assert.deepEqual(result.board,game.board); assert.deepEqual(result.moves,game.moves);
  assert.deepEqual(updateWordGame(result,action),result);
  assert.throws(() => updateWordGame(game,command('finish',game,{ id:'outsider' })),/Only a player/);
  assert.throws(() => updateWordGame(game,command('finish',game,a,{ expectedRevision:0 })),/move was made/);
  assert.equal(updateWordGame(begin(),command('finish',begin())).status,'finished');
  const rematch = updateWordGame(result,command('start',result,a,{ id:'next-game' }));
  assert.equal(rematch.history.game.players.a.score,10);
});
test('first word must cross center; double word score, refill, turn transfer and retry safety', () => {
  const game = fixture();
  assert.throws(() => evaluateWordMove(game,'a',move('CAT',1,1),dictionary),/center/);
  const action = command('play',game,a,{ placements:move('CAT') });
  const next = updateWordGame(game,action,dictionary);
  assert.equal(next.players.a.score,10); assert.equal(next.turn,'b'); assert.equal(next.players.a.rack.length,7);
  assert.equal(next.lastMove.words[0].word,'CAT');
  assert.deepEqual(updateWordGame(next,action,dictionary),next);
  assert.equal(game.players.a.rack.length,3); assert.equal(Object.keys(game.board).length,0);
});
test('invalid dictionary words, diagonals, gaps, duplicate tiles and occupied squares are rejected', () => {
  const game = fixture('CAT');
  assert.throws(() => evaluateWordMove(game,'a',move('CAT'),new Set()),/dictionary/);
  assert.throws(() => evaluateWordMove(game,'a',[{ ...move('CAT')[0] },{ ...move('CAT')[1],row:8 }],dictionary),/row or one column/);
  assert.throws(() => evaluateWordMove(game,'a',[move('CAT')[0],{ ...move('CAT')[1],col:8 }],dictionary),/gaps/);
  assert.throws(() => evaluateWordMove(game,'a',[move('CAT')[0],{ ...move('CAT')[1],tileId:'tile-0' }],dictionary),/rack only/);
  assert.throws(() => evaluateWordMove(fixture('CAT',{ '7_7':{ letter:'A' } }),'a',move('CAT'),dictionary),/already has/);
});
test('later words must connect, premium squares are not reused, and every cross word is scored', () => {
  const board = { '7_6':{ letter:'C' },'7_7':{ letter:'A' },'7_8':{ letter:'T' } };
  const game = fixture('S',board);
  const extended = evaluateWordMove(game,'a',[{ row:7,col:9,tileId:'tile-0',letter:'S' }],dictionary);
  assert.equal(extended.score,6); // center multiplier was already used
  assert.equal(extended.words[0].word,'CATS');
  assert.throws(() => evaluateWordMove(fixture('AT',board),'a',move('AT',0,0),dictionary),/Connect/);
  const crossing = fixture('AT',{ '6_6':{ letter:'T' },'6_7':{ letter:'I' } });
  const result = evaluateWordMove(crossing,'a',move('AT'),dictionary);
  assert.deepEqual(result.words.map(word => word.word).sort(),['AT','IT','TA']);
  assert.equal(result.score,10);
});
test('invalid cross word rejects the whole play; blanks score zero', () => {
  const game = fixture('AT',{ '6_6':{ letter:'Z' },'6_7':{ letter:'Q' } });
  assert.throws(() => evaluateWordMove(game,'a',move('AT'),dictionary),/QT/);
  const blank = fixture('?AT');
  const moves = move('CAT');
  const result = evaluateWordMove(blank,'a',moves,dictionary);
  assert.equal(result.board['7_6'].blank,true); assert.equal(result.score,4);
  assert.throws(() => evaluateWordMove(blank,'a',[{ ...moves[0],letter:'' },...moves.slice(1)],dictionary),/blank/);
});
test('seven letters earn 50 bonus points', () => {
  const result = evaluateWordMove(fixture('READING'),'a',move('READING',7,4),dictionary);
  assert.equal(result.bonus,50); assert.equal(result.score,68);
});
test('swapping preserves tile inventory and uses a turn; stale turns and other players are rejected', () => {
  const game = joined(), ids = game.players.a.rack.slice(0,3).map(tile => tile.id);
  const next = updateWordGame(game,command('swap',game,a,{ tileIds:ids }));
  assert.equal(next.turn,'b'); assert.equal(next.players.a.rack.length,7); assert.equal(next.bag.length,86);
  assert.equal(new Set([...next.bag,...next.players.a.rack,...next.players.b.rack].map(tile => tile.id)).size,100);
  assert.ok(!next.players.a.rack.some(tile => ids.includes(tile.id)));
  assert.throws(() => updateWordGame(next,command('pass',next,a)),/not your turn/);
  assert.throws(() => updateWordGame(next,command('pass',next,b,{ expectedRevision:game.revision })),/move was made/);
  assert.throws(() => updateWordGame(game,command('swap',game,a,{ tileIds:['fake'] })),/Select/);
  assert.throws(() => updateWordGame({ ...game,bag:game.bag.slice(0,6) },command('swap',game,a,{ tileIds:ids })),/seven letters/);
});
test('six scoreless turns finish and preserve results for the next game', () => {
  let game = joined();
  for (let i = 0; i < 6; i++) game = updateWordGame(game,command('pass',game,game.turn === 'a' ? a : b));
  assert.equal(game.status,'finished'); assert.equal(game.turn,'');
  const next = updateWordGame(game,command('start',game,a,{ id:'next-game' }));
  assert.deepEqual(next.history.game.players.a.score,game.players.a.score);
  assert.equal(next.status,'waiting');
});
test('empty bag and rack finish the game with remaining tiles transferred to the finisher', () => {
  const game = { ...fixture('CAT'),bag:[],players:{ ...fixture('CAT').players,b:{ id:'b',name:'Sam',score:10,rack:[{ id:'z',letter:'Z' }] } } };
  const next = updateWordGame(game,command('play',game,a,{ placements:move('CAT') }),dictionary);
  assert.equal(next.status,'finished'); assert.equal(next.players.a.score,20); assert.equal(next.players.b.score,0);
});
test('Firebase omitted empty objects/arrays still allow a first word and an empty-bag finish', () => {
  const game = fixture('CAT'); delete game.board; game.bag = undefined;
  const next = updateWordGame(game,command('play',game,a,{ placements:move('CAT') }),dictionary);
  assert.equal(next.status,'finished');
});
test('bundled English dictionary has common words and rejects nonsense', () => {
  const words = new Set(readFileSync(new URL('../../public/english-words.txt',import.meta.url),'utf8').split(/\s+/).filter(word => /^[a-z]{2,15}$/.test(word)));
  assert.ok(words.size > 100000);
  for (const word of ['hello','love','cat','quiz','at']) assert.ok(words.has(word),word);
  assert.ok(!words.has('zzzzz'));
});
