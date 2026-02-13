import React, { useState, useEffect, useRef } from "react";
import { database, ref, push, set, onValue } from "../utils/firebase";

const REACTION_EMOJIS = ["🔥", "❤️", "😂", "👏", "😭", "🎤", "⭐", "💯"];

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
    }, 50) // Update at most every 50ms for smoother animations
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

  // Auto-cleanup old reactions (older than 5 seconds) - optimized
  useEffect(() => {
    if (!roomCode) return;

    const interval = setInterval(() => {
      const now = Date.now();
      
      // Batch cleanup operations
      const toDelete = reactions.filter((reaction) => now - reaction.timestamp > 5000);
      
      // Fire all deletes without awaiting (non-blocking)
      toDelete.forEach((reaction) => {
        const reactionRef = ref(database, `karaoke-rooms/${roomCode}/reactions/${reaction.id}`);
        set(reactionRef, null).catch(() => {}); // Fire and forget
      });
    }, 2000); // Check every 2 seconds instead of 1 to reduce overhead

    return () => clearInterval(interval);
  }, [roomCode, reactions]);

  const handleSendReaction = (emoji) => {
    // Close picker immediately
    setShowPicker(false);

    // Fire and forget - don't await, don't block UI
    const reactionsRef = ref(database, `karaoke-rooms/${roomCode}/reactions`);
    const newReactionRef = push(reactionsRef);

    set(newReactionRef, {
      emoji,
      userId: currentUser.id,
      userName: currentUser.name,
      timestamp: Date.now(),
      // Random starting position for animation
      startX: Math.random() * 80 + 10, // 10-90% from left
    }).catch((err) => {
      console.error("Failed to send reaction:", err);
    });
  };

  // Filter recent reactions (last 5 seconds)
  const recentReactions = reactions.filter(
    (r) => Date.now() - r.timestamp < 5000
  );

  return (
    <>
      {/* Floating reactions overlay */}
<div className="fixed inset-0 pointer-events-none z-50">
        {recentReactions.map((reaction) => {
          const age = Date.now() - reaction.timestamp;
          const progress = Math.min(age / 5000, 1); // 0 to 1 over 5 seconds

          return (
            <div
              key={reaction.id}
              className="absolute will-change-transform"
              style={{
                left: `${reaction.startX}%`,
                bottom: '10%',
                fontSize: '3rem',
                textShadow: '0 2px 8px rgba(0,0,0,0.3)',
                animation: 'float-up-smooth 5s ease-out forwards',
                animationDelay: '0s',
              }}
            >
              {reaction.emoji}
            </div>
          );
        })}
      </div>

      {/* Reaction picker button */}
<div className="fixed bottom-4 right-4 z-40">
        {!showPicker ? (
          <button
            onClick={() => setShowPicker(true)}
            className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 transition backdrop-blur-xl"
            title="Send a reaction"
          >
            <span className="text-xl">😊</span>
          </button>
        ) : (
          <div className="absolute bottom-full mb-2 right-0 rounded-2xl border border-white/20 bg-black/95 backdrop-blur-2xl shadow-2xl p-3 animate-scale-in">
            <div className="flex items-center justify-between mb-2 pb-2 border-b border-white/10">
              <span className="text-xs text-white/60 font-semibold">Quick Reactions</span>
              <button
                onClick={() => setShowPicker(false)}
                className="text-white/60 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {REACTION_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => handleSendReaction(emoji)}
                  className="text-3xl hover:scale-125 transition-transform active:scale-95 p-2 rounded-xl hover:bg-white/10"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes float-up-smooth {
          0% {
            transform: translateY(0) translateZ(0) scale(1);
            opacity: 1;
          }
          100% {
            transform: translateY(-80vh) translateZ(0) scale(0.7);
            opacity: 0;
          }
        }

        @keyframes scale-in {
          from {
            transform: scale(0.9) translateZ(0);
            opacity: 0;
          }
          to {
            transform: scale(1) translateZ(0);
            opacity: 1;
          }
        }

        .will-change-transform {
          will-change: transform, opacity;
          backface-visibility: hidden;
          -webkit-font-smoothing: antialiased;
        }

        .animate-scale-in {
          animation: scale-in 0.2s ease-out;
        }
      `}</style>
    </>
  );
}

export default React.memo(EmojiReactions, (prevProps, nextProps) => {
  // Only re-render if roomCode or currentUser.id changes
  return prevProps.roomCode === nextProps.roomCode && 
         prevProps.currentUser?.id === nextProps.currentUser?.id;
});