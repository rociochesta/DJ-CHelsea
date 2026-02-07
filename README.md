# 3PM Karaoke 🎤

A real-time karaoke app for your friend group. No more laggy Zoom screen sharing!

## Features

- 🎵 **YouTube Integration** - Search and play karaoke videos directly
- 🔄 **Real-time Sync** - Everyone sees the same video at the same time
- 🎤 **Take Turns** - Queue system for organized singing
- 📱 **No Downloads** - Just share a link, works in any browser
- 🚀 **Built for Groups** - Host controls, participant view, live queue

## How It Works

1. **Host creates a room** → Gets a 6-character room code
2. **Friends join with the code** → Opens in their browser
3. **Search for songs** → YouTube karaoke library
4. **Add to queue** → Everyone can request songs
5. **Sing!** → Video plays synced for everyone

## Tech Stack

- **Frontend**: React + Vite + Tailwind CSS
- **Real-time**: Firebase Realtime Database
- **Video**: YouTube IFrame API
- **Voice**: WebRTC (coming soon)

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project
3. Enable **Realtime Database**
4. Get your config from Project Settings
5. Update `src/utils/firebase.js` with your config

### 3. YouTube API Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project
3. Enable **YouTube Data API v3**
4. Create credentials (API Key)
5. Update `src/utils/youtube.js` with your API key

### 4. Run Development Server

```bash
npm run dev
```

Open http://localhost:3000

## Deployment

### Deploy to Vercel (Recommended)

```bash
npm install -g vercel
vercel
```

### Deploy to Netlify

```bash
npm run build
# Upload 'dist' folder to Netlify
```

## Firebase Database Structure

```
karaoke-rooms/
  {roomCode}/
    hostId: "user-abc123"
    hostName: "Alice"
    createdAt: 1234567890
    currentSong: {
      videoId: "xyz123"
      title: "Song Title"
      singerName: "Bob"
    }
    queue: {
      {songId}: {
        videoId: "abc456"
        title: "Another Song"
        singerName: "Charlie"
        addedAt: 1234567890
      }
    }
    participants: {
      {userId}: {
        name: "Alice"
        joinedAt: 1234567890
      }
    }
    playbackState: {
      isPlaying: true
      videoId: "xyz123"
      startTime: 1234567890
    }
```

## Roadmap

- [x] Room creation and joining
- [x] YouTube search and playback
- [x] Queue management
- [x] Synced video playback
- [ ] WebRTC voice streaming (for singing)
- [ ] Recording performances
- [ ] Lyrics overlay
- [ ] Scoring system
- [ ] Mobile app (React Native)

## Known Issues

- Voice chat not implemented yet (Phase 2)
- Some karaoke videos may not be embeddable
- Mobile browser support varies

## Contributing

This is a personal project for the 3PM group, but feel free to fork and customize!

## License

MIT - Do whatever you want with it!

---

Built with ❤️ for karaoke nights
