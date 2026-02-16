import React, { useState } from "react";
import { database, ref, push, set, remove } from "../utils/firebase";

/**
 * StreamingQueue - manages queue of Google Drive videos
 * Host can add videos by pasting Google Drive file IDs
 */
export default function StreamingQueue({ 
  roomCode, 
  queue, 
  currentSong,
  isHost, 
  currentUser 
}) {
  const [fileId, setFileId] = useState("");
  const [videoTitle, setVideoTitle] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  const handleAddVideo = async (e) => {
    e.preventDefault();
    
    if (!fileId.trim() || !videoTitle.trim()) {
      alert("Please enter both file ID and video title");
      return;
    }

    setIsAdding(true);

    try {
      const queueRef = ref(database, `karaoke-rooms/${roomCode}/queue`);
      const newVideoRef = push(queueRef);

      await set(newVideoRef, {
        fileId: fileId.trim(),
        title: videoTitle.trim(),
        requestedBy: currentUser.name,
        addedAt: Date.now(),
        type: "google-drive", // differentiate from YouTube videos
      });

      setFileId("");
      setVideoTitle("");
      alert("✅ Video added to queue!");
    } catch (error) {
      console.error("Failed to add video:", error);
      alert("❌ Failed to add video. Please try again.");
    } finally {
      setIsAdding(false);
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

  const extractFileIdFromUrl = (input) => {
    // If user pastes full Google Drive URL, extract file ID
    const match = input.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (match) {
      return match[1];
    }
    // If it's just the ID, return as is
    return input.trim();
  };

  const handleFileIdChange = (e) => {
    const input = e.target.value;
    const extracted = extractFileIdFromUrl(input);
    setFileId(extracted);
  };

  return (
    <div className="space-y-6">
      {/* Add Video Form (Host Only) */}
      {isHost && (
        <div className="rounded-2xl border border-white/10 bg-black/30 p-6">
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
            <span>📺</span> Add Video from Google Drive
          </h3>
          
          <form onSubmit={handleAddVideo} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-white/80 mb-2">
                Google Drive File ID or Share Link
              </label>
              <input
                type="text"
                value={fileId}
                onChange={handleFileIdChange}
                placeholder="Paste share link or file ID"
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 focus:outline-none focus:border-fuchsia-400/70 focus:ring-2 focus:ring-fuchsia-400/20 font-mono text-sm"
                disabled={isAdding}
              />
              <div className="mt-2 text-xs text-white/50">
                Example: https://drive.google.com/file/d/<strong>FILE_ID_HERE</strong>/view
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
              disabled={isAdding || !fileId.trim() || !videoTitle.trim()}
              className="w-full px-6 py-3 rounded-xl font-bold bg-[linear-gradient(90deg,#ff2aa1,#7c3aed)] hover:opacity-95 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              {isAdding ? "Adding..." : "Add to Queue"}
            </button>
          </form>

          <div className="mt-4 p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
            <div className="text-sm text-blue-200 space-y-2">
              <div className="font-bold">📝 How to share from Google Drive:</div>
              <ol className="list-decimal list-inside space-y-1 text-xs">
                <li>Upload your video to Google Drive</li>
                <li>Right-click → Share → Change to "Anyone with the link"</li>
                <li>Copy the link and paste it above</li>
                <li>Give it a title and add to queue</li>
              </ol>
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
            <div className="text-4xl">▶️</div>
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
                  <button
                    onClick={() => handleRemoveFromQueue(video.id)}
                    className="flex-shrink-0 px-3 py-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-300 text-sm font-semibold transition"
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Participant View - Simple message */}
      {!isHost && (
        <div className="text-center text-sm text-white/50 p-4 rounded-xl bg-white/5">
          Only the host can add videos. Sit back and enjoy! 🍿
        </div>
      )}
    </div>
  );
}