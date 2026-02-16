import React, { useEffect, useRef, useState } from "react";

/**
 * GoogleDrivePlayer - plays videos from Google Drive with synced playback
 * 
 * To use:
 * 1. Upload video to Google Drive
 * 2. Right-click video → Share → Anyone with the link can view
 * 3. Copy the file ID from the share link (e.g., https://drive.google.com/file/d/FILE_ID_HERE/view)
 * 4. Pass the FILE_ID to this component
 */
const GoogleDrivePlayer = React.memo(({ 
  fileId, 
  title, 
  playbackState, 
  onSkip, 
  isHost,
  requestedBy 
}) => {
  const iframeRef = useRef(null);
  const [embedError, setEmbedError] = useState(false);

  // Construct Google Drive embed URL
  const embedUrl = fileId ? `https://drive.google.com/file/d/${fileId}/preview` : null;

  const handleSkip = () => {
    if (onSkip) {
      onSkip();
    }
  };

  if (!fileId || !embedUrl) {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-2xl p-5 md:p-7">
        <div className="rounded-2xl border border-white/10 bg-black/30 overflow-hidden">
          <div className="aspect-video flex items-center justify-center">
            <div className="text-center p-8">
              <div className="text-5xl mb-4">📺</div>
              <div className="text-xl font-extrabold mb-2">No video playing</div>
              <div className="text-white/60">
                Host will add a video from their Google Drive
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-2xl p-5 md:p-7">
      {/* Title */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-4">
        <div>
          <div className="text-xs tracking-widest uppercase text-white/50">Now Playing</div>
          <h2 className="text-xl md:text-2xl font-extrabold leading-tight">{title || "Video"}</h2>
          {requestedBy && (
            <div className="mt-1 text-white/60">
              Added by:{" "}
              <span className="font-bold text-white bg-black/30 px-2 py-1 rounded-lg border border-white/10">
                {requestedBy}
              </span>
            </div>
          )}
        </div>

        {isHost && (
          <button
            onClick={handleSkip}
            className="px-4 py-2 rounded-xl font-bold bg-[linear-gradient(90deg,#ef4444,#f97316)] hover:opacity-95 active:scale-[0.99] transition border border-white/10 shadow-[0_18px_60px_rgba(239,68,68,0.16)]"
          >
            Skip ⏭️
          </button>
        )}
      </div>

      {/* Player Frame */}
      {embedError ? (
        <div className="rounded-2xl border border-white/10 bg-black/30 overflow-hidden">
          <div className="aspect-video flex items-center justify-center">
            <div className="text-center p-8">
              <div className="text-5xl mb-4">🚫</div>
              <div className="text-xl font-extrabold mb-2">Can't embed this video</div>
              <div className="text-white/60 mb-4">
                Make sure the video is shared as "Anyone with the link can view"
              </div>
              <button
                onClick={() => window.open(`https://drive.google.com/file/d/${fileId}/view`, "_blank")}
                className="px-5 py-3 rounded-xl font-bold bg-[linear-gradient(90deg,#ff2aa1,#7c3aed)] hover:opacity-95 transition"
              >
                Open in Google Drive ↗️
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-white/10 bg-black/60 overflow-hidden shadow-[0_0_0_1px_rgba(255,255,255,0.06),0_30px_90px_rgba(124,58,237,0.10)]">
          <div className="aspect-video">
            <iframe
              ref={iframeRef}
              src={embedUrl}
              className="w-full h-full"
              allow="autoplay"
              allowFullScreen
              onError={() => setEmbedError(true)}
            />
          </div>
        </div>
      )}

      {/* Instructions for host */}
      {isHost && (
        <div className="mt-4 p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
          <div className="text-sm text-blue-200">
            <strong>💡 Tip:</strong> To add videos, upload them to Google Drive, 
            share as "Anyone with the link", and paste the file ID below.
          </div>
        </div>
      )}
    </div>
  );
}, (prevProps, nextProps) => {
  // Only re-render if these values actually change
  return (
    prevProps.fileId === nextProps.fileId &&
    prevProps.title === nextProps.title &&
    prevProps.playbackState?.isPlaying === nextProps.playbackState?.isPlaying &&
    prevProps.isHost === nextProps.isHost
  );
});

export default GoogleDrivePlayer;