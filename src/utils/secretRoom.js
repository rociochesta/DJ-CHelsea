export const getRoomMode = (room) => room?.passwordVerifier ? 'secret' : room?.roomMode || room?.meta?.roomMode || 'karaoke';
export const isSecretRoom = (room) => getRoomMode(room) === 'secret';
export const playbackRoomMode = (mode) => mode === 'secret' ? 'dj' : mode;

async function derivePassword(password, salt) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: new Uint8Array(salt), iterations: 100000, hash: 'SHA-256' }, key, 256);
  return Array.from(new Uint8Array(bits), byte => byte.toString(16).padStart(2, '0')).join('');
}

export async function createRoomPassword(password) {
  if (!password?.trim()) throw new Error('Set a password for your Secret room.');
  const salt = Array.from(crypto.getRandomValues(new Uint8Array(16)));
  return { salt, hash: await derivePassword(password, salt) };
}

export async function verifyRoomPassword(room, password) {
  if (!isSecretRoom(room)) return true;
  const credentials = room.passwordVerifier;
  if (!password || !credentials?.hash || !Array.isArray(credentials.salt)) return false;
  return (await derivePassword(password, credentials.salt)) === credentials.hash;
}

export async function secretProfileKey(name) {
  const normalized = name.trim().normalize('NFKC').toLocaleLowerCase('en-US');
  if (!normalized) throw new Error('Enter your name.');
  const bits = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(normalized));
  return Array.from(new Uint8Array(bits), byte => byte.toString(16).padStart(2, '0')).join('');
}

export async function createSecretProfile(id, name, password) {
  if (!password?.trim()) throw new Error('Choose your personal password.');
  return { id, name: name.trim(), passwordVerifier: await createRoomPassword(password) };
}

export async function verifySecretProfile(profile, password) {
  return verifyRoomPassword({ roomMode: 'secret', passwordVerifier: profile?.passwordVerifier }, password);
}

const normalizeName = name => String(name || '').trim().normalize('NFKC').toLocaleLowerCase('en-US');

// Password verification happens before this migration. Reuse the identity already
// owning the room/game instead of replacing its scores, tiles, or authored content.
export function restoreLegacyProfile(room, profile) {
  const matches = name => normalizeName(name) === normalizeName(profile.name);
  const claimed = new Set(Object.values(room.secretProfiles || {}).filter(other => other !== profile && !matches(other.name)).map(other => other.id));
  if (matches(room.hostName) && room.hostId && !claimed.has(room.hostId)) return { ...profile, id: room.hostId };
  const gameIds = new Set();
  for (const game of [room.wordGame, room.wheelGame, room.battleshipGame]) {
    for (const [id, player] of Object.entries(game?.players || {})) {
      if (matches(player.name) && !claimed.has(id)) gameIds.add(id);
    }
  }
  if (gameIds.has(profile.id)) return profile;
  if (gameIds.size === 1) return { ...profile, id: [...gameIds][0] };
  return profile;
}

export function secretOnlineCount(room, now = Date.now()) {
  return Object.values(room?.presence || {}).filter(sessions => Object.values(sessions || {}).some(session => Number(session.lastSeen) > now - 90000)).length;
}
