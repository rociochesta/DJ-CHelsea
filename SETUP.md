# Setup Instructions for 3PM Karaoke

## Music Quiz catalog (Supabase)

Music Quiz uses `public/music-quiz-catalog.json` by default, with 1,478 audio files organized under category folders (`00s`, `10s`, `40s`, `50s`, `60s`, `70s`, `80s`, `90s`) in the public `songs` bucket in Supabase project `lwjxwrbzvvteywewpmlu`. Audio streams directly from Supabase. Update this catalog when adding or renaming files in the bucket. Update the folder filename lists in `scripts/music-quiz-files.json`, then run `node scripts/refresh-music-quiz-categories.mjs` to regenerate the catalog URLs, artists, titles, and categories. MP3 and M4A clips are supported. Before inviting the room, select one or more categories. Both clips and answer options come only from the checked categories, which must contain at least four distinct artists and titles combined.

Optionally set `VITE_MUSIC_QUIZ_CATALOG_URL` in `.env.local` and the hosting environment to another public JSON catalog URL. Restart the development server after changing it.

The catalog must contain an array of songs with public HTTPS MP3 URLs:

```json
[
  { "artist": "Artist name", "title": "Song name", "category": "80s", "audio_url": "https://PROJECT.supabase.co/storage/v1/object/public/songs/80s/clip.mp3" }
]
```

Include at least four distinct artists and four distinct titles. Each round randomly asks for the artist or the song title. Choose 20 questions, 50 questions, or continuous play before inviting the room. Songs repeat only after the selected pool is exhausted. Continuous play cycles through that pool until the host ends the game. Each round lasts up to 30 seconds, with the clock synchronized through Firebase. A correct answer awards points and immediately advances all players in the same shared transaction. If nobody answers correctly, the quiz automatically advances when time runs out, without awarding points. Any joined player can trigger the guarded timeout transaction so play continues if the inviter disconnects. The first correct answer earns points based on the displayed seconds remaining: 5 points at 30–20 seconds, 3 points at 19–10 seconds, and 1 point at 9–1 seconds. At zero, answers are rejected. Players join the invitation before the inviter presses Start quiz. Browsers that block automatic playback show a Play clip button. Use public catalog/clip URLs; do not put service-role keys in frontend environment variables.

## Quick Start Checklist

Before you can run the app, you need to set up two services:

### ✅ Step 1: Firebase Setup (5 minutes)

1. Go to https://console.firebase.google.com/
2. Click "Add project" or "Create a project"
3. Name it "3pm-karaoke" (or whatever you want)
4. Disable Google Analytics (not needed for this)
5. Click "Create project"
6. Once created, click "Realtime Database" in the left menu
7. Click "Create Database"
8. Choose your region (closest to you)
9. Start in **test mode** (we can secure it later)
10. Click "Enable"
11. Go to Project Settings (gear icon) → General tab
12. Scroll down to "Your apps" section
13. Click the web icon (</>)
14. Register app name: "3pm-karaoke-web"
15. Copy the firebaseConfig object
16. Paste it into `src/utils/firebase.js` replacing the placeholder config

Your firebase.js should look like:
```javascript
const firebaseConfig = {
  apiKey: "AIzaSyA...",
  authDomain: "your-app.firebaseapp.com",
  databaseURL: "https://your-app.firebaseio.com",
  projectId: "your-app",
  storageBucket: "your-app.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123"
};
```

### ✅ Step 2: YouTube API Setup (5 minutes)

1. Go to https://console.cloud.google.com/
2. Click "Select a project" → "New Project"
3. Name it "3pm-karaoke"
4. Click "Create"
5. Once created, make sure it's selected in the top dropdown
6. Go to "APIs & Services" → "Library"
7. Search for "YouTube Data API v3"
8. Click on it → Click "Enable"
9. Go to "APIs & Services" → "Credentials"
10. Click "Create Credentials" → "API Key"
11. Copy the API key
12. Paste it into `src/utils/youtube.js` replacing `YOUR_YOUTUBE_API_KEY`

Your youtube.js should have:
```javascript
const YOUTUBE_API_KEY = 'AIzaSyB...';
```

### ✅ Step 3: Install and Run

```bash
# Install dependencies
npm install

# Run dev server
npm run dev
```

Open http://localhost:3000

### 🎉 You're Done!

Create a room, test it out. Share the room code with friends!

## Troubleshooting

**"Firebase not configured"** → Check that you replaced the config in firebase.js

**"YouTube search not working"** → Check that you:
1. Enabled the YouTube Data API v3
2. Added your API key to youtube.js
3. The API key has no restrictions (or allows your localhost)

**"Room won't load"** → Make sure Firebase Realtime Database is in test mode:
```
{
  "rules": {
    ".read": true,
    ".write": true
  }
}
```

## Security Note

The Firebase rules above are for testing only! Before deploying publicly, secure your database properly. See Firebase docs for production rules.

## Next Steps

Once everything works locally:
1. Deploy to Vercel/Netlify (see README)
2. Share the link with your group
3. Start singing! 🎤
