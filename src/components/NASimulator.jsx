// src/components/NASimulator.jsx
//
// Invisible engine: seeds NA-like members + song requests into Firebase.
// Now: parses CSV safely + resolves real YouTube videoIds for CSV songs.
//
// Requires: src/utils/youtube.js has export searchKaraokeVideos (you already have it)

import { useEffect, useRef } from "react";
import { database, ref, push, set, get } from "../utils/firebase";
import { searchKaraokeVideos } from "../utils/youtube";

// ─── Member pool ─────────────────────────────────────────────────────────────
const ALL_MEMBERS = [
  { nickname: "Solo", group: "7 AM In The Bronx", avatar: "🦅" },
  { nickname: "Coco", group: "Survivors On Coney Island", avatar: "🌊" },
  { nickname: "Papi", group: "Happy Days", avatar: "🌟" },
  { nickname: "Big Mike", group: "Early Birds Recovery", avatar: "🐦" },
  { nickname: "Mami", group: "Just For Today Brooklyn", avatar: "🌸" },
  { nickname: "OG Tony", group: "3PM Early Birds", avatar: "👑" },
  { nickname: "Loca", group: "Bronx Warriors", avatar: "🔥" },
  { nickname: "Slim", group: "Harlem Hope", avatar: "🎯" },
  { nickname: "Boogie", group: "Flatbush Fellowship", avatar: "💫" },
  { nickname: "Redd", group: "Crown Heights Hope", avatar: "❤️" },
  { nickname: "Dee", group: "Manhattan Miracles", avatar: "🎵" },
  { nickname: "Champ", group: "Soundview Serenity", avatar: "🏆" },
  { nickname: "Tee", group: "Bed-Stuy Clean", avatar: "✨" },
  { nickname: "Smokey", group: "Dawn Patrol", avatar: "🌫️" },
  { nickname: "Junior", group: "Sunrise Serenity", avatar: "☀️" },
  { nickname: "Breezy", group: "New Day New Way", avatar: "💨" },
  { nickname: "Hawk", group: "Freedom From Fear", avatar: "🦆" },
  { nickname: "Ghost", group: "Unity In Recovery", avatar: "👻" },
  { nickname: "Ace", group: "Park Slope Peace", avatar: "🃏" },
  { nickname: "Shorty", group: "Far Rockaway Fresh", avatar: "🌴" },
  { nickname: "Jewels", group: "Flushing Fresh Start", avatar: "💎" },
  { nickname: "Mookie", group: "Jamaica Queens Recovery", avatar: "🏀" },
  { nickname: "Smiley", group: "Astoria Awakening", avatar: "😊" },
  { nickname: "Preach", group: "Fordham Fellowship", avatar: "📖" },
  { nickname: "Ice", group: "Pelham Bay Peace", avatar: "🧊" },
  { nickname: "Cutty", group: "City Island Clean", avatar: "⚓" },
  { nickname: "Shine", group: "Wakefield Warriors", avatar: "💡" },
  { nickname: "Bless", group: "Woodlawn Winners", avatar: "🙏" },
  { nickname: "Cruz", group: "Morrisania Miracles", avatar: "✝️" },
  { nickname: "Heavy", group: "Mott Haven Hope", avatar: "💪" },
];

// ─── Fallback song pool (used if CSV fails / YouTube fails) ──────────────────
const SONG_POOL = [
  {
    videoId: "ylLTMQMt15A",
    title: "Mr. Brightside - The Killers",
    thumbnail: "https://img.youtube.com/vi/ylLTMQMt15A/default.jpg",
  },
  {
    videoId: "lp-EO5I60KA",
    title: "Don't Stop Believin' - Journey",
    thumbnail: "https://img.youtube.com/vi/lp-EO5I60KA/default.jpg",
  },
  {
    videoId: "hTWKbfoikeg",
    title: "Bohemian Rhapsody - Queen",
    thumbnail: "https://img.youtube.com/vi/hTWKbfoikeg/default.jpg",
  },
  {
    videoId: "rYEDA3JcQqw",
    title: "Rolling in the Deep - Adele",
    thumbnail: "https://img.youtube.com/vi/rYEDA3JcQqw/default.jpg",
  },
  {
    videoId: "4m1EFMoRFvY",
    title: "I Will Survive - Gloria Gaynor",
    thumbnail: "https://img.youtube.com/vi/4m1EFMoRFvY/default.jpg",
  },
];

// ─── CSV song pool ───────────────────────────────────────────────────────────
const CATEGORY_COLORS = {
  "Recovery (NA)": ["0f3d2e", "34d399"],
  "Millennial Nostalgia": ["2d1b69", "a78bfa"],
  "Classics & Hits": ["3d2000", "fbbf24"],
  Heartbreak: ["1e1b4b", "818cf8"],
  "Karaoke Bangers": ["4a0030", "f472b6"],
  "Soft / Comfort": ["0c2a3d", "7dd3fc"],
  "Chill / Indie": ["14291a", "6ee7b7"],
  "Party / Hype": ["3d1200", "fb923c"],
  "3AM / Existential": ["0d0d1a", "c4b5fd"],
  "Confidence / Glow-Up": ["3d2f00", "fde047"],
};

function makeThumbnail(category) {
  const [bg, ac] = CATEGORY_COLORS[category] || ["1a1a2e", "9f7aea"];
  return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='240' height='135'%3E%3Crect width='240' height='135' fill='%23${bg}'/%3E%3Cellipse cx='120' cy='67' rx='60' ry='34' fill='%23${ac}' opacity='.18'/%3E%3C/svg%3E`;
}

// ✅ CSV-safe split: handles commas inside quotes
function splitCSVLine(line) {
  const out = [];
  let cur = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];

    if (ch === '"') {
      // handle escaped double quote inside quotes: ""
      const next = line[i + 1];
      if (inQuotes && next === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (ch === "," && !inQuotes) {
      out.push(cur);
      cur = "";
      continue;
    }

    cur += ch;
  }

  out.push(cur);
  return out.map((s) => String(s ?? "").trim());
}

// Module-level cache so we only fetch once per page load
let _csvSongs = null;

// YouTube resolver cache (avoid quota burn)
let _ytCache = new Map(); // query -> { id, title, thumbnail } | null

// Serialize YouTube searches so multiple timers don't spam API
let _ytChain = Promise.resolve();

async function resolveFirstYouTube(query) {
  const q = (query || "").trim();
  if (!q) return null;

  if (_ytCache.has(q)) return _ytCache.get(q);

  // serialize
  _ytChain = _ytChain.then(async () => {
    // another request might have cached while we waited
    if (_ytCache.has(q)) return;

    try {
      const results = await searchKaraokeVideos(q); // embeddable-filtered
      const first = results?.[0] || null; // { id, title, thumbnail, channelTitle }
      _ytCache.set(q, first);
    } catch (e) {
      console.warn("[NASimulator] YouTube search failed:", e);
      _ytCache.set(q, null);
    }
  });

  await _ytChain;
  return _ytCache.get(q);
}

async function loadCSVSongs() {
  if (_csvSongs) return _csvSongs;

  try {
    const res = await fetch("/3pm_1000_songs.csv");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const text = await res.text();
    const lines = text
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n")
      .trim()
      .split("\n")
      .slice(1); // skip header

    const parsed = lines
      .map((line) => {
        const parts = splitCSVLine(line);

        const category = (parts[0] || "").replace(/^"|"$/g, "");
        const artist = (parts[1] || "").replace(/^"|"$/g, "");
        const title = (parts[2] || "").replace(/^"|"$/g, "");

        if (!artist || !title) return null;

        return {
          title: `${artist} — ${title}`,
          videoId: null, // will be resolved via YouTube
          thumbnail: makeThumbnail(category),
          category,
        };
      })
      .filter(Boolean);

    _csvSongs = parsed.length > 0 ? parsed : SONG_POOL;
    console.log(`[NASimulator] Loaded ${_csvSongs.length} songs from CSV`);
    return _csvSongs;
  } catch (e) {
    console.warn("[NASimulator] CSV load failed, using fallback pool:", e);
    _csvSongs = SONG_POOL;
    return _csvSongs;
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const rand = (min, max) =>
  Math.floor(Math.random() * (max - min + 1)) + min;
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const msMin = (m) => m * 60 * 1000;
const msHour = (h) => h * 60 * 60 * 1000;

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ─── Firebase helpers ─────────────────────────────────────────────────────────
async function writeMember(roomCode, member) {
  const memberRef = ref(
    database,
    `karaoke-rooms/${roomCode}/naMembers/${member.nickname}`
  );
  await set(memberRef, {
    nickname: member.nickname,
    group: member.group,
    avatar: member.avatar,
    joinedAt: Date.now(),
    active: true,
  });
}

async function removeMember(roomCode, nickname) {
  const memberRef = ref(
    database,
    `karaoke-rooms/${roomCode}/naMembers/${nickname}`
  );
  await set(memberRef, { nickname, active: false, leftAt: Date.now() });
}

async function addSongRequest(roomCode, member) {
  const pool =
    _csvSongs && _csvSongs.length > 0 ? _csvSongs : SONG_POOL;

  const raw = pick(pool);

  let videoId = raw.videoId || null;
  let title = raw.title;
  let thumbnail = raw.thumbnail;

  // ✅ Resolve real YouTube ID for CSV songs
  if (!videoId) {
    const first = await resolveFirstYouTube(title);
    if (first?.id) {
      videoId = first.id;
      title = first.title || title;
      thumbnail =
        first.thumbnail ||
        (videoId
          ? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`
          : thumbnail);
    }
  }

  // hard fallback if still missing
  if (!videoId) {
    const fb = pick(SONG_POOL);
    videoId = fb.videoId;
    title = fb.title;
    thumbnail = fb.thumbnail;
  }

  const queueRef = ref(database, `karaoke-rooms/${roomCode}/queue`);
  const songRef = push(queueRef);

  await set(songRef, {
    id: songRef.key,
    videoId,
    title,
    thumbnail,
    requestedBy: member.nickname,
    naGroup: member.group,
    naAvatar: member.avatar,
    addedAt: Date.now(),
    isNASeed: true,
  });
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function NASimulator({ roomCode }) {
  const initialized = useRef(false);
  const timersRef = useRef([]);
  const activeMembersRef = useRef(new Set());
  const usedMembersRef = useRef(new Set());

  // Cleanup all timers on unmount
  useEffect(() => {
    return () => {
      timersRef.current.forEach(clearTimeout);
      timersRef.current = [];
    };
  }, []);

  const getUnusedMember = () => {
    const available = ALL_MEMBERS.filter(
      (m) => !usedMembersRef.current.has(m.nickname)
    );
    if (available.length === 0) return null;
    const member = pick(available);
    usedMembersRef.current.add(member.nickname);
    return member;
  };

  const scheduleMember = (roomCode, member, joinDelay) => {
    const stayDuration = rand(msMin(10), msHour(4));

    const willRequestSong = Math.random() < 0.8;
    // make first request feel alive faster: 20–90s after join
    const songDelay = joinDelay + rand(20_000, 90_000);

    const willRequest2nd = Math.random() < 0.3;
    const song2Delay = songDelay + msMin(rand(15, 45));

    // JOIN
    const joinTimer = setTimeout(async () => {
      activeMembersRef.current.add(member.nickname);
      await writeMember(roomCode, member);
      console.log(`[NASimulator] ➕ ${member.nickname} joined (${member.group})`);
    }, joinDelay);
    timersRef.current.push(joinTimer);

    // SONG 1
    if (willRequestSong) {
      const songTimer = setTimeout(async () => {
        if (!activeMembersRef.current.has(member.nickname)) return;
        await addSongRequest(roomCode, member);
        console.log(`[NASimulator] 🎵 ${member.nickname} requested a song`);
      }, songDelay);
      timersRef.current.push(songTimer);
    }

    // SONG 2
    if (willRequest2nd) {
      const song2Timer = setTimeout(async () => {
        if (!activeMembersRef.current.has(member.nickname)) return;
        await addSongRequest(roomCode, member);
        console.log(`[NASimulator] 🎵 ${member.nickname} requested another song`);
      }, song2Delay);
      timersRef.current.push(song2Timer);
    }

    // LEAVE
    const leaveTimer = setTimeout(async () => {
      activeMembersRef.current.delete(member.nickname);
      await removeMember(roomCode, member.nickname);
      console.log(
        `[NASimulator] ➖ ${member.nickname} left after ${Math.round(
          stayDuration / 60000
        )}min`
      );

      if (Math.random() < 0.7) {
        const nextMember = getUnusedMember();
        if (nextMember) {
          scheduleMember(roomCode, nextMember, msMin(rand(5, 30)));
        }
      }
    }, joinDelay + stayDuration);

    timersRef.current.push(leaveTimer);
  };

  useEffect(() => {
    if (!roomCode || initialized.current) return;
    initialized.current = true;

    (async () => {
      await loadCSVSongs();

      const simRef = ref(database, `karaoke-rooms/${roomCode}/naSimStarted`);
      const snap = await get(simRef);

      if (snap.val()) {
        console.log("[NASimulator] Room already has simulation, syncing...");
        return;
      }

      await set(simRef, Date.now());

      // Initial wave: 3–5 join fast (3–20s)
      const initialCount = rand(3, 5);
      const initialPool = shuffle([...ALL_MEMBERS]).slice(0, initialCount);

      initialPool.forEach((member) => {
        usedMembersRef.current.add(member.nickname);
        const joinDelay = rand(3000, 20000);
        scheduleMember(roomCode, member, joinDelay);
      });

      // Ongoing wave
      let waveDelay = msMin(rand(20, 60));
      const scheduleWave = () => {
        const waveTimer = setTimeout(() => {
          const waveSize = rand(1, 2);
          for (let i = 0; i < waveSize; i++) {
            const member = getUnusedMember();
            if (member) scheduleMember(roomCode, member, msMin(rand(0, 5)));
          }
          waveDelay = msMin(rand(20, 60));
          scheduleWave();
        }, waveDelay);

        timersRef.current.push(waveTimer);
      };

      scheduleWave();
    })();
  }, [roomCode]);

  return null;
}