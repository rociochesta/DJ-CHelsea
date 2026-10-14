import test from 'node:test';
import assert from 'node:assert/strict';
import { updateSecretMusicQuiz, secretMusicQuizResult } from './secretMusicQuiz.js';

const a = { id: 'a', name: 'A' }, b = { id: 'b', name: 'B' };
const create = () => ({ id: 'challenge', creatorId: 'a', rounds: [{ audioUrl: 'song-one', choices: ['A', 'B', 'C', 'D'], answer: 0 }, { audioUrl: 'song-two', choices: ['D', 'C', 'B', 'A'], answer: 3 }], players: { a: { ...a, round: 0, score: 0, startedAt: 1000 } } });
const act = (game, user, type, round, now, choice) => updateSecretMusicQuiz(game, { gameId: 'challenge', user, type, round, now, choice });

test('players finish separately on an identical saved playlist and the highest score wins', () => {
  let game = create();
  const playlist = structuredClone(game.rounds);
  assert.equal(act(game, b, 'join', 0, 2000), undefined);
  game = act(game, a, 'answer', 0, 2000, 0);
  assert.equal(game.players.a.score, 5);
  assert.equal(act(game, a, 'answer', 0, 2001, 0), undefined);
  assert.equal(act(game, a, 'start', 1, 3000), undefined);
  game = act(game, a, 'start', 1, 4000);
  game = act(game, a, 'answer', 1, 25000, 3);
  assert.equal(game.players.a.score, 6);
  assert.equal(game.players.a.finished, true);
  assert.equal(secretMusicQuizResult(game), null);
  game = act(game, b, 'join', 0, 40000);
  assert.equal(act(game, { id: 'c' }, 'join', 0, 40000), undefined);
  assert.equal(act(game, b, 'join', 0, 40000), undefined);
  game = act(game, b, 'start', 0, 41000);
  game = act(game, b, 'answer', 0, 42000, 0);
  game = act(game, b, 'start', 1, 44000);
  game = act(game, b, 'answer', 1, 45000, 3);
  assert.equal(secretMusicQuizResult(game).winner.id, 'b');
  assert.equal(game.players.a.score, 6);
  assert.equal(game.players.b.score, 10);
  assert.deepEqual(game.rounds, playlist);
  assert.equal(act(game, b, 'start', 2, 45000), undefined);
});

test('timeouts, skips and wrong answers score zero; ties are reported', () => {
  let game = create();
  assert.equal(act(game, a, 'timeout', 0, 2000), undefined);
  assert.equal(act(game, a, 'answer', 0, 31000, 0), undefined);
  game = act(game, a, 'timeout', 0, 31000);
  assert.equal(game.players.a.round, 1);
  assert.equal(act(game, a, 'answer', 1, 32000, 3), undefined);
  game = act(game, a, 'start', 1, 33000);
  game = act(game, a, 'skip', 1, 34000);
  game = act(game, b, 'join', 0, 35000);
  game = act(game, b, 'start', 0, 36000);
  assert.equal(act(game, b, 'answer', 0, 36001, 4), undefined);
  game = act(game, b, 'answer', 0, 37000, 1);
  game = act(game, b, 'start', 1, 39000);
  game = act(game, b, 'timeout', 1, 69000);
  assert.deepEqual(secretMusicQuizResult(game), { tie: true });
  assert.equal(updateSecretMusicQuiz(game, { gameId: 'old', user: a, type: 'start', round: 0, now: 70000 }), undefined);
});
