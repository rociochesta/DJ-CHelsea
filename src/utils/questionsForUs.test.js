import test from 'node:test';
import assert from 'node:assert/strict';
import { QUESTIONS_FOR_US, pickQuestion, updateQuestionGame } from './questionsForUs.js';
const start = (game = null, expectedId, id = 'first', questionIndex = 0) => updateQuestionGame(game, { type: 'new', expectedId, id, questionIndex, now: 100 });
const answer = (game, userId, expectedId = 'first') => updateQuestionGame(game, { type: 'answer', expectedId, user: { id: userId, name: userId }, text: 'My answer', now: 200 });

test('image-only answers and mixed content survive completion and history', () => {
  const blocks = [{ type: 'text', text: 'For you ❤️' }, { type: 'image', url: 'https://example.com/drawing.png' }];
  let game = updateQuestionGame(start(), { type: 'answer', expectedId: 'first', user: { id: 'a' }, blocks, now: 200 });
  game = updateQuestionGame(game, { type: 'answer', expectedId: 'first', user: { id: 'b' }, blocks: [blocks[1]], now: 300 });
  assert.deepEqual(game.current.answers.a.blocks, blocks);
  assert.equal(game.current.answers.b.blocks.length, 1);
  assert.deepEqual(start(game, 'first', 'second', 1).history.first.answers.a.blocks, blocks);
  assert.equal(updateQuestionGame(start(), { type: 'answer', expectedId: 'first', user: { id: 'a' }, blocks: [], now: 200 }), undefined);
});

test('expanded questions stay distinct and random refresh cannot repeat the current prompt', () => {
  assert.equal(QUESTIONS_FOR_US.length, 145);
  assert.equal(new Set(QUESTIONS_FOR_US).size, QUESTIONS_FOR_US.length);
  for (let previous = 0; previous < QUESTIONS_FOR_US.length; previous++) {
    for (const random of [0, 0.5, 0.999999]) {
      const next = pickQuestion(previous, () => random);
      assert.notEqual(next, previous);
      assert.ok(next >= 0 && next < QUESTIONS_FOR_US.length);
    }
  }
});

test('refresh cannot discard a pending answer, and stale answers cannot land on another question', () => {
  const initial = start();
  const refreshed = start(initial, 'first', 'second', 1);
  assert.equal(answer(refreshed, 'a'), undefined);
  const pending = answer(initial, 'a');
  assert.equal(start(pending, 'first', 'second', 1), undefined);
  assert.equal(answer(pending, 'a'), undefined);
  assert.equal(start(initial, 'stale', 'second', 1), undefined);
});

test('two different people finish a round; third answers are rejected and history persists', () => {
  let game = answer(start(), 'a');
  game = answer(game, 'b');
  assert.equal(Object.keys(game.current.answers).length, 2);
  assert.equal(answer(game, 'c'), undefined);
  const next = start(game, 'first', 'second', 1);
  assert.deepEqual(next.history.first.answers, game.current.answers);
  assert.equal(next.current.questionIndex, 1);
  assert.equal(next.current.answers, undefined);
  assert.equal(answer(next, 'a'), undefined);
});
