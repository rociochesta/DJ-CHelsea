# Setup Instructions for 3PM Karaoke

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
