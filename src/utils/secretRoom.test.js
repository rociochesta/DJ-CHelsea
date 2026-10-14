import test from 'node:test';
import assert from 'node:assert/strict';
import { createRoomPassword, verifyRoomPassword, playbackRoomMode, getRoomMode, isSecretRoom } from './secretRoom.js';
import { secretProfileKey, createSecretProfile, verifySecretProfile } from './secretRoom.js';
import { restoreLegacyProfile, secretOnlineCount } from './secretRoom.js';

test('password profile restores legacy host and game identities without changing game data', () => {
  const profile = { id: 'new', name: 'Rocio', passwordVerifier: { hash: 'verified' } };
  const game = { players: { old: { name: 'Rocio', score: 26, rack: ['A'] }, lt: { name: 'LT' } }, turn: 'old' };
  const room = { hostName: 'Rocio', hostId: 'old', wordGame: game, secretProfiles: { rocio: profile } };
  assert.equal(restoreLegacyProfile(room, profile).id, 'old');
  assert.equal(restoreLegacyProfile({ wordGame: game }, profile).id, 'old');
  assert.equal(game.turn, 'old');
  assert.equal(game.players.old.score, 26);
  assert.equal(restoreLegacyProfile({ ...room, secretProfiles: { other: { name: 'Other', id: 'old' } } }, profile).id, 'new');
});

test('presence counts a person once across devices and excludes disconnected and stale profiles', () => {
  const now = 200000;
  const room = { participants: { old: {}, new: {}, lt: {} }, presence: { rocio: { browser: { lastSeen: now }, phone: { lastSeen: now } }, lt: { old: { lastSeen: 1 } } } };
  assert.equal(secretOnlineCount(room, now), 1);
  delete room.presence.rocio.phone;
  assert.equal(secretOnlineCount(room, now), 1);
  delete room.presence.rocio.browser;
  assert.equal(secretOnlineCount(room, now), 0);
  assert.equal(secretOnlineCount({ participants: room.participants }, now), 0);
});

test('secret profiles identify the same name across devices and reject another password', async () => {
  assert.equal(await secretProfileKey(' Rocio '), await secretProfileKey('ROCIO'));
  assert.notEqual(await secretProfileKey('Rocio'), await secretProfileKey('Chelsea'));
  const profile = await createSecretProfile('stable-id', 'Rocio', 'my password');
  assert.equal(profile.id, 'stable-id');
  assert.equal(await verifySecretProfile(profile, 'my password'), true);
  assert.equal(await verifySecretProfile(profile, 'someone else'), false);
  assert.equal(await verifySecretProfile(profile, ''), false);
  await assert.rejects(createSecretProfile('id', 'Rocio', '   '), /personal password/);
});

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
