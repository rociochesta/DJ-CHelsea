import React, { useState, useEffect, useRef } from "react";
import { database, ref, push, set, onValue } from "../utils/firebase";

const REACTION_EMOJIS = ["🔥", "❤️", "😂", "👏", "😭", "🎤"];

// Throttle helper
const throttle = (func, limit) => {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

function EmojiReactions({ roomCode, currentUser }) {
  const [reactions, setReactions] = useState([]);
  const [showPicker, setShowPicker] = useState(false);

  // Throttled update function
  const updateReactions = useRef(
    throttle((reactionList) => {
      setReactions(reactionList);
    }, 50)
  ).current;

  // Listen to reactions
  useEffect(() => {
    if (!roomCode) return;

    const reactionsRef = ref(database, `karaoke-rooms/${roomCode}/reactions`);
    
    const unsubscribe = onValue(reactionsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const reactionList = Object.entries(data).map(([id, reaction]) => ({
          id,
          ...reaction,
        }));
        updateReactions(reactionList);
      } else {
        setReactions([]);
      }
    });

    return () => unsubscribe();
  }, [roomCode, updateReactions]);

  // Auto-cleanup old reactions
  useEffect(() => {
    if (!roomCode) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const toDelete = reactions.filter((reaction) => now - reaction.timestamp > 5000);
      
      toDelete.forEach((reaction) => {
        const reactionRef = ref(database, `karaoke-rooms/${roomCode}/reactions/${reaction.id}`);
        set(reactionRef, null).catch(() => {});
      });
    }, 2000);

    return () => clearInterval(interval);
  }, [roomCode, reactions]);

  const handleSendReaction = (emoji) => {
    setShowPicker(false);

    const reactionsRef = ref(database, `karaoke-rooms/${roomCode}/reactions`);
    const newReactionRef = push(reactionsRef);

    set(newReactionRef, {
      emoji,
      userId: currentUser.id,
      userName: currentUser.name,
      timestamp: Date.now(),
      startX: Math.random() * 80 + 10,
    }).catch((err) => {
      console.error("Failed to send reaction:", err);
    });
  };

  const recentReactions = reactions.filter(
    (r) => Date.now() - r.timestamp < 5000
  );

  return (
    <>
      {/* Floating reactions overlay - LOW z-index to not block controls */}
      <div className="pointer-events-none fixed inset-0 z-10 overflow-hidden">
        {recentReactions.map((reaction) => {
          return (
            <div
              key={reaction.id}
              className="absolute will-change-transform"
              style={{
                left: `${reaction.startX}%`,
                bottom: '5%',
                fontSize: '2.5rem',
                textShadow: '0 4px 12px rgba(0,0,0,0.5)',
                animation: `float-up-smooth 5s ease-out forwards`,
              }}
            >
              {reaction.emoji}
            </div>
          );
        })}
      </div>

      {/* Reaction picker button */}
      <div className="fixed bottom-4 right-4 z-40">
        <button
          onClick={() => setShowPicker(!showPicker)}
          className="px-5 py-4 rounded-2xl bg-gradient-to-r from-amber-600/90 to-orange-600/90 hover:from-amber-600 hover:to-orange-600 border border-white/20 transition backdrop-blur-xl shadow-2xl hover:scale-105 active:scale-95 flex items-center gap-2"
          title="Send a reaction"
        >
          <span className="text-2xl">😊</span>
          <span className="text-sm font-bold">React</span>
        </button>
      </div>

      {/* Full screen modal */}
      {showPicker && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] animate-fade-in"
            onClick={() => setShowPicker(false)}
          />
          
          {/* Modal */}
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 pointer-events-none">
            <div className="pointer-events-auto bg-gradient-to-br from-fuchsia-900/95 via-indigo-900/95 to-purple-900/95 backdrop-blur-2xl rounded-3xl border-2 border-white/20 shadow-2xl p-8 max-w-md w-full animate-scale-up">
              {/* Header */}
              <div className="text-center mb-6">
                <h3 className="text-2xl font-extrabold text-white mb-2">
                  Send a Reaction
                </h3>
                <p className="text-white/60 text-sm">
                  Let everyone know how you're feeling
                </p>
              </div>

              {/* Emoji grid with generous spacing */}
              <div className="grid grid-cols-3 gap-6 mb-6">
                {REACTION_EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => handleSendReaction(emoji)}
                    className="aspect-square flex items-center justify-center text-5xl rounded-2xl bg-white/10 hover:bg-white/20 border-2 border-white/20 hover:border-white/40 transition-all hover:scale-110 active:scale-95 shadow-lg"
                  >
                    {emoji}
                  </button>
                ))}
              </div>

              {/* Close button */}
              <button
                onClick={() => setShowPicker(false)}
                className="w-full px-6 py-3 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 transition font-semibold text-white"
              >
                Close
              </button>
            </div>
          </div>
        </>
      )}

      <style>{`
        @keyframes float-up-smooth {
          0% {
            transform: translateY(0) translateZ(0) scale(1);
            opacity: 1;
          }
          100% {
            transform: translateY(-85vh) translateZ(0) scale(0.8);
            opacity: 0;
          }
        }

        @keyframes fade-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes scale-up {
          from {
            transform: scale(0.9);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }

        .animate-fade-in {
          animation: fade-in 0.2s ease-out;
        }

        .animate-scale-up {
          animation: scale-up 0.2s ease-out;
        }

        .will-change-transform {
          will-change: transform, opacity;
          backface-visibility: hidden;
          -webkit-font-smoothing: antialiased;
        }
      `}</style>
    </>
  );
}

export default EmojiReactions;