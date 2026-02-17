import React, { useState } from "react";

/**
 * ExternalVideoPrompt - Shows banner prompting users to join external video chat (Zoom/Meet/etc)
 */
export default function ExternalVideoPrompt({ videoLink, onDismiss }) {
  const [isDismissed, setIsDismissed] = useState(false);

  if (!videoLink || isDismissed) return null;

  const handleDismiss = () => {
    setIsDismissed(true);
    if (onDismiss) onDismiss();
  };

  const handleJoin = () => {
    window.open(videoLink, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="sticky top-4 z-50">
      <div className="max-w-2xl mx-auto px-4">
        <div className="rounded-2xl border-2 border-blue-400/50 bg-gradient-to-r from-blue-500/95 to-indigo-500/95 backdrop-blur-xl shadow-2xl p-5 animate-fade-in">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 text-4xl">🎥</div>

            <div className="flex-1">
              <h3 className="text-xl font-bold text-white mb-1">
                Video Chat is External
              </h3>
              <p className="text-white/90 text-sm mb-3">
                Join the video call to see and talk with everyone. Synced playback happens here!
              </p>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={handleJoin}
                  className="px-5 py-2.5 bg-white text-blue-600 rounded-xl font-bold text-sm hover:bg-white/90 active:scale-95 transition shadow-lg"
                >
                  Join Video Call →
                </button>

                <button
                  onClick={() => {
                    navigator.clipboard.writeText(videoLink);
                    alert("Link copied to clipboard!");
                  }}
                  className="px-4 py-2.5 bg-white/20 hover:bg-white/30 text-white rounded-xl font-semibold text-sm transition"
                >
                  Copy Link
                </button>
              </div>
            </div>

            <button
              onClick={handleDismiss}
              className="flex-shrink-0 text-white/60 hover:text-white text-xl leading-none transition"
              title="Dismiss"
            >
              ✕
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}