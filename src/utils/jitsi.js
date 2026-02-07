// utils/jitsi.js
// Jitsi "rooms" are just URLs. No API keys, no billing.

const JITSI_BASE = "https://meet.jit.si";

// Make the room name stable and reasonably unique.
// If you want a single fixed room, hardcode it here instead.
export function getJitsiRoomUrl(roomCode) {
  const safe = String(roomCode || "dj-chelsea")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "-");

  // Prefix avoids random collisions with other public rooms
  return `${JITSI_BASE}/dj-chelsea-${safe}`;
}

// If you ever want a single fixed room:
// export function getJitsiRoomUrl() {
//   return `${JITSI_BASE}/dj-chelsea`;
// }