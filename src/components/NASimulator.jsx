// src/components/NASimulator.jsx
//
// DROP INTO: src/components/NASimulator.jsx
//
// USAGE — add ONE instance in App.jsx (or HostView) so it runs once per room:
//
//   import NASimulator from "./NASimulator";
//   // inside JSX, after roomCode is available:
//   {roomCode && <NASimulator roomCode={roomCode} roomState={roomState} />}
//
// This is an invisible engine component — renders nothing visible.
// All activity (joins, song requests, departures) is written to Firebase
// so every person in the room sees the same live feed.
//
// Pair with NAProfiles.jsx to DISPLAY the current fake members panel.

import { useEffect, useRef } from "react";
import { database, ref, push, set, get, remove } from "../utils/firebase";

// ─── Member pool ─────────────────────────────────────────────────────────────
const ALL_MEMBERS = [
  { nickname: "Solo",      group: "7 AM In The Bronx",          avatar: "🦅" },
  { nickname: "Coco",      group: "Survivors On Coney Island",   avatar: "🌊" },
  { nickname: "Papi",      group: "Happy Days",                  avatar: "🌟" },
  { nickname: "Big Mike",  group: "Early Birds Recovery",        avatar: "🐦" },
  { nickname: "Mami",      group: "Just For Today Brooklyn",     avatar: "🌸" },
  { nickname: "OG Tony",   group: "3PM Early Birds",             avatar: "👑" },
  { nickname: "Loca",      group: "Bronx Warriors",              avatar: "🔥" },
  { nickname: "Slim",      group: "Harlem Hope",                 avatar: "🎯" },
  { nickname: "Boogie",    group: "Flatbush Fellowship",         avatar: "💫" },
  { nickname: "Redd",      group: "Crown Heights Hope",          avatar: "❤️" },
  { nickname: "Dee",       group: "Manhattan Miracles",          avatar: "🎵" },
  { nickname: "Champ",     group: "Soundview Serenity",          avatar: "🏆" },
  { nickname: "Tee",       group: "Bed-Stuy Clean",              avatar: "✨" },
  { nickname: "Smokey",    group: "Dawn Patrol",                 avatar: "🌫️" },
  { nickname: "Junior",    group: "Sunrise Serenity",            avatar: "☀️" },
  { nickname: "Breezy",    group: "New Day New Way",             avatar: "💨" },
  { nickname: "Hawk",      group: "Freedom From Fear",           avatar: "🦆" },
  { nickname: "Ghost",     group: "Unity In Recovery",           avatar: "👻" },
  { nickname: "Ace",       group: "Park Slope Peace",            avatar: "🃏" },
  { nickname: "Shorty",    group: "Far Rockaway Fresh",          avatar: "🌴" },
  { nickname: "Jewels",    group: "Flushing Fresh Start",        avatar: "💎" },
  { nickname: "Mookie",    group: "Jamaica Queens Recovery",     avatar: "🏀" },
  { nickname: "Smiley",    group: "Astoria Awakening",           avatar: "😊" },
  { nickname: "Preach",    group: "Fordham Fellowship",          avatar: "📖" },
  { nickname: "Ice",       group: "Pelham Bay Peace",            avatar: "🧊" },
  { nickname: "Cutty",     group: "City Island Clean",           avatar: "⚓" },
  { nickname: "Shine",     group: "Wakefield Warriors",          avatar: "💡" },
  { nickname: "Bless",     group: "Woodlawn Winners",            avatar: "🙏" },
  { nickname: "Cruz",      group: "Morrisania Miracles",         avatar: "✝️" },
  { nickname: "Heavy",     group: "Mott Haven Hope",             avatar: "💪" },
];

// ─── Song pool ────────────────────────────────────────────────────────────────
const SONG_POOL = [
  { videoId: "ylLTMQMt15A", title: "Mr. Brightside - The Killers (Karaoke)",          thumbnail: "https://img.youtube.com/vi/ylLTMQMt15A/default.jpg" },
  { videoId: "lp-EO5I60KA", title: "Don't Stop Believin' - Journey (Karaoke)",        thumbnail: "https://img.youtube.com/vi/lp-EO5I60KA/default.jpg" },
  { videoId: "OPf0YbXqDm0", title: "Uptown Funk - Bruno Mars (Karaoke)",              thumbnail: "https://img.youtube.com/vi/OPf0YbXqDm0/default.jpg" },
  { videoId: "rYEDA3JcQqw", title: "Rolling in the Deep - Adele (Karaoke)",           thumbnail: "https://img.youtube.com/vi/rYEDA3JcQqw/default.jpg" },
  { videoId: "09R8_2nJtjg", title: "Sweet Home Alabama - Lynyrd Skynyrd (Karaoke)",  thumbnail: "https://img.youtube.com/vi/09R8_2nJtjg/default.jpg" },
  { videoId: "5NPBIwQyPWE", title: "Total Eclipse of the Heart (Karaoke)",            thumbnail: "https://img.youtube.com/vi/5NPBIwQyPWE/default.jpg" },
  { videoId: "4m1EFMoRFvY", title: "I Will Survive - Gloria Gaynor (Karaoke)",        thumbnail: "https://img.youtube.com/vi/4m1EFMoRFvY/default.jpg" },
  { videoId: "dQw4w9WgXcQ", title: "Never Gonna Give You Up - Rick Astley (Karaoke)", thumbnail: "https://img.youtube.com/vi/dQw4w9WgXcQ/default.jpg" },
  { videoId: "nfWlot6h_JM", title: "Shake It Off - Taylor Swift (Karaoke)",           thumbnail: "https://img.youtube.com/vi/nfWlot6h_JM/default.jpg" },
  { videoId: "60ItHLz5WEA", title: "Africa - Toto (Karaoke)",                         thumbnail: "https://img.youtube.com/vi/60ItHLz5WEA/default.jpg" },
  { videoId: "YQHsXMglC9A", title: "Hello - Adele (Adele Karaoke)",                   thumbnail: "https://img.youtube.com/vi/YQHsXMglC9A/default.jpg" },
  { videoId: "kffacxfA7G4", title: "Baby One More Time - Britney Spears (Karaoke)",  thumbnail: "https://img.youtube.com/vi/kffacxfA7G4/default.jpg" },
  { videoId: "1k8craCGpgs", title: "Don't You Want Me - Human League (Karaoke)",     thumbnail: "https://img.youtube.com/vi/1k8craCGpgs/default.jpg" },
  { videoId: "hTWKbfoikeg", title: "Bohemian Rhapsody - Queen (Karaoke)",             thumbnail: "https://img.youtube.com/vi/hTWKbfoikeg/default.jpg" },
  { videoId: "9bZkp7q19f0", title: "GANGNAM STYLE - PSY (Karaoke)",                  thumbnail: "https://img.youtube.com/vi/9bZkp7q19f0/default.jpg" },
  { videoId: "fRh_vgS2dFE", title: "Sorry - Justin Bieber (Karaoke)",                thumbnail: "https://img.youtube.com/vi/fRh_vgS2dFE/default.jpg" },
  { videoId: "ktvTqknDobU", title: "Radioactive - Imagine Dragons (Karaoke)",        thumbnail: "https://img.youtube.com/vi/ktvTqknDobU/default.jpg" },
  { videoId: "CevxZvSJLk8", title: "Kryptonite - 3 Doors Down (Karaoke)",            thumbnail: "https://img.youtube.com/vi/CevxZvSJLk8/default.jpg" },
  { videoId: "tbNlMtqrYS0", title: "Wagon Wheel - Darius Rucker (Karaoke)",          thumbnail: "https://img.youtube.com/vi/tbNlMtqrYS0/default.jpg" },
  { videoId: "8UVNT4wvIGY", title: "Summer of '69 - Bryan Adams (Karaoke)",          thumbnail: "https://img.youtube.com/vi/8UVNT4wvIGY/default.jpg" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const rand   = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick   = (arr) => arr[Math.floor(Math.random() * arr.length)];
const msMin  = (m) => m * 60 * 1000;
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
  const memberRef = ref(database, `karaoke-rooms/${roomCode}/naMembers/${member.nickname}`);
  await set(memberRef, {
    nickname:  member.nickname,
    group:     member.group,
    avatar:    member.avatar,
    joinedAt:  Date.now(),
    active:    true,
  });
}

async function removeMember(roomCode, nickname) {
  // Mark inactive (keeps history readable)
  const memberRef = ref(database, `karaoke-rooms/${roomCode}/naMembers/${nickname}`);
  await set(memberRef, { nickname, active: false, leftAt: Date.now() });

  // Also remove any pending queue entries for this member
  // (we don't remove — let the song play out naturally)
}

async function addSongRequest(roomCode, member) {
  const song    = pick(shuffle(SONG_POOL));
  const queueRef = ref(database, `karaoke-rooms/${roomCode}/queue`);
  const songRef  = push(queueRef);
  await set(songRef, {
    id:          songRef.key,
    videoId:     song.videoId,
    title:       song.title,
    thumbnail:   song.thumbnail,
    requestedBy: member.nickname,
    naGroup:     member.group,
    naAvatar:    member.avatar,
    addedAt:     Date.now(),
    isNASeed:    true,
  });
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function NASimulator({ roomCode, roomState }) {
  const initialized  = useRef(false);
  const timersRef    = useRef([]);   // all scheduled setTimeout IDs
  const activeMembersRef = useRef(new Set());
  const usedMembersRef   = useRef(new Set()); // never re-use same nickname in session

  // Cleanup all timers on unmount
  useEffect(() => {
    return () => {
      timersRef.current.forEach(clearTimeout);
      timersRef.current = [];
    };
  }, []);

  // ── Schedule a single member's full lifecycle ───────────────────────────────
  const scheduleMember = (roomCode, member, joinDelay) => {
    // How long this member stays: 10 min – 4 hours
    const stayDuration = rand(msMin(10), msHour(4));

    // Whether they request a song (80% chance)
    const willRequestSong = Math.random() < 0.80;
    // Song request happens 1–8 min after joining
    const songDelay = joinDelay + msMin(rand(1, 8));

    // Whether they request a SECOND song (30% chance, only if first song plays)
    const willRequest2nd = Math.random() < 0.30;
    const song2Delay = songDelay + msMin(rand(15, 45));

    // JOIN
    const joinTimer = setTimeout(async () => {
      activeMembersRef.current.add(member.nickname);
      await writeMember(roomCode, member);
      console.log(`[NASimulator] ➕ ${member.nickname} joined (${member.group})`);
    }, joinDelay);

    timersRef.current.push(joinTimer);

    // SONG REQUEST 1
    if (willRequestSong) {
      const songTimer = setTimeout(async () => {
        if (!activeMembersRef.current.has(member.nickname)) return;
        await addSongRequest(roomCode, member);
        console.log(`[NASimulator] 🎵 ${member.nickname} requested a song`);
      }, songDelay);
      timersRef.current.push(songTimer);
    }

    // SONG REQUEST 2
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
      console.log(`[NASimulator] ➖ ${member.nickname} left after ${Math.round(stayDuration / 60000)}min`);

      // After leaving, maybe someone new joins 5–30 min later
      if (Math.random() < 0.70) {
        const nextMember = getUnusedMember();
        if (nextMember) {
          scheduleMember(roomCode, nextMember, msMin(rand(5, 30)));
        }
      }
    }, joinDelay + stayDuration);

    timersRef.current.push(leaveTimer);
  };

  // ── Pick a member not yet used this session ─────────────────────────────────
  const getUnusedMember = () => {
    const available = ALL_MEMBERS.filter(
      (m) => !usedMembersRef.current.has(m.nickname)
    );
    if (available.length === 0) return null;
    const member = pick(available);
    usedMembersRef.current.add(member.nickname);
    return member;
  };

  // ── Boot the simulation once per room ───────────────────────────────────────
  useEffect(() => {
    if (!roomCode || initialized.current) return;
    initialized.current = true;

    (async () => {
      // One-shot read (avoids onValue synchronous-callback TDZ crash)
      const simRef = ref(database, `karaoke-rooms/${roomCode}/naSimStarted`);
      const snap   = await get(simRef);

      if (snap.val()) {
        // Room already running — skip
        console.log("[NASimulator] Room already has simulation, syncing...");
        return;
      }

      // Mark simulation as started
      await set(simRef, Date.now());

      // ── Initial wave: 3–5 members join within first 2 minutes ──────────────
      const initialCount = rand(3, 5);
      const initialPool  = shuffle([...ALL_MEMBERS]).slice(0, initialCount);

      initialPool.forEach((member) => {
        usedMembersRef.current.add(member.nickname);
        const joinDelay = rand(0, msMin(1.5));
        scheduleMember(roomCode, member, joinDelay);
      });

      // ── Ongoing wave: every 20–60 min, 1–2 more people show up ─────────────
      let waveDelay = msMin(rand(20, 60));
      const scheduleWave = () => {
        const waveTimer = setTimeout(() => {
          const waveSize = rand(1, 2);
          for (let i = 0; i < waveSize; i++) {
            const member = getUnusedMember();
            if (member) {
              scheduleMember(roomCode, member, msMin(rand(0, 5)));
            }
          }
          waveDelay = msMin(rand(20, 60));
          scheduleWave();
        }, waveDelay);
        timersRef.current.push(waveTimer);
      };

      scheduleWave();
    })();
  }, [roomCode]);

  return null; // invisible engine
}