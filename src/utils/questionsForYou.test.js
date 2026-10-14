import test from 'node:test';
import assert from 'node:assert/strict';
import { pendingQuestions, answerQuestion } from './questionsForYou.js';

test('only the recipient sees unanswered questions in arrival order', () => {
  const inbox = { a: { id: 'a', recipientId: 'me', createdAt: 2 }, b: { id: 'b', recipientId: 'other', createdAt: 1 }, c: { id: 'c', recipientId: 'me', createdAt: 0, answer: {} }, d: { id: 'd', recipientId: 'me', createdAt: 1 } };
  assert.deepEqual(pendingQuestions(inbox, 'me').map(item => item.id), ['d', 'a']);
});

test('answers preserve rich media and reject a different recipient or a second answer', () => {
  const question = { id: 'a', recipientId: 'me', question: 'How was your day?' };
  const user = { id: 'me', name: 'Rocio' };
  const blocks = [{ type: 'text', text: 'Good!' }, { type: 'image', url: 'https://example.com/photo.png' }];
  const answered = answerQuestion(question, user, blocks, 10);
  assert.deepEqual(answered.answer.blocks, blocks);
  assert.equal(answered.answer.answeredAt, 10);
  assert.equal(answerQuestion(question, { id: 'other' }, blocks, 10), undefined);
  assert.equal(answerQuestion(answered, user, blocks, 11), undefined);
  assert.equal(answerQuestion(question, user, [], 10), undefined);
});
