import test from 'node:test';
import assert from 'node:assert/strict';
import { createRoomPassword, verifyRoomPassword, playbackRoomMode, getRoomMode, isSecretRoom } from './secretRoom.js';

test('secret room detection honors metadata and never bypasses stored password credentials', async () => {
  const credentials = await createRoomPassword('friends');
  for (const room of [
    { meta: { roomMode: 'secret' }, passwordVerifier: credentials },
    { roomMode: 'karaoke', passwordVerifier: credentials },
    { passwordVerifier: credentials },
  ]) {
    assert.equal(getRoomMode(room), 'secret');
    assert.equal(isSecretRoom(room), true);
    assert.equal(await verifyRoomPassword(room, ''), false);
    assert.equal(await verifyRoomPassword(room, 'friends'), true);
  }
});

test('secret room passwords reject missing and incorrect passwords, preserving exact characters', async () => {
  const passwordVerifier = await createRoomPassword(' A private password ');
  const room = { roomMode: 'secret', passwordVerifier };
  assert.equal(await verifyRoomPassword(room, ' A private password '), true);
  assert.equal(await verifyRoomPassword(room, 'A private password'), false);
  assert.equal(await verifyRoomPassword(room, 'wrong'), false);
  assert.equal(await verifyRoomPassword(room, ''), false);
  assert.equal(await verifyRoomPassword({ roomMode: 'secret' }, 'anything'), false);
  assert.notEqual(passwordVerifier.hash, ' A private password ');
});

test('passwords are salted and blank passwords cannot create secret rooms', async () => {
  await assert.rejects(createRoomPassword('   '), /Set a password/);
  const first = await createRoomPassword('friends');
  const second = await createRoomPassword('friends');
  assert.notEqual(first.hash, second.hash);
  assert.notDeepEqual(first.salt, second.salt);
});

test('secret rooms reuse Jam behavior and other modes keep their existing behavior', async () => {
  assert.equal(playbackRoomMode('secret'), 'dj');
  for (const mode of ['dj', 'karaoke', 'streaming', 'meeting']) {
    assert.equal(playbackRoomMode(mode), mode);
    assert.equal(await verifyRoomPassword({ roomMode: mode }, ''), true);
  }
});
