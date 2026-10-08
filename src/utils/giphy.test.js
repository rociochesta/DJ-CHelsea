import test from 'node:test';
import assert from 'node:assert/strict';
import { loadGiphy } from './giphy.js';

test('search preserves exact query, forwards cancellation, and returns direct image URLs with pagination', async () => {
  const signal = new AbortController().signal;
  const result = await loadGiphy({ apiKey: 'test-key', query: 'cats & dogs @artist', offset: 24, signal, fetchImpl: async (url, options) => {
    const parsed = new URL(url);
    assert.equal(parsed.pathname, '/v1/gifs/search');
    assert.equal(parsed.searchParams.get('q'), 'cats & dogs @artist');
    assert.equal(parsed.searchParams.get('offset'), '24');
    assert.equal(parsed.searchParams.get('rating'), 'pg-13');
    assert.equal(options.signal, signal);
    return { ok: true, json: async () => ({ data: [{ id: 'one', title: 'Cat', url: 'https://giphy.com/gifs/one', images: { fixed_height: { url: 'https://media.giphy.com/one.gif' }, fixed_height_small: { url: 'https://media.giphy.com/preview.gif' } } }], pagination: { count: 1, total_count: 40 } }) };
  } });
  assert.equal(result.gifs[0].imageUrl, 'https://media.giphy.com/one.gif');
  assert.equal(result.nextOffset, 25);
  assert.equal(result.hasMore, true);
});

test('trending discards missing and unsafe media and ends pagination', async () => {
  const result = await loadGiphy({ apiKey: 'test', fetchImpl: async url => {
    assert.equal(new URL(url).pathname, '/v1/gifs/trending');
    return { ok: true, json: async () => ({ data: [{ id: 'broken' }, { id: 'unsafe', images: { original: { url: 'javascript:bad' } } }], pagination: { count: 2, total_count: 2 } }) };
  } });
  assert.deepEqual(result.gifs, []);
  assert.equal(result.hasMore, false);
});

test('missing key and upstream failures produce actionable errors', async () => {
  await assert.rejects(loadGiphy({ apiKey: '' }), /not been configured/);
  for (const [status, pattern] of [[429, /busy/], [403, /API key/], [500, /try again/]]) {
    await assert.rejects(loadGiphy({ apiKey: 'test', fetchImpl: async () => ({ ok: false, status }) }), pattern);
  }
});
