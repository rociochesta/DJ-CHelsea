import { useState, useEffect } from "react";
import { X, BookOpen, Send, Loader2 } from "lucide-react";

export default function JFTModal({ isOpen, onClose, onShare }) {
  const [jft, setJft] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [shared, setShared] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    setError("");
    setShared(false);

    fetch("/.netlify/functions/fetch-jft")
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setJft(data);
      })
      .catch((e) => setError(String(e?.message || "Failed to load today's JFT")))
      .finally(() => setLoading(false));
  }, [isOpen]);

  if (!isOpen) return null;

  const handleShare = () => {
    if (!jft) return;
    const lines = [
      jft.date ? `📘 Just For Today — ${jft.date}` : "📘 Just For Today",
      jft.title ? `"${jft.title}"` : "",
      jft.justForToday ? `\nJust for today: ${jft.justForToday}` : "",
    ].filter(Boolean);

    onShare?.(lines.join("\n"), "spanjft");
    setShared(true);
    setTimeout(() => {
      setShared(false);
      onClose();
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-lg max-h-[85vh] flex flex-col rounded-3xl border border-blue-500/25 bg-[#07071a] shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-blue-500/[0.05] flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl border border-blue-500/30 bg-blue-500/[0.12] flex items-center justify-center">
              <BookOpen className="w-4 h-4 text-blue-300" />
            </div>
            <div>
              <div className="font-bold text-white/90">Just For Today</div>
              {jft?.date && (
                <div className="text-xs text-blue-300/70 mt-0.5">{jft.date}</div>
              )}
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-2xl border border-white/10 bg-white/[0.03] text-white/60 hover:text-white hover:border-white/20 transition flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div
          className="flex-1 overflow-y-auto px-6 py-5 space-y-4"
          style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(255,255,255,0.15) transparent" }}
        >
          {loading && (
            <div className="flex flex-col items-center justify-center py-16 text-white/50">
              <Loader2 className="w-8 h-8 animate-spin mb-3 text-blue-400/60" />
              <div className="text-sm">Loading today's reading…</div>
            </div>
          )}

          {error && (
            <div className="rounded-2xl border border-red-500/30 bg-red-500/[0.07] px-4 py-3 text-red-300/90 text-sm text-center">
              {error}
            </div>
          )}

          {jft && !loading && (
            <>
              {jft.title && (
                <h2 className="text-xl font-bold text-white/90 leading-snug">{jft.title}</h2>
              )}

              {jft.quote && (
                <blockquote className="border-l-2 border-blue-400/40 pl-4 py-1">
                  <p className="text-white/70 italic text-sm leading-relaxed whitespace-pre-line">
                    {jft.quote}
                  </p>
                </blockquote>
              )}

              {jft.paragraphs?.map((p, i) => (
                <p key={i} className="text-white/65 text-sm leading-relaxed">
                  {p}
                </p>
              ))}

              {jft.justForToday && (
                <div className="rounded-2xl border border-blue-500/25 bg-blue-500/[0.07] px-5 py-4 mt-2">
                  <div className="text-[10px] uppercase tracking-widest text-blue-300/55 mb-2">
                    Just for Today
                  </div>
                  <p className="text-blue-100/90 text-sm leading-relaxed">{jft.justForToday}</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {jft && !loading && onShare && (
          <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-white/10 bg-black/20 flex-shrink-0">
            <div className="text-[10px] text-white/25">
              Source: jftna.org · NA World Services
            </div>
            <button
              onClick={handleShare}
              disabled={shared}
              className={[
                "inline-flex items-center gap-2 px-4 py-2 rounded-2xl border text-sm font-semibold transition active:scale-[0.98]",
                shared
                  ? "border-emerald-500/40 bg-emerald-500/[0.12] text-emerald-300"
                  : "border-blue-500/35 bg-blue-500/[0.08] text-blue-300 hover:border-blue-400/50 hover:bg-blue-500/[0.14]",
              ].join(" ")}
            >
              <Send className="w-4 h-4" />
              {shared ? "Shared!" : "Share to Chat"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
