import React, { useState } from "react";
import { Video, Copy, ExternalLink, X } from "lucide-react";

/**
 * ExternalVideoPrompt - 3PM UI system version (glass + outline buttons, lucide only)
 */
export default function ExternalVideoPrompt({ videoLink, onDismiss }) {
  const [isDismissed, setIsDismissed] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!videoLink || isDismissed) return null;

  const handleDismiss = () => {
    setIsDismissed(true);
    onDismiss?.();
  };

  const handleJoin = () => {
    window.open(videoLink, "_blank", "noopener,noreferrer");
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(videoLink);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch (e) {
      console.error("Copy failed:", e);
      alert("Couldn’t copy link.");
    }
  };

  return (
    <div className="sticky top-4 z-50">
      <div className="max-w-2xl mx-auto px-4">
        <div className="rounded-3xl border border-white/10 bg-white/[0.03] backdrop-blur-md shadow-lg overflow-hidden">
          <div className="flex items-start gap-4 p-5">
            {/* Icon */}
            <div className="flex-shrink-0 mt-0.5">
              <div className="w-10 h-10 rounded-2xl border border-white/10 bg-white/[0.02] flex items-center justify-center">
                <Video className="w-5 h-5 text-white/70" />
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <h3 className="text-base sm:text-lg font-semibold text-white">
                Video chat is external
              </h3>
              <p className="text-white/55 text-sm mt-1">
                Join the call to see and talk with everyone. Playback stays synced here.
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  onClick={handleJoin}
                  className={[
                    "inline-flex items-center gap-2 px-4 py-2 rounded-2xl",
                    "bg-transparent border border-fuchsia-500/35 text-white/85",
                    "hover:border-fuchsia-400/50 hover:text-white hover:shadow-[0_0_14px_rgba(232,121,249,0.16)]",
                    "transition active:scale-[0.98]",
                  ].join(" ")}
                >
                  <ExternalLink className="w-4 h-4" />
                  <span className="text-sm font-semibold">Join video call</span>
                </button>

                <button
                  onClick={handleCopy}
                  className={[
                    "inline-flex items-center gap-2 px-4 py-2 rounded-2xl",
                    "bg-transparent border border-indigo-500/30 text-white/75",
                    "hover:border-indigo-400/45 hover:text-white hover:shadow-[0_0_14px_rgba(99,102,241,0.14)]",
                    "transition active:scale-[0.98]",
                  ].join(" ")}
                >
                  <Copy className="w-4 h-4" />
                  <span className="text-sm font-semibold">
                    {copied ? "Copied" : "Copy link"}
                  </span>
                </button>
              </div>
            </div>

            {/* Dismiss */}
            <button
              onClick={handleDismiss}
              className={[
                "flex-shrink-0",
                "w-9 h-9 rounded-2xl",
                "border border-white/10 bg-transparent",
                "text-white/55 hover:text-white hover:border-white/20",
                "hover:shadow-[0_0_12px_rgba(232,121,249,0.10)]",
                "transition active:scale-[0.98]",
              ].join(" ")}
              title="Dismiss"
            >
              <X className="w-4 h-4 mx-auto" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}