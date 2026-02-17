import React, { useState } from "react";
import { database, ref, push, set, remove } from "../utils/firebase";

/**
 * StreamingQueue - manages queue of videos for streaming mode
 * Host can add videos by pasting any direct video URL (.mp4, Dropbox, etc.)
 */
export default function StreamingQueue({
  roomCode,
  queue,
  currentSong,
  isHost,
  currentUser
}) {
  const [videoUrl, setVideoUrl] = useState("");
  const [videoTitle, setVideoTitle] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  const handleAddVideo = async (e) => {
    e.preventDefault();

    if (!videoUrl.trim() || !videoTitle.trim()) {
      alert("Please enter both a video URL and title");
      return;
    }

    setIsAdding(true);

    try {
      const finalUrl = normalizeVideoUrl(videoUrl.trim());

      const queueRef = ref(database, `karaoke-rooms/${roomCode}/queue`);
      const newVideoRef = push(queueRef);

      await set(newVideoRef, {
        id: newVideoRef.key,
        videoUrl: finalUrl,
        title: videoTitle.trim(),
        requestedBy: currentUser.name,
        addedAt: Date.now(),
        type: "streaming",
      });

      setVideoUrl("");
      setVideoTitle("");
    } catch (error) {
      console.error("Failed to add video:", error);
      alert("Failed to add video. Please try again.");
    } finally {
      setIsAdding(false);
    }
  };

  const handlePlayVideo = async (video) => {
    if (!isHost) return;

    try {
      const currentSongRef = ref(database, `karaoke-rooms/${roomCode}/currentSong`);
      await set(currentSongRef, {
        videoUrl: video.videoUrl,
        title: video.title,
        requestedBy: video.requestedBy,
        addedAt: video.addedAt,
        type: "streaming",
      });

      const videoRef = ref(database, `karaoke-rooms/${roomCode}/queue/${video.id}`);
      await remove(videoRef);

      const playbackRef = ref(database, `karaoke-rooms/${roomCode}/playbackState`);
      await set(playbackRef, {
        isPlaying: true,
        videoId: video.videoUrl,
        startTime: Date.now(),
      });
    } catch (error) {
      console.error("Failed to play video:", error);
      alert("Failed to play video. Please try again.");
    }
  };

  const handleRemoveFromQueue = async (videoId) => {
    if (!isHost) return;

    try {
      const videoRef = ref(database, `karaoke-rooms/${roomCode}/queue/${videoId}`);
      await remove(videoRef);
    } catch (error) {
      console.error("Failed to remove video:", error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Add Video Form (Host Only) */}
      {isHost && (
        <div className="rounded-2xl border border-white/10 bg-black/30 p-6">
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
            <span>📺</span> Add Video
          </h3>

          <form onSubmit={handleAddVideo} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-white/80 mb-2">
                Video URL
              </label>
              <input
                type="text"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="Paste any video URL (Dropbox, direct .mp4 link, Google Drive, etc.)"
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 focus:outline-none focus:border-fuchsia-400/70 focus:ring-2 focus:ring-fuchsia-400/20 text-sm"
                disabled={isAdding}
              />
              <div className="mt-2 text-xs text-white/50">
                Supports: Dropbox links, direct .mp4 URLs, Google Drive share links
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-white/80 mb-2">
                Video Title
              </label>
              <input
                type="text"
                value={videoTitle}
                onChange={(e) => setVideoTitle(e.target.value)}
                placeholder="Give it a name"
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 focus:outline-none focus:border-fuchsia-400/70 focus:ring-2 focus:ring-fuchsia-400/20"
                disabled={isAdding}
              />
            </div>

            <button
              type="submit"
              disabled={isAdding || !videoUrl.trim() || !videoTitle.trim()}
              className="w-full px-6 py-3 rounded-xl font-bold bg-[linear-gradient(90deg,#ff2aa1,#7c3aed)] hover:opacity-95 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              {isAdding ? "Adding..." : "Add to Queue"}
            </button>
          </form>

          <div className="mt-4 p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
            <div className="text-sm text-blue-200 space-y-2">
              <div className="font-bold">How to get video links:</div>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li><strong>Dropbox:</strong> Upload file, share link, paste it here (auto-converted)</li>
                <li><strong>catbox.moe:</strong> Drag & drop upload, paste the direct link</li>
                <li><strong>Any direct link:</strong> .mp4 or .webm URL</li>
                <li className="text-yellow-300"><strong>Important:</strong> File must be .mp4 or .webm (browsers can't play .mkv/.avi)</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Current Video */}
      {currentSong && (
        <div className="rounded-2xl border border-fuchsia-500/50 bg-fuchsia-500/10 p-6">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-xs tracking-widest uppercase text-fuchsia-300/70 mb-1">
                <span className="inline-block w-2 h-2 rounded-full bg-fuchsia-400 animate-pulse mr-2" />
                Now Playing
              </div>
              <div className="text-xl font-bold">{currentSong.title}</div>
              <div className="mt-1 text-white/60 text-sm">
                Added by: <span className="text-white">{currentSong.requestedBy}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Queue */}
      <div className="rounded-2xl border border-white/10 bg-black/30 p-6">
        <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
          <span>📋</span> Video Queue
          <span className="text-sm font-normal text-white/50">
            ({queue.length} video{queue.length !== 1 ? 's' : ''})
          </span>
        </h3>

        {queue.length === 0 ? (
          <div className="text-center py-8 text-white/50">
            <div className="text-4xl mb-3">🎬</div>
            <div>No videos in queue</div>
            {isHost && (
              <div className="text-sm mt-2">Add a video above to get started!</div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {queue.map((video, index) => (
              <div
                key={video.id}
                className="flex items-center gap-4 p-4 rounded-xl bg-black/40 border border-white/10 hover:border-white/20 transition"
              >
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center font-bold text-white/70">
                  {index + 1}
                </div>

                <div className="flex-grow min-w-0">
                  <div className="font-bold truncate">{video.title}</div>
                  <div className="text-sm text-white/60">
                    Added by: {video.requestedBy}
                  </div>
                </div>

                {isHost && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handlePlayVideo(video)}
                      className="flex-shrink-0 px-4 py-2 rounded-lg bg-fuchsia-500/20 hover:bg-fuchsia-500/30 text-fuchsia-300 text-sm font-semibold transition"
                    >
                      Play
                    </button>
                    <button
                      onClick={() => handleRemoveFromQueue(video.id)}
                      className="flex-shrink-0 px-3 py-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-300 text-sm font-semibold transition"
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Participant View */}
      {!isHost && (
        <div className="text-center text-sm text-white/50 p-4 rounded-xl bg-white/5">
          Only the host can add videos. Sit back and enjoy! 🍿
        </div>
      )}
    </div>
  );
}

/**
 * Convert common share URLs to direct download URLs the <video> tag can play.
 */
function normalizeVideoUrl(url) {
  // Dropbox: replace domain with dl.dropboxusercontent.com for direct streaming
  if (url.includes("dropbox.com")) {
    let direct = url.replace("www.dropbox.com", "dl.dropboxusercontent.com");
    // Remove any dl=0 or dl=1 params (not needed with dl subdomain)
    direct = direct.replace(/[?&]dl=[01]/, "");
    return direct;
  }

  // Google Drive share link → direct download
  const driveMatch = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (driveMatch) {
    return `https://drive.google.com/uc?export=download&confirm=t&id=${driveMatch[1]}`;
  }

  // Google Drive already-direct link
  if (url.includes("drive.google.com/uc")) {
    return url;
  }

  // Already a direct URL
  return url;
}
