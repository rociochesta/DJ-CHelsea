import test from 'node:test';
import assert from 'node:assert/strict';
import { createReveal,revealSummary,updateRevealGame,revealCells,revealProgress,canReceiveReveal,validateRevealAsset,validateRevealReply } from './revealGame.js';
const sender={id:'a',name:'Alex'},receiver={id:'b',name:'Rocio'};
const initial=(difficulty='quick',recipient=receiver)=>createReveal({id:'reveal',user:sender,recipient,difficulty,seed:42,now:100});
const command=(type,game,extra={})=>({type,id:`${type}-${game.revision}`,user:receiver,now:1000+game.revision*1000,expectedRevision:game.revision,...extra});
const flip=(game,index)=>updateRevealGame(game,command('flip',game,{index}));
const settle=game=>updateRevealGame(game,command('settle',game,{now:game.resolveAt}));

test('both difficulties produce exactly two cards per pair and a deterministic layout',()=>{
  for(const difficulty of ['quick','full']){
    const game=initial(difficulty),deck=revealCells(game),pairs=difficulty==='quick'?6:8;
    assert.equal(deck.length,pairs*2);
    for(let i=0;i<pairs;i++)assert.equal(deck.filter(pair=>pair===i).length,2);
    assert.deepEqual(initial(difficulty).deck,deck);
    assert.equal(game.status,'waiting');assert.equal(revealProgress(game),0);
  }
});
test('sender cannot play; only the recipient can flip, and an open reveal claims its first receiver',()=>{
  const game=initial();assert.equal(canReceiveReveal(game,'a'),false);assert.equal(canReceiveReveal(game,'b'),true);assert.equal(canReceiveReveal(game,'c'),false);
  assert.throws(()=>updateRevealGame(game,command('flip',game,{user:sender,index:0})),/someone else/);
  assert.throws(()=>updateRevealGame(game,command('flip',game,{user:{id:'c'},index:0})),/someone else/);
  const open=initial('quick',null),claimed=flip(open,0);
  assert.equal(claimed.recipientId,'b');assert.equal(claimed.recipientName,'Rocio');assert.equal(canReceiveReveal(claimed,'c'),false);
});
test('a match reveals both cells, persists through a reload, and cannot be played twice',()=>{
  const game=initial(),deck=revealCells(game),first=0,second=deck.findIndex((pair,i)=>i!==first&&pair===deck[first]);
  const pending=flip(flip(game,first),second);
  assert.deepEqual(pending.flipped,[first,second]);assert.deepEqual(pending.matched,{});
  assert.throws(()=>updateRevealGame(pending,command('settle',pending,{now:pending.resolveAt-1})),/still turning/);
  const next=settle(JSON.parse(JSON.stringify(pending)));
  assert.equal(next.matched[first],true);assert.equal(next.matched[second],true);
  assert.equal(next.attempts,1);assert.equal(revealProgress(next),1/6);assert.equal(next.resolveAt,undefined);
  assert.throws(()=>flip(next,first),/face-down/);
});
test('a mismatch returns both cards face down and no third card may open while resolving',()=>{
  const game=initial(),deck=revealCells(game),other=deck.findIndex(pair=>pair!==deck[0]);
  const pending=flip(flip(game,0),other);
  assert.throws(()=>flip(pending,deck.findIndex((_,i)=>i!==0&&i!==other)),/flip back/);
  const next=settle(pending);assert.deepEqual(next.flipped,[]);assert.deepEqual(next.matched,{});assert.equal(next.attempts,1);
  assert.equal(flip(next,0).flipped[0],0);
});
test('final pair completes the reveal; all cells and completion time survive serialization',()=>{
  for(const difficulty of ['quick','full']){
    let game=initial(difficulty);const deck=revealCells(game),pairs=deck.length/2;
    for(let pair=0;pair<pairs;pair++){
      const indices=deck.map((value,i)=>value===pair?i:-1).filter(i=>i>=0);
      game=settle(flip(flip(game,indices[0]),indices[1]));
    }
    game=JSON.parse(JSON.stringify(game));assert.equal(game.status,'complete');assert.equal(revealProgress(game),1);assert.ok(game.completedAt);
    assert.throws(()=>flip(game,0),/already uncovered/);
  }
});
test('stale tabs and invalid indices are rejected; transaction retries cannot flip twice',()=>{
  const game=initial(),action=command('flip',game,{index:0}),next=updateRevealGame(game,action);
  assert.deepEqual(updateRevealGame(next,action),next);
  assert.throws(()=>updateRevealGame(next,command('flip',next,{index:1,expectedRevision:0})),/another tab/);
  for(const index of [-1,12,1.5])assert.throws(()=>flip(game,index),/face-down/);
  assert.throws(()=>flip(next,0),/face-down/);
});
test('inbox summaries contain no picture, note, or card answers and report actual progress',()=>{
  const summary=revealSummary(initial());assert.equal(summary.progress,0);assert.equal(summary.deck,undefined);assert.equal(summary.asset,undefined);assert.equal(summary.revision,0);
});
test('photo/text validation rejects unsafe assets, empty notes and unsupported styles',()=>{
  assert.deepEqual(validateRevealAsset({type:'photo',url:'data:image/png;base64,YQ=='}),{type:'photo',url:'data:image/png;base64,YQ=='});
  assert.equal(validateRevealAsset({type:'text',text:' Hello ❤️ ',style:'rose',font:'letter'}).text,'Hello ❤️');
  for(const asset of [{type:'photo',url:'javascript:alert(1)'},{type:'photo',url:'data:image/svg+xml;base64,YQ=='},{type:'text',text:' ',style:'rose',font:'letter'},{type:'text',text:'hi',style:'nope',font:'letter'}])assert.throws(()=>validateRevealAsset(asset));
});
test('reply validation supports voice, pictures, GIF attribution and text with size limits',()=>{
  const reply=validateRevealReply([{type:'text',text:' Love it '},{type:'audio',url:'data:audio/webm;codecs=opus;base64,YQ=='},{type:'image',url:'https://media.giphy.com/a.gif',giphyId:'a',sourceUrl:'https://giphy.com/gifs/a'}]);
  assert.equal(reply[0].text,'Love it');assert.equal(reply[1].type,'audio');assert.equal(reply[2].giphyId,'a');
  assert.throws(()=>validateRevealReply([]));assert.throws(()=>validateRevealReply([{type:'image',url:'javascript:alert(1)'}]));assert.throws(()=>validateRevealReply([{type:'audio',url:'https://example.com/a'}]));
});
