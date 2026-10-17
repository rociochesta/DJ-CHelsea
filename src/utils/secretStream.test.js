import test from 'node:test';
import assert from 'node:assert/strict';
import { streamPosition, streamUrl } from './secretStream.js';

test('late arrivals use elapsed server time and paused playback stays at its saved position', () => {
  assert.equal(streamPosition({ position: 120, playing: true, updatedAt: 10000 }, 15000), 125);
  assert.equal(streamPosition({ position: 120, playing: false, updatedAt: 10000 }, 15000), 120);
  assert.equal(streamPosition({ position: 120, playing: true, updatedAt: 16000 }, 15000), 120);
});

test('video URLs require HTTPS and preserve signed query parameters', () => {
  assert.equal(streamUrl(' https://example.com/movie.mp4?token=abc '), 'https://example.com/movie.mp4?token=abc');
  for (const url of ['javascript:alert(1)', 'file:///movie.mp4', 'http://example.com/movie.mp4', 'invalid']) {
    assert.throws(() => streamUrl(url));
  }
});
