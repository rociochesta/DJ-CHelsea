import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { LOVOPOLY_TILES, lovopolyTileLayout } from './lovopolyBoard.js';
import { rollLovopolyDice, updateLovopoly } from './lovopoly.js';
import { netWorth, describeTradeSide } from './lovopolyEconomy.js';

const a = { id: 'a', name: 'Rocio' }, b = { id: 'b', name: 'Chelsea' }, c = { id: 'c', name: 'Visitor' };
let serial = 0;
const act = (game, type, user = a, extra = {}) => updateLovopoly(game, {
  type, user, id: `cmd${++serial}`, now: serial, expectedGameId: game?.id || null,
  expectedRevision: game?.revision, ...extra,
});
const create = () => act(null, 'create', a, { mode: 'classic', token: 'heart' });
const joined = () => act(create(), 'join', b, { token: 'plane' });

test('all 40 original tile positions, eight color groups, and repeated artwork are mapped', () => {
  assert.equal(LOVOPOLY_TILES.length, 40);
  assert.deepEqual(LOVOPOLY_TILES.map(tile => tile.id), Array.from({ length: 40 }, (_, i) => i));
  const counts = {};
  for (const tile of LOVOPOLY_TILES) {
    if (tile.group) counts[tile.group] = (counts[tile.group] || 0) + 1;
    assert.ok(existsSync(new URL(`../../public${tile.image}`, import.meta.url)), tile.image);
    assert.ok(existsSync(new URL(`../../public${tile.thumbnail}`, import.meta.url)), tile.thumbnail);
    if (tile.overlay) assert.ok(existsSync(new URL(`../../public${tile.overlay}`, import.meta.url)));
  }
  assert.deepEqual(Object.values(counts), [3, 3, 3, 3, 2, 3, 3, 2]);
  assert.equal(LOVOPOLY_TILES.filter(tile => tile.type === 'station').length, 4);
  assert.equal(LOVOPOLY_TILES.filter(tile => tile.type === 'utility').length, 2);
  assert.equal(LOVOPOLY_TILES[2].image, LOVOPOLY_TILES[33].image);
  assert.equal(LOVOPOLY_TILES[7].image, LOVOPOLY_TILES[22].image);
});

test('board spaces fit around the center without overlapping or leaving gaps', () => {
  const layouts = LOVOPOLY_TILES.map(tile => lovopolyTileLayout(tile.id));
  assert.throws(() => lovopolyTileLayout(40));
  assert.throws(() => lovopolyTileLayout(-1));
  assert.equal(layouts.reduce((area, tile) => area + tile.w * tile.h, 0), 1250 * 1250 - 900 * 900);
  for (const [i, tile] of layouts.entries()) {
    assert.ok(tile.x >= 0 && tile.y >= 0 && tile.x + tile.w <= 1250 && tile.y + tile.h <= 1250);
    for (const other of layouts.slice(i + 1)) {
      assert.ok(tile.x >= other.x + other.w || other.x >= tile.x + tile.w || tile.y >= other.y + other.h || other.y >= tile.y + tile.h);
    }
  }
  assert.deepEqual([0, 10, 20, 30].map(i => [layouts[i].x, layouts[i].y]), [[1075, 1075], [0, 1075], [0, 0], [1075, 0]]);
});

test('one saved two-player setup with valid modes, unique tokens, and locked match settings', () => {
  let game = create();
  assert.equal(game.players.a.cash, 1500);
  assert.equal(game.players.a.position, 0);
  assert.throws(() => act(game, 'create', b, { mode: 'classic', token: 'ring' }));
  assert.throws(() => act(game, 'join', b, { token: 'heart' }));
  assert.throws(() => act(game, 'opening-roll', a, { dice: [6, 6] }));
  game = act(game, 'join', b, { token: 'plane' });
  assert.equal(game.status, 'opening');
  assert.throws(() => act(game, 'join', c, { token: 'rose' }));
  assert.throws(() => act(game, 'token', a, { token: 'plane' }));
  assert.throws(() => act(game, 'token', c, { token: 'rose' }));
  assert.throws(() => act(null, 'create', a, { mode: 'quick', roundLimit: 2, token: 'heart' }));
  assert.throws(() => act(null, 'create', a, { mode: 'invalid', token: 'heart' }));
  assert.throws(() => act(null, 'create', a, { mode: 'classic', token: 'invalid' }));
  for (const rounds of [10, 20, 30, 50]) assert.equal(act(null, 'create', a, { mode: 'quick', roundLimit: rounds, token: 'ring' }).roundLimit, rounds);
});

test('opening rolls survive serialization and choose highest roll without moving or paying money', () => {
  let game = joined();
  game = act(game, 'opening-roll', b, { dice: [2, 3] });
  game = JSON.parse(JSON.stringify(game));
  assert.throws(() => act(game, 'opening-roll', b, { dice: [6, 6] }));
  assert.throws(() => act(game, 'token', b, { token: 'ring' }));
  game = act(game, 'opening-roll', a, { dice: [4, 4] });
  assert.equal(game.status, 'ready');
  assert.equal(game.firstPlayerId, 'a');
  assert.equal(game.turn, 'a');
  assert.deepEqual(Object.values(game.players).map(player => [player.position, player.cash]), [[0, 1500], [0, 1500]]);
  assert.throws(() => act(game, 'opening-roll', a, { dice: [5, 6] }));
  assert.equal(act(game, 'roll', a, { dice: [5, 6] }).players.a.position, 11);
});

test('ties clear both rolls, preserve tie history, and permit each player exactly one new roll', () => {
  let game = act(joined(), 'opening-roll', a, { dice: [3, 4] });
  game = act(game, 'opening-roll', b, { dice: [2, 5] });
  assert.equal(game.status, 'opening');
  assert.equal(game.openingRound, 2);
  assert.deepEqual(game.openingRolls, {});
  assert.equal(game.lastOpeningTie.rolls.a.total, 7);
  // Firebase drops empty objects, which must not break the next round.
  delete game.openingRolls;
  game = act(game, 'opening-roll', a, { dice: [1, 2] });
  game = act(game, 'opening-roll', b, { dice: [5, 6] });
  assert.equal(game.firstPlayerId, 'b');
  assert.ok(Object.values(game.events).some(event => event.text.includes('tie')));
});

test('invalid dice, nonmembers, stale clients, and duplicate requests cannot overwrite a saved roll', () => {
  const game = joined();
  for (const dice of [[], [1], [0, 6], [1.5, 3], [7, 1], ['6', 2]]) assert.throws(() => act(game, 'opening-roll', a, { dice }));
  assert.throws(() => act(game, 'opening-roll', c, { dice: [6, 6] }));
  const command = { type: 'opening-roll', user: a, id: 'stable', now: 100, expectedGameId: game.id, expectedRevision: game.revision, dice: [3, 6] };
  const next = updateLovopoly(game, command);
  assert.deepEqual(updateLovopoly(next, command), next);
  assert.throws(() => updateLovopoly(next, { ...command, user: b, id: 'other' }));
  assert.throws(() => updateLovopoly(next, { ...command, id: 'new-game', expectedGameId: 'old-game' }));
  assert.equal(game.openingRolls.a, undefined, 'reducer must not mutate the original state');
});

test('cancellation is immediate only when alone; joined setup requires the other player', () => {
  assert.equal(act(create(), 'cancel-request').status, 'cancelled');
  let game = act(joined(), 'cancel-request');
  assert.equal(game.status, 'opening');
  assert.throws(() => act(game, 'cancel-accept', a));
  assert.throws(() => act(game, 'cancel-accept', c));
  game = act(game, 'cancel-decline', b);
  assert.equal(game.cancellation, null);
  game = act(game, 'cancel-request', b);
  game = act(game, 'cancel-accept', a);
  assert.equal(game.status, 'cancelled');
  assert.throws(() => act(game, 'create', c, { mode: 'classic', token: 'rose' }));
  const replacement = act(game, 'create', b, { mode: 'quick', roundLimit: 10, token: 'ring' });
  assert.equal(replacement.archives[game.id].status, 'cancelled');
  assert.equal(Object.keys(replacement.players).length, 1);
  assert.equal(replacement.mode, 'quick');
});

test('random dice reject biased byte values and produce valid two-dice results', () => {
  const bytes = [255, 252, 0, 251];
  const rng = { getRandomValues: array => { array[0] = bytes.shift(); return array; } };
  assert.deepEqual(rollLovopolyDice(rng), [1, 6]);
});

const ready = () => act(act(joined(), 'opening-roll', a, { dice: [6, 5] }), 'opening-roll', b, { dice: [1, 2] });

test('Firebase omitted empty property arrays do not crash gift display or prevent acceptance',()=>{
  for(const kind of ['cash','cards','property']) {
    let g=ready();g.players.a.detentionCards=1;g.owners={1:'a'};
    const give={cash:kind==='cash'?50:0,cards:kind==='cards'?1:0,properties:kind==='property'?[1]:[]};
    g=act(g,'trade-offer',a,{give,receive:{cash:0,cards:0,properties:[]}});const tradeId=g.lastCommandId;
    // Firebase omits empty lists; JSON roundtrips alone do not reproduce this.
    for(const side of [g.trades[tradeId].give,g.trades[tradeId].receive]) if(!side.properties.length)delete side.properties;
    g=JSON.parse(JSON.stringify(g));
    assert.equal(describeTradeSide(g.trades[tradeId].receive),'$0 · 0 cards');
    assert.ok(!describeTradeSide(g.trades[tradeId].give).includes('unavailable'));
    const next=act(g,'trade-accept',b,{tradeId});assert.equal(next.trades[tradeId].status,'accepted');
    assert.equal(next.players.a.cash,kind==='cash'?1450:1500);assert.equal(next.players.b.cash,kind==='cash'?1550:1500);
    assert.equal(next.owners[1],kind==='property'?'b':'a');assert.equal(next.players.b.detentionCards,kind==='cards'?1:0);
    assert.equal(g.trades[tradeId].status,'pending');assert.throws(()=>act(next,'trade-accept',b,{tradeId}));
  }
});

test('trade compatibility never accepts corrupt amounts or malformed nonempty property lists',()=>{
  assert.equal(describeTradeSide(undefined),'Offer details unavailable');
  for(const properties of ['bad',{bad:1},[-1],[999],[1,1]]){
    const g=ready();g.owners={1:'a'};
    assert.throws(()=>act(g,'trade-offer',a,{give:{cash:50,cards:0,properties},receive:{cash:0,cards:0}}));
  }
  const g=ready();g.trades={bad:{id:'bad',from:'a',to:'b',status:'pending',give:{cash:-50,cards:0},receive:{cash:0,cards:0}}};
  assert.throws(()=>act(g,'trade-accept',b,{tradeId:'bad'}));assert.equal(g.players.a.cash,1500);
});

test('rematch after surrender requires partner acceptance, archives result and starts clean while preserving inbox', () => {
  let game=ready();game.owners={1:'a'};game.buildings={1:1};game.players.a.cash=350;
  game.romanticInbox={note:{id:'note',from:'a',to:'b',status:'pending',text:'A sweet note'}};
  game=act(game,'surrender');const oldId=game.id;
  game=act(game,'rematch-request');
  assert.equal(game.status,'finished');assert.equal(game.players.a.cash,350);
  assert.throws(()=>act(game,'rematch-accept',a));assert.throws(()=>act(game,'rematch-request',b));assert.throws(()=>act(game,'rematch-accept',c));
  game=JSON.parse(JSON.stringify(game));game=act(game,'rematch-accept',b);
  assert.notEqual(game.id,oldId);assert.equal(game.status,'opening');assert.equal(game.owners,undefined);assert.equal(game.buildings,undefined);assert.equal(game.winner,undefined);
  assert.equal(game.players.a.cash,1500);assert.equal(game.players.b.cash,1500);assert.equal(game.players.a.position,0);
  assert.equal(game.archives[oldId].winner,'b');assert.equal(game.archives[oldId].players.a.cash,350);assert.equal(game.archives[oldId].archives,null);
  assert.equal(game.romanticInbox.note.text,'A sweet note');
  assert.equal(game.decks.chance.remaining.length,60);
  game=act(game,'opening-roll',a,{dice:[5,6]});game=act(game,'opening-roll',b,{dice:[1,2]});assert.equal(game.status,'ready');
});

test('rematch requests can be declined or withdrawn without erasing results and work for Quick finishes',()=>{
  let game=ready();assert.throws(()=>act(game,'rematch-request'));
  game.status='finished';game.winner='tie';game.mode='quick';game.roundLimit=30;
  game=act(game,'rematch-request',b);assert.throws(()=>act(game,'rematch-withdraw',a));
  game=act(game,'rematch-decline',a);assert.equal(game.winner,'tie');assert.equal(game.rematch,null);
  game=act(game,'rematch-request');game=act(game,'rematch-withdraw');assert.equal(game.rematch,null);
  game=act(game,'rematch-request');game=act(game,'rematch-accept',b);assert.equal(game.mode,'quick');assert.equal(game.roundLimit,30);
});

test('surrender works before opening rolls and off-turn without requiring bankruptcy or consent', () => {
  for (const initial of [joined(), ready()]) {
    const finished = act(initial, 'surrender', b);
    assert.equal(finished.status, 'finished');
    assert.equal(finished.winner, 'a');
    assert.equal(finished.surrenderedBy, 'b');
    assert.equal(finished.finishReason, 'surrender');
    assert.ok(finished.finishedAt);
    assert.deepEqual(finished.players, initial.players);
    assert.equal(initial.status === 'finished', false);
    assert.match(finished.events[finished.lastCommandId].text, /Chelsea surrendered. Rocio wins/);
    assert.equal(finished.archives[finished.id].winner, 'a');
    assert.equal(finished.archives[finished.id].archives, null);
    const saved = JSON.parse(JSON.stringify(finished));
    for (const type of ['surrender', 'roll', 'cancel-request', 'cancel-accept', 'cancel-decline']) assert.throws(() => act(saved,type));
  }
  assert.throws(() => act(create(), 'surrender'));
  assert.throws(() => act(ready(), 'surrender', c));
});

test('surrender during debt or purchase preserves finances, closes offers and cancellation, and is idempotent', () => {
  for (const phase of ['roll', 'purchase', 'end']) {
    const g = ready(); g.status='playing'; g.phase=phase; g.mode='quick'; g.roundLimit=10;
    g.debt={playerId:'a',amount:200,creditorId:'b'};
    g.owners={1:'a'}; g.cancellation={requestedBy:'b',at:1};
    g.trades={offer:{id:'offer',status:'pending'}};
    const command={type:'surrender',user:a,id:`surrender-${phase}`,now:123,expectedGameId:g.id,expectedRevision:g.revision};
    const next=updateLovopoly(g,command);
    assert.equal(next.winner,'b'); assert.equal(next.cancellation,null);
    assert.equal(next.trades.offer.status,'match-ended');
    assert.equal(next.archives[next.id].trades.offer.status,'match-ended');
    assert.deepEqual(next.players,g.players); assert.deepEqual(next.owners,g.owners);
    assert.deepEqual(updateLovopoly(next,command),next);
    assert.throws(()=>act(g,'surrender',a,{expectedRevision:g.revision-1}));
  }
});
test('turns persist, prevent extra rolls, buy and collect rent exactly once', () => {
  let game = ready();
  assert.throws(() => act(game, 'roll', b, {dice:[1,2]}));
  game = act(game, 'roll', a, {dice:[1,2]});
  assert.equal(game.phase, 'purchase');
  assert.throws(() => act(game, 'end-turn'));
  game = act(game, 'buy');
  assert.equal(game.owners[3], 'a');
  assert.equal(game.players.a.cash, 1440);
  assert.throws(() => act(game, 'roll', a, {dice:[1,2]}));
  game = act(game, 'end-turn');
  game = JSON.parse(JSON.stringify(game));
  game = act(game, 'roll', b, {dice:[1,2]});
  assert.equal(game.players.b.cash,1498);
  assert.equal(game.players.a.cash,1442);
  assert.equal(game.phase,'end');
});
test('passing GO, detention, inability to buy, bankruptcy and quick scoring', () => {
  let game = ready(); game.players.a.position=39;
  game=act(game,'roll',a,{dice:[1,3]});
  assert.equal(game.players.a.cash,1700);
  game.players.a.cash=0;
  assert.throws(()=>act(game,'buy'));
  game=act(game,'pass'); game=act(game,'end-turn');
  game.players.b.position=28;
  game=act(game,'roll',b,{dice:[1,1]});
  assert.equal(game.players.b.position,10); assert.equal(game.players.b.detained,true);
  game=act(game,'end-turn',b); game=act(game,'roll',a,{dice:[1,2]}); game=act(game,'pass'); game=act(game,'end-turn');
  game=act(game,'roll',b,{dice:[2,2]}); assert.equal(game.players.b.position,14); assert.equal(game.players.b.detained,false);
  game=ready(); game.players.a.cash=1; game.players.a.position=2;
  game=act(game,'roll',a,{dice:[1,1]}); assert.equal(game.status,'playing'); assert.equal(game.debt.amount,200);
  game=act(game,'bankrupt'); assert.equal(game.status,'finished'); assert.equal(game.winner,'b');
  assert.throws(()=>act(game,'end-turn'));
  game=ready(); game.mode='quick'; game.roundLimit=10; game.completedTurns=19;
  game=act(game,'roll',a,{dice:[1,2]}); game=act(game,'buy'); game=act(game,'end-turn');
  assert.equal(game.status,'finished'); assert.equal(game.winner,'tie');
});

test('corrected board places Midnight Spicy at 18 and Plane Ticket at 19', () => {
  assert.equal(LOVOPOLY_TILES[18].name, 'Midnight Spicy');
  assert.equal(LOVOPOLY_TILES[19].name, 'Plane Ticket');
});

test('The Way You Think pays its owner on landing and reports the transfer exactly once', () => {
  let g=ready(); g.turn='b'; g.players.b.position=27; g.owners={32:'a',34:'a'};
  g=act(g,'roll',b,{dice:[3,4]});
  assert.equal(g.players.b.position,34);
  assert.equal(g.players.b.cash,1472); assert.equal(g.players.a.cash,1528);
  assert.deepEqual({amount:g.lastRent.amount,status:g.lastRent.status,payer:g.lastRent.payerId,owner:g.lastRent.ownerId},{amount:28,status:'paid',payer:'b',owner:'a'});
  assert.match(g.events[g.lastCommandId].text,/Chelsea paid \$28 to Rocio/);
  g=act(g,'end-turn',b); assert.equal(g.players.a.cash,1528);
  g=act(g,'roll',a,{dice:[1,2]}); assert.equal(g.lastRent,null);
});

test('yellow group rent doubles, mortgage waives it, and unpaid rent is reported as debt', () => {
  const landing = () => {const g=ready(); g.turn='b'; g.players.b.position=27; g.owners={31:'a',32:'a',34:'a'}; return g;};
  let g=act(landing(),'roll',b,{dice:[3,4]}); assert.equal(g.lastRent.amount,56);
  g=landing(); g.mortgages={34:true}; g=act(g,'roll',b,{dice:[3,4]});
  assert.equal(g.players.b.cash,1500); assert.equal(g.players.a.cash,1500); assert.equal(g.lastRent,null);
  g=landing(); g.players.b.cash=10; g.owners[8]='b';
  g=act(g,'roll',b,{dice:[3,4]}); assert.equal(g.lastRent.status,'owed'); assert.equal(g.players.a.cash,1500);
  g=act(g,'mortgage',b,{tileId:8}); g=act(g,'settle-debt',b);
  assert.equal(g.lastRent.status,'paid'); assert.equal(g.players.a.cash,1556); assert.equal(g.players.b.cash,4);
  assert.throws(()=>act(g,'settle-debt',b));
});

test('mortgages pay half, collect no rent, repay with 10% interest and reject misuse', () => {
  let g=ready(); g.owners={8:'a'};
  assert.throws(()=>act(g,'mortgage',b,{tileId:8}));
  g=act(g,'mortgage',a,{tileId:8}); assert.equal(g.players.a.cash,1550);
  assert.throws(()=>act(g,'mortgage',a,{tileId:8}));
  g.turn='b'; g.players.b.position=5;
  g=act(g,'roll',b,{dice:[1,2]}); assert.equal(g.players.b.cash,1500);
  g=act(g,'unmortgage',a,{tileId:8}); assert.equal(g.players.a.cash,1495);
  assert.equal(g.mortgages[8],undefined);
});

test('build and sell evenly, block mortgages and trades while buildings remain', () => {
  let g=ready(); g.owners={1:'a',3:'a',6:'a'};
  g=act(g,'build',a,{tileId:1}); assert.equal(g.players.a.cash,1450);
  assert.throws(()=>act(g,'build',a,{tileId:1}));
  assert.throws(()=>act(g,'mortgage',a,{tileId:3}));
  const zero={cash:0,cards:0,properties:[]};
  assert.throws(()=>act(g,'trade-offer',a,{give:{...zero,properties:[3]},receive:zero}));
  g=act(g,'sell-building',a,{tileId:1}); assert.equal(g.players.a.cash,1475);
  g=act(g,'mortgage',a,{tileId:1});
  assert.throws(()=>act(g,'build',a,{tileId:3}));
});

test('asynchronous trades exchange property, money and cards atomically; gifts and stale offers', () => {
  let g=ready(); g.owners={1:'a',8:'b'}; g.players.a.detentionCards=1;
  const give={cash:20,cards:1,properties:[1]}, receive={cash:50,cards:0,properties:[8]};
  g=act(g,'trade-offer',a,{give,receive}); const id=g.lastCommandId;
  assert.equal(g.owners[1],'a');
  assert.throws(()=>act(g,'trade-accept',a,{tradeId:id}));
  g=JSON.parse(JSON.stringify(g)); g=act(g,'trade-accept',b,{tradeId:id});
  assert.equal(g.owners[1],'b'); assert.equal(g.owners[8],'a'); assert.equal(g.players.a.cash,1530); assert.equal(g.players.b.detentionCards,1);
  assert.throws(()=>act(g,'trade-accept',b,{tradeId:id}));
  const zero={cash:0,cards:0,properties:[]};
  g=act(g,'trade-offer',a,{give:{...zero,cash:100},receive:zero}); const gift=g.lastCommandId;
  g=act(g,'trade-accept',b,{tradeId:gift}); assert.equal(g.players.a.cash,1430);
  g=act(g,'trade-offer',a,{give:{...zero,properties:[8]},receive:zero}); const stale=g.lastCommandId;
  g.owners[8]='b'; assert.throws(()=>act(g,'trade-accept',b,{tradeId:stale}));
  g=act(g,'trade-decline',b,{tradeId:stale}); assert.equal(g.trades[stale].status,'declined');
});

test('debt can be recovered with a mortgage and a gift before paying', () => {
  let g=ready(); g.players.a.cash=0; g.players.a.position=1; g.owners={39:'a'};
  g=act(g,'roll',a,{dice:[1,2]}); assert.equal(g.debt.amount,200);
  assert.throws(()=>act(g,'end-turn'));
  g=act(g,'mortgage',a,{tileId:39}); g=act(g,'settle-debt');
  assert.equal(g.debt,null); assert.equal(g.players.a.cash,0); assert.equal(g.status,'playing');
  g=act(g,'end-turn'); assert.equal(g.turn,'b');
});

test('quick net worth includes buildings and half value mortgages without double subtracting', () => {
  let g=ready(); g.mode='quick'; g.roundLimit=10; g.completedTurns=19; g.phase='end';
  g.owners={1:'a',3:'a',6:'a',8:'b'}; g.mortgages={8:true}; g.buildings={1:1};
  assert.equal(netWorth(g,'a'),1730); assert.equal(netWorth(g,'b'),1550);
  g=act(g,'end-turn'); assert.equal(g.winner,'a');
});

test('doubles do not count as completed turns and three doubles send to detention', () => {
  let g=ready();
  g=act(g,'roll',a,{dice:[1,1]}); g=act(g,'end-turn');
  assert.equal(g.turn,'a'); assert.equal(g.completedTurns,0);
  g=act(g,'roll',a,{dice:[1,1]}); g=act(g,'end-turn');
  g=act(g,'roll',a,{dice:[1,1]}); assert.equal(g.players.a.position,10); assert.equal(g.players.a.detained,true);
  g=act(g,'end-turn'); assert.equal(g.turn,'b'); assert.equal(g.completedTurns,1);
});
