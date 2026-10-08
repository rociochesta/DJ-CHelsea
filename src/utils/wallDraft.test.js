import test from 'node:test';
import assert from 'node:assert/strict';
import { insertWallMedia, cleanWallDraft, insertWallEmoji } from './wallDraft.js';
test('emoji insertion replaces a selection and leaves the caret after the emoji', () => {
  const blocks = [{ type: 'text', text: 'Hello you' }, { type: 'image', url: 'picture.png' }, { type: 'text', text: 'Below' }];
  const inserted = insertWallEmoji(blocks, { index: 0, start: 6, end: 9 }, '❤️');
  assert.equal(inserted.blocks[0].text, 'Hello ❤️');
  assert.deepEqual(inserted.selection, { index: 0, start: 8, end: 8 });
  const below = insertWallEmoji(blocks, { index: 2, start: 5, end: 5 }, '🥰');
  assert.equal(below.blocks[2].text, 'Below🥰');
  assert.deepEqual(below.blocks[1], blocks[1]);
  assert.equal(insertWallEmoji([{ type: 'text', text: '' }], { index: 0, start: 0, end: 0 }, '😊').blocks[0].text, '😊');
});
test('pasted pictures preserve text before and after the selected cursor position', () => {
  assert.deepEqual(insertWallMedia([{ type: 'text', text: 'Hello friends' }], 0, 5, 5, [{ type: 'image', url: 'https://example.com/a.gif' }]), [
    { type: 'text', text: 'Hello' }, { type: 'image', url: 'https://example.com/a.gif' }, { type: 'text', text: ' friends' },
  ]);
});
test('multiple images replace selected text and preserve surrounding blocks', () => {
  const first = { type: 'image', url: 'https://example.com/a.gif' };
  const second = { type: 'image', url: 'https://example.com/b.gif' };
  const result = insertWallMedia([{ type: 'text', text: 'start' }, first, { type: 'text', text: 'replace this' }], 2, 0, 7, [second]);
  assert.deepEqual(result, [{ type: 'text', text: 'start' }, first, { type: 'text', text: '' }, second, { type: 'text', text: ' this' }]);
});
test('empty text is removed while media order and Giphy attribution survive posting', () => {
  assert.deepEqual(cleanWallDraft([{ type: 'text', text: ' above ' }, { type: 'image', url: 'https://example.com/a.gif', giphyId: 'a', sourceUrl: 'https://giphy.com/gifs/a' }, { type: 'text', text: '\n below\n' }, { type: 'text', text: ' ' }]), [
    { type: 'text', text: 'above' }, { type: 'image', url: 'https://example.com/a.gif', giphyId: 'a', sourceUrl: 'https://giphy.com/gifs/a' }, { type: 'text', text: 'below' },
  ]);
});
