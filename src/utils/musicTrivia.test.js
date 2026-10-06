import test from 'node:test';
import assert from 'node:assert/strict';
import { MUSIC_QUESTIONS, createTrivia, answerTrivia } from './musicTrivia.js';

const player = { id: 'a', name: 'Alex' };
const other = { id: 'b', name: 'Sam' };
function invitation() {
  return { id: 'session', type: 'music-trivia', responses: { a: 'joined', b: 'joined' }, trivia: createTrivia(() => 0.5) };
}
test('deck includes every question exactly once', () => {
  const deck = createTrivia();
  assert.equal(new Set(deck.order).size, MUSIC_QUESTIONS.length);
  assert.deepEqual([...deck.order].sort((a,b) => a-b), MUSIC_QUESTIONS.map((_,i) => i));
});
test('first correct answer scores and advances; transaction retry rejects the second winner', () => {
  const room = invitation();
  const answer = MUSIC_QUESTIONS[room.trivia.order[0]].answer;
  const won = answerTrivia(room, 'session', 0, player, answer, 1);
  assert.equal(won.trivia.round, 1);
  assert.equal(won.trivia.scores.a, 1);
  assert.equal(won.trivia.winners[0].id, 'a');
  assert.equal(answerTrivia(won, 'session', 0, other, answer, 2), undefined);
  assert.equal(answerTrivia(won, 'session', 0, player, answer, 3), undefined);
});
test('wrong answer stays on question, cannot be repeated, and allows another choice', () => {
  const room = invitation();
  const correct = MUSIC_QUESTIONS[room.trivia.order[0]].answer;
  const wrong = (correct + 1) % 4;
  const missed = answerTrivia(room, 'session', 0, player, wrong);
  assert.equal(missed.trivia.round, 0);
  assert.equal(missed.trivia.scores.a, undefined);
  assert.equal(answerTrivia(missed, 'session', 0, player, wrong), undefined);
  assert.equal(answerTrivia(missed, 'session', 0, player, correct).trivia.scores.a, 1);
});
test('stale sessions, nonplayers, and invalid choices cannot score', () => {
  const room = invitation();
  assert.equal(answerTrivia(room, 'old', 0, player, 0), undefined);
  assert.equal(answerTrivia(room, 'session', 0, {id:'outsider'}, 0), undefined);
  assert.equal(answerTrivia(room, 'session', 0, player, -1), undefined);
});
test('last answer finishes without cycling or awarding further points', () => {
  let room = invitation();
  for (let round = 0; round < MUSIC_QUESTIONS.length; round++) {
    room = answerTrivia(room, 'session', round, player, MUSIC_QUESTIONS[room.trivia.order[round]].answer);
  }
  assert.equal(room.trivia.round, MUSIC_QUESTIONS.length);
  assert.equal(room.trivia.scores.a, MUSIC_QUESTIONS.length);
  assert.equal(answerTrivia(room, 'session', MUSIC_QUESTIONS.length, player, 0), undefined);
});
