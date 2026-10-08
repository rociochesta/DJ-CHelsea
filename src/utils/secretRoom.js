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
